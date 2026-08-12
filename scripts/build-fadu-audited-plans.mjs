#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourcePath = path.resolve(process.argv[2] ?? "data/fadu/audited-plans.json");
const outputDirectory = path.resolve(process.argv[3] ?? "app/data");
const source = JSON.parse(await readFile(sourcePath, "utf8"));

function hasRawNode(expression) {
  if (!expression) return false;
  if (expression.kind === "requirement" && expression.parserStatus === "raw") return true;
  return (expression.children ?? []).some(hasRawNode);
}

function validatePlan(plan) {
  const courseIds = new Set();
  const nodeIds = new Set(plan.creditStructure.nodes.map((node) => node.id));

  for (const course of plan.courses) {
    if (courseIds.has(course.id)) throw new Error(`${plan.id}: curso o bloque repetido ${course.id}.`);
    courseIds.add(course.id);
    if (!Number.isFinite(course.credits) || course.credits < 0) throw new Error(`${plan.id}/${course.id}: créditos inválidos.`);
    const allocations = Object.entries(course.allocations).map(([nodeId, credits]) => ({ nodeId, credits }));
    const allocated = allocations.reduce((total, allocation) => total + allocation.credits, 0);
    if (allocated !== course.credits) {
      throw new Error(`${plan.id}/${course.id}: asigna ${allocated} créditos, pero declara ${course.credits}.`);
    }
    for (const allocation of allocations) {
      if (!nodeIds.has(allocation.nodeId)) throw new Error(`${plan.id}/${course.id}: nodo inexistente ${allocation.nodeId}.`);
    }
  }

  for (const pathway of Object.values(plan.pathways)) {
    const referenced = pathway.periods.flatMap((period) => period.courseIds);
    if (new Set(referenced).size !== referenced.length) throw new Error(`${plan.id}/${pathway.label}: repite cursos o bloques.`);
    for (const id of referenced) {
      if (!courseIds.has(id)) throw new Error(`${plan.id}/${pathway.label}: referencia ${id}, que no existe.`);
    }
    const credits = referenced.reduce((total, id) => total + plan.courses.find((course) => course.id === id).credits, 0);
    if (credits !== plan.plan.minCredits) {
      throw new Error(`${plan.id}/${pathway.label}: distribuye ${credits} créditos y el plan exige ${plan.plan.minCredits}.`);
    }
  }

  const credential = plan.creditStructure.credentials[0];
  if (!credential || credential.minTotalCredits !== plan.plan.minCredits) {
    throw new Error(`${plan.id}: el título no conserva el total del plan.`);
  }
  for (const requirement of credential.nodeRequirements) {
    if (!nodeIds.has(requirement.nodeId)) throw new Error(`${plan.id}: requisito de título desconocido ${requirement.nodeId}.`);
  }
}

function normalizedRule(rule) {
  const { target, expression, heading, sourceUrl } = rule;
  return { target, expression, heading, sourceUrl };
}

await mkdir(outputDirectory, { recursive: true });

for (const plan of source.plans) {
  validatePlan(plan);
  const snapshotPath = path.resolve(plan.snapshotPath);
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  const wantedCodes = new Set(plan.courses.map((course) => course.bedeliasCode).filter(Boolean));
  const publishedRules = snapshot.prerequisites
    .filter((rule) => wantedCodes.has(rule.target.code) && rule.expression && !hasRawNode(rule.expression))
    .map(normalizedRule);
  const publishedCodes = new Set(publishedRules.map((rule) => rule.target.code));
  const partialCodes = new Set(snapshot.prerequisites
    .filter((rule) => wantedCodes.has(rule.target.code) && rule.expression && hasRawNode(rule.expression))
    .map((rule) => rule.target.code));
  const noPublishedCodes = new Set(snapshot.prerequisites
    .filter((rule) => wantedCodes.has(rule.target.code) && rule.noPublishedRule)
    .map((rule) => rule.target.code));

  const courses = plan.courses.map((course) => ({
    ...Object.fromEntries(Object.entries(course).filter(([key]) => key !== "allocations")),
    creditAllocations: Object.entries(course.allocations).map(([nodeId, credits]) => ({
      nodeId,
      credits,
      status: "official",
      sourceUrl: course.sourceUrl ?? plan.source.creditStructure,
    })),
    eligibleRequirementIds: Object.keys(course.allocations),
    dataStatus: "fadu-official",
    ruleCoverage: !course.bedeliasCode
      ? "not-applicable"
      : publishedCodes.has(course.bedeliasCode)
        ? "published"
        : partialCodes.has(course.bedeliasCode)
          ? "partial"
          : noPublishedCodes.has(course.bedeliasCode)
            ? "not-published"
            : "not-scraped",
  }));

  const output = {
    schemaVersion: 1,
    source: {
      ...plan.source,
      reviewedAt: source.reviewedAt,
      bedeliasSystem: snapshot.source.system,
      bedeliasExtractedAt: snapshot.source.extractedAt,
      bedeliasContentHash: snapshot.contentHash,
      bedeliasPlanUrl: snapshot.plan.sourceUrl,
    },
    plan: {
      ...plan.plan,
      auditStatus: "audited",
      notice: plan.notice,
      bedeliasCompositionCourses: snapshot.plan.courses.length,
      publishedRules: publishedRules.length,
      partialRules: partialCodes.size,
      noPublishedRule: noPublishedCodes.size,
    },
    creditStructure: {
      ...plan.creditStructure,
      nodes: plan.creditStructure.nodes.map((node) => ({
        ...node,
        sourceStatus: node.sourceStatus ?? "official",
        sourceUrl: node.sourceUrl ?? plan.source.creditStructure,
      })),
      credentials: plan.creditStructure.credentials.map((credential) => ({
        ...credential,
        sourceUrl: credential.sourceUrl ?? plan.source.planDocument,
      })),
    },
    courses,
    pathways: plan.pathways,
    rules: publishedRules,
    audit: plan.audit,
  };

  const outputPath = path.join(outputDirectory, plan.outputFile);
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`${plan.label}: ${courses.length} unidades/bloques, ${Object.keys(plan.pathways).length} trayectorias y ${publishedRules.length} reglas -> ${outputPath}`);
}
