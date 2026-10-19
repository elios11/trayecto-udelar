#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDataPath = "data/fcien/ciencias-biologicas-2017-trajectory-review.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const writeJsonIfChanged = async (relativePath, value) => {
  const target = path.join(root, relativePath);
  const previous = await readFile(target, "utf8");
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (previous.replace(/\r\n/g, "\n") !== next) {
    await writeFile(target, previous.includes("\r\n") ? next.replace(/\n/g, "\r\n") : next, "utf8");
  }
};

export function validateBiologicalSciencesSource(source, snapshot) {
  assert.equal(source.planId, "bedelias-fcien-licenciatura-en-ciencias-biologicas-2017");
  assert.equal(source.auditIdentity, "licenciatura en ciencias biologicas:2017");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions), "Huella de evidencia normalizada alterada");
  assert.equal(source.publication.coverage, "partial-initial-two-semesters");
  assert.equal(source.publication.completeDegreeSequence, false);
  assert.equal(source.trajectoryConclusion.partial, true);
  assert.deepEqual(source.trajectories[0].periods.map(({ label }) => label), ["Primer semestre", "Segundo semestre"]);
  assert.equal(source.trajectories[0].periods.flatMap(({ courseIds }) => courseIds).length, 8);
  assert.equal(source.sourcePortions["cidu-2026"].initialRows.length, 8);
  assert.deepEqual(source.sourcePortions["cidu-2026"].laterCoursePeriodRows, []);
  assert.equal(snapshot.contentHash, source.bedeliasComparison.snapshotContentHash);
  assert.equal(snapshot.plan.courses.length, 842);
  assert.equal(source.publication.minimumCredits, 360);
  assert.equal(source.publication.durationMonths, 48);
  assert.equal(source.catalogMatches.length, 8);
  for (const row of source.catalogMatches) {
    const matches = snapshot.plan.courses.filter(({ code }) => code === row.sourceCourseId);
    assert.equal(matches.length, 1, `Identidad técnica ambigua: ${row.sourceCourseId}`);
    assert.equal(matches[0].name, row.bedeliasName);
    assert.equal(matches[0].credits, row.credits);
    assert.ok(row.identityBasis);
  }
  assert.equal(source.sourceOnlyRows.length, 1);
  assert.equal(source.sourceOnlyRows[0].creditsPublished, false);
  assert.equal(source.sourceOnlyRows[0].credits, 0);
  for (const item of source.sources) {
    assert.equal(item.consultedAt, source.reviewedAt);
    assert.ok(item.authority && item.publishedValidity && item.role);
    assert.ok(source.sourcePortions[item.id]);
    assert.match(new URL(item.url).hostname, /(?:^|\.)(?:udelar\.edu\.uy|fcien\.edu\.uy|impo\.com\.uy)$/);
  }
}

export function validateBiologicalSciencesProjection(source, projection, inventoryEntry) {
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 8);
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.plan.durationMonths, 48);
  assert.deepEqual(Object.keys(projection.pathways), ["formacion-personalizada"]);
  assert.deepEqual(projection.campuses.map(({ label }) => label), ["Montevideo"]);
  const existing = projection.courses.filter(({ sourceCourseId }) => !source.sourceOnlyRows.some(({ identityKey }) => identityKey === sourceCourseId));
  assert.equal(existing.length, source.projectionBaseline.existingCourseRecords);
  assert.equal(digest(existing.map((course) => [course.id, course.bedeliasCode, course.credits])), source.projectionBaseline.existingIdentityLoadHash, "No alterar IDs ni cargas de progreso existentes");
  const technical = projection.courses.filter(({ bedeliasCode, authorityStatus }) => bedeliasCode && authorityStatus === "verified");
  assert.deepEqual(technical.map(({ bedeliasCode }) => bedeliasCode).sort(), source.catalogMatches.map(({ sourceCourseId }) => sourceCourseId).sort());
  const presentation = buildRegisteredPlanPresentation("formacion-personalizada", projection);
  assert.equal(presentation.generated, false);
  assert.deepEqual(presentation.periods.map(({ label }) => label), ["Primer semestre", "Segundo semestre"]);
  assert.deepEqual(presentation.periods.map(({ courseIds }) => courseIds.length), [4, 4]);
  assert.match(presentation.description, /parcial/);
  assert.match(presentation.description, /No es una malla completa/);
  assert.ok(presentation.courses.every(({ authorityStatus }) => authorityStatus === "verified"));
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length, 969);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "BG861").authorityStatus, "candidate");
  assert.ok(!projection.publishedRules.some((rule) => JSON.stringify(rule).includes("fcien-bg861")));
  const nodes = new Map(projection.creditStructure.nodes.map((node) => [node.id, node]));
  assert.deepEqual(projection.creditStructure.credentials[0].nodeRequirements.filter(({ nodeId }) => nodes.get(nodeId).parentId === "plan-total"), [
    { nodeId: "common", minCredits: 210 },
    { nodeId: "orientation", minCredits: 140 },
    { nodeId: "integral-practice", minCredits: 10 },
  ]);
}

export async function buildBiologicalSciencesReview() {
  const source = await readJson(sourceDataPath);
  const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-ciencias-biologicas-2017.json");
  validateBiologicalSciencesSource(source, snapshot);
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  assert.ok(audit, "Falta la auditoría previa: no se reconstruye el plan");
  const trajectory = source.trajectories[0];
  const curriculumUrl = source.sources.find(({ id }) => id === "cidu-2026").url;
  audit.reviewedAt = source.reviewedAt;
  audit.scope = "vigencia, Plan 2015/implementación 2017, título único, Montevideo, 360 créditos, mínimos, tutoría y guía inicial parcial CIDU 2026 de dos semestres";
  audit.officialPlan.pathwayLabel = trajectory.label;
  audit.officialPlan.trajectories = [{ ...trajectory, useOnlyConfiguredPeriods: true, restrictGeneratedCatalogToPublished: true }];
  Object.assign(audit.officialPlan.curriculum, {
    strictOfficialCourseIds: true,
    verifiedCourseIds: source.catalogMatches.map(({ sourceCourseId }) => sourceCourseId),
    sourceUrl: curriculumUrl,
    sourceDataPath,
    includeAllCoursesInPathwayCatalog: true,
    pathwayLabel: trajectory.label,
    pathwayDescription: trajectory.description,
    courseOverrides: Object.fromEntries(source.catalogMatches.map((row) => [row.sourceCourseId, {
      name: row.officialLabel,
      preserveName: true,
      requirementId: row.requirementId,
      periodLabel: row.period,
      officialIdentity: true,
      officialCredits: true,
      authorityStatus: "verified",
    }])),
    additionalCourses: source.sourceOnlyRows.map((row) => ({
      id: row.identityKey,
      sourceCourseId: row.identityKey,
      name: row.officialLabel,
      credits: row.credits,
      creditsPublished: row.creditsPublished,
      curricularBlock: false,
      requirementId: row.requirementId,
      periodLabel: row.period,
      sourceUrl: curriculumUrl,
      catalogRole: "official-semester-source-only-course",
      availabilityStatus: "official-trajectory-no-unambiguous-technical-code",
    })),
    projectionAnomalies: source.conflicts,
  });
  delete audit.officialPlan.curriculum.preserveBedeliasCourseIds;
  Object.assign(audit.conclusion, {
    trajectoryStatus: source.trajectoryConclusion.state,
    trajectorySourceDataPath: sourceDataPath,
    trajectoryCoverage: source.publication.coverage,
    completeDegreeSequence: false,
    reason: source.trajectoryConclusion.reason,
  });
  audit.conclusion.normalization = audit.conclusion.normalization.filter((value) => !value.startsWith("Mantener las 978"));
  const normalizedInstruction = "Reproducir sólo dos semestres de la guía inicial CIDU 2026; catálogo verificado parcial de ocho códigos y un seminario sólo-fuente, sin semestres 3-8 ni promoción de las otras identidades administrativas.";
  if (!audit.conclusion.normalization.includes(normalizedInstruction)) audit.conclusion.normalization.push(normalizedInstruction);
  const sources = new Map(audit.sources.map((item) => [item.url, item]));
  for (const item of source.sources) sources.set(item.url, {
    ...(sources.get(item.url) ?? {}),
    url: item.url, authority: item.authority, supports: [item.role],
    reviewedAt: item.consultedAt, publishedValidity: item.publishedValidity,
    contentHash: digest(source.sourcePortions[item.id]),
    ...(item.rawSha256 ? { rawContentHash: `sha256:${item.rawSha256}` } : {}),
  });
  audit.sources = [...sources.values()];
  audit.anomalies = audit.anomalies.filter(({ field }) => !source.conflicts.some((item) => item.field === field));
  audit.anomalies.push(...source.conflicts);
  audit.uiNotice = "Guía inicial oficial 2026 · parcial: sólo primer y segundo semestre en Montevideo. No es la malla completa de ocho semestres. El resto se construye con tutoría: 360 créditos, 210 comunes, 140 de orientación, 10 de prácticas integrales y Trabajo Final de 32. El catálogo verificado es parcial; las candidatas administrativas no acreditan requisitos.";
  audit.remainingWork = source.trajectoryConclusion.reviewTrigger;
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);
  const reviews = await readJson(reviewsPath);
  const review = {
    planId: source.planId,
    state: source.trajectoryConclusion.state,
    reviewedAt: source.reviewedAt,
    effectiveAt: source.publication.trajectoryEffectiveAt,
    projectionMechanism: "official-periods",
    scope: { territories: ["Montevideo"], pathwayIds: [trajectory.id], coverage: source.publication.coverage, completeDegreeSequence: false },
    sources: source.sources.map((item) => ({ authority: item.authority, url: item.url, reviewedAt: item.consultedAt, role: item.role, contentHash: digest(source.sourcePortions[item.id]) })),
    evidence: {
      kind: "audited-projection", sourceDataPath,
      projectionDataPath: `app/data/bedelias-generated/${source.planId}.json`,
      sourceCollection: "trajectories", projectionCollection: "publishedPathways", periodField: "periods",
      compareCoursePlacements: true, partial: true, completeDegreeSequence: false,
      reviewTrigger: source.trajectoryConclusion.reviewTrigger,
    },
    conflictNotes: source.conflicts.map(({ resolution }) => resolution),
  };
  const reviewIndex = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (reviewIndex < 0) reviews.reviews.push(review);
  else reviews.reviews[reviewIndex] = review;
  await writeJsonIfChanged(reviewsPath, reviews);

  // Conservar finales de línea del checkout en todo el lote evita ruido Windows.
  const generatedPaths = [
    ...(await readdir(path.join(root, "app/data/bedelias-generated"))).filter((name) => name.endsWith(".json")).map((name) => `app/data/bedelias-generated/${name}`),
    "app/data/extracted-academic-catalog.json", "app/data/extracted-academic-loaders.ts",
    "data/bedelias/inventory/audit-queue.json", "data/bedelias/inventory/ui-curriculum-queue.json",
    "data/bedelias/inventory/ui-extracted-plans.json", "data/official-trajectories/inventory.json",
  ];
  const previousGenerated = new Map(await Promise.all(generatedPaths.map(async (relativePath) => [relativePath, await readFile(path.join(root, relativePath), "utf8")])));
  await buildAndWriteAuditQueue();
  await buildExtractedAcademicPlans();
  await buildAndWriteUiCurriculumQueue();
  const inventory = await buildOfficialTrajectoryInventory();
  for (const [relativePath, previous] of previousGenerated) {
    if (!previous.includes("\r\n")) continue;
    const target = path.join(root, relativePath);
    const generated = await readFile(target, "utf8");
    await writeFile(target, generated.replace(/\r?\n/g, "\r\n"), "utf8");
  }
  const projection = await readJson(`app/data/bedelias-generated/${source.planId}.json`);
  validateBiologicalSciencesProjection(source, projection, inventory.plans.find(({ planId }) => planId === source.planId));
  console.log("D03ax regenerado sin red: guía inicial parcial de dos semestres, ocho ubicaciones, 360 créditos y progreso preservado.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildBiologicalSciencesReview();
