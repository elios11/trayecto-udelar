#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = "data/fenf/enfermeria-2016-trajectory-review.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const projectionPath = "app/data/bedelias-generated/bedelias-fenf-licenciatura-en-enfermeria-2016.json";
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const writeJsonIfChanged = async (relative, value) => {
  const target = path.join(root, relative);
  const previous = await readFile(target, "utf8");
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const next = previous.includes("\r\n") ? content.replace(/\n/g, "\r\n") : content;
  if (previous !== next) await writeFile(target, next, "utf8");
};
const periodLabel = (number) => `${number}.º semestre`;

export function verifyFenfSource(source, snapshot) {
  assert.equal(source.planId, "bedelias-fenf-licenciatura-en-enfermeria-2016");
  assert.equal(source.fingerprint.value, digest(source.sourcePortion));
  assert.deepEqual(source.sourcePortion.credits, {
    total: 360, cycles: [80, 200, 40, 40], integrated: 240,
    independent: 90, flexible: 30, intermediate: 200,
  });
  assert.equal(source.sourcePortion.periodRows.length, 20);
  assert.equal(source.sourcePortion.periodRows.reduce((sum, row) => sum + row[2], 0), 330);
  assert.equal(source.sourcePortion.flexiblePlacements.reduce((sum, row) => sum + row[1], 0), 30);
  assert.deepEqual(source.sourcePortion.periodRows.reduce((totals, row) => {
    totals[row[4]] += row[2]; return totals;
  }, { integrated: 0, independent: 0 }), { integrated: 245, independent: 85 });
  const codes = source.sourcePortion.periodRows.map((row) => row[0]);
  assert.equal(new Set(codes).size, codes.length);
  for (const [code, , credits] of source.sourcePortion.periodRows) {
    const matches = snapshot.plan.courses.filter((course) => course.code === code);
    assert.equal(matches.length, 1, `Código técnico ambiguo: ${code}`);
    assert.equal(matches[0].credits, credits, `Carga diferente: ${code}`);
  }
  assert.ok(!codes.includes(source.technicalComparison.compositeAlias));
  assert.equal(source.conclusion.completeDegreeSequence, false);
}

export function verifyFenfProjection(source, projection, inventoryEntry) {
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.evidence.partial, true);
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 25);
  assert.deepEqual(projection.campuses.map(({ label }) => label), source.sourcePortion.campuses);
  assert.deepEqual([projection.plan.minCredits, projection.plan.durationMonths], [360, 54]);
  assert.deepEqual(Object.keys(projection.pathways), ["plan-2016-indicativo"]);
  assert.deepEqual(projection.publishedPathways["plan-2016-indicativo"].periods.map(({ label }) => label),
    Array.from({ length: 9 }, (_, index) => periodLabel(index + 1)));
  const verifiedTechnical = projection.courses.filter((course) => course.bedeliasCode && course.authorityStatus === "verified");
  assert.deepEqual(verifiedTechnical.map(({ bedeliasCode }) => bedeliasCode).sort(),
    source.sourcePortion.periodRows.map((row) => row[0]).sort());
  assert.equal(projection.courses.find((course) => course.bedeliasCode === "2001").authorityStatus, "candidate");
  assert.equal(projection.creditStructure.credentials.length, 2);
  assert.deepEqual(projection.creditStructure.credentials.map(({ minTotalCredits }) => minTotalCredits), [200, 360]);
}

export async function buildFenfEnfermeria2016() {
  const source = await readJson(sourcePath);
  const snapshot = await readJson(source.technicalComparison.snapshotPath);
  verifyFenfSource(source, snapshot);
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  assert.ok(audit, "Falta la auditoría previa");
  const planUrl = source.sources.find(({ id }) => id === "plan").url;
  const guideUrl = source.sources.find(({ id }) => id === "guia").url;
  const periods = Array.from({ length: 9 }, (_, index) => ({
    label: periodLabel(index + 1),
    courseIds: [
      ...source.sourcePortion.periodRows.filter((row) => row[3] === index + 1).map((row) => row[0]),
      ...source.sourcePortion.flexiblePlacements.filter((row) => row[0] === index + 1)
        .map((row) => `fenf-flex-${row[0]}`),
    ],
  }));
  const description = "Esquema indicativo del Plan 2016, con nueve semestres. La verificación visual del Anexo III sigue pendiente; no se afirma una malla completa ni oferta periódica por sede. Los 30 créditos optativos/electivos se pueden cursar hasta el octavo semestre, sin obligación de seguir la distribución sugerida.";
  audit.reviewedAt = source.reviewedAt;
  audit.scope = "un Plan 2016 y cuatro sedes; tabla semestral indicativa del Plan aprobado, catálogo obligatorio parcial y Anexo III pendiente de cotejo visual";
  audit.officialPlan.pathwayLabel = "Esquema indicativo · cotejo parcial";
  audit.officialPlan.trajectories = [{
    id: "plan-2016-indicativo", label: "Esquema indicativo · cotejo parcial", description,
    credentialId: "licenciado-enfermeria", campusIds: ["montevideo", "rivera", "rocha", "salto"],
    useOnlyConfiguredPeriods: true, restrictGeneratedCatalogToPublished: true, periods,
  }];
  const firstFiveCodes = source.sourcePortion.periodRows.filter((row) => row[3] <= 5).map((row) => row[0]);
  const allMandatoryCodes = source.sourcePortion.periodRows.map((row) => row[0]);
  audit.officialPlan.curriculum = {
    sourceUrl: planUrl, sourceDataPath: sourcePath, useBedeliasCompositionTree: true,
    preserveBedeliasCourseIds: true,
    usePublishedCredits: true, strictOfficialCourseIds: true,
    verifiedCourseIds: source.sourcePortion.periodRows.map((row) => row[0]),
    includeAllCoursesInPathwayCatalog: true,
    pathwayLabel: "Esquema indicativo · cotejo parcial", pathwayDescription: description,
    courseOverrides: Object.fromEntries(source.sourcePortion.periodRows.map(([code, name, , semester, category]) => [code, {
      name, preserveName: true, periodLabel: periodLabel(semester),
      requirementId: category, officialIdentity: true, officialCredits: true,
      authorityStatus: "verified",
    }])),
    additionalCourses: source.sourcePortion.flexiblePlacements.map(([semester, credits]) => ({
      id: `fenf-flex-${semester}`, sourceCourseId: `fenf-flex-${semester}`,
      name: `Optativas o electivas · ${credits} créditos indicativos`, credits,
      requirementId: "flexible", periodLabel: periodLabel(semester), curricularBlock: true,
      elective: true, catalogRole: "official-flexible-slot", sourceUrl: planUrl,
      availabilityStatus: "indicative-credit-space-not-current-course-offer",
    })),
    creditRequirements: [
      { id: "integrated", name: "UC integradas obligatorias", shortName: "Integradas", minCredits: 240, credentialRequired: false },
      { id: "independent", name: "UC independientes obligatorias", shortName: "Independientes", minCredits: 90, credentialRequired: false },
      { id: "flexible", name: "Optativas o electivas", shortName: "Flexibles", minCredits: 30 },
    ],
    requiredCourseGroups: [
      { id: "auxiliar-hasta-quinto", label: "Aprobá las UC hasta el quinto semestre", minCompleted: firstFiveCodes.length,
        sourceCourseIds: firstFiveCodes, sourceUrl: guideUrl },
      { id: "licenciatura-obligatorias", label: "Aprobá las 20 UC obligatorias", minCompleted: allMandatoryCodes.length,
        sourceCourseIds: allMandatoryCodes, sourceUrl: guideUrl },
    ],
    credentials: [
      { id: "auxiliar-enfermeria", title: "Auxiliar de Enfermería", minTotalCredits: 200,
        nodeRequirements: [{ nodeId: "plan-total", minCredits: 200 }],
        requiredCourseGroupIds: ["auxiliar-hasta-quinto"], sourceUrl: guideUrl },
      { id: "licenciado-enfermeria", title: "Licenciado/a en Enfermería", minTotalCredits: 360,
        nodeRequirements: [{ nodeId: "plan-total", minCredits: 360 }, { nodeId: "flexible", minCredits: 30 }],
        requiredCourseGroupIds: ["licenciatura-obligatorias"], sourceUrl: guideUrl },
    ],
    projectionAnomalies: [
      { field: "visualAnnex", resolution: source.visualVerification },
      { field: "compositeAlias", resolution: source.technicalComparison.compositeAliasReason },
      { field: "flexibleOffer", resolution: source.technicalComparison.unmatchedFlexibleCatalog },
      { field: "categoryCredits", resolution: source.technicalComparison.categoryConflict },
    ],
  };
  Object.assign(audit.conclusion, {
    trajectoryStatus: source.conclusion.state, trajectorySourceDataPath: sourcePath,
    trajectoryCoverage: source.conclusion.coverage, completeDegreeSequence: false,
    trajectoryReviewTrigger: source.conclusion.reviewTrigger,
  });
  audit.remainingWork = source.conclusion.reviewTrigger;
  audit.uiNotice = description;
  const sourceMap = new Map(audit.sources.map((item) => [item.url, item]));
  for (const item of source.sources) sourceMap.set(item.url, {
    url: item.url, authority: item.authority, reviewedAt: item.consultedAt,
    publishedValidity: item.publishedValidity, supports: [item.scope],
    ...(item.id === "plan" ? { contentHash: source.fingerprint.value } : {}),
  });
  audit.sources = [...sourceMap.values()];
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);

  const reviews = await readJson(reviewsPath);
  const review = {
    planId: source.planId, state: source.conclusion.state, reviewedAt: source.reviewedAt,
    effectiveAt: "Plan 2016; tabla indicativa del Plan aprobado y Guía 2025",
    projectionMechanism: "official-periods",
    scope: { territories: source.sourcePortion.campuses, pathwayIds: ["plan-2016-indicativo"],
      coverage: source.conclusion.coverage, completeDegreeSequence: false },
    sources: source.sources.map((item) => ({ authority: item.authority, url: item.url,
      reviewedAt: item.consultedAt, role: item.scope,
      ...(item.id === "plan" ? { contentHash: source.fingerprint.value } : {}) })),
    evidence: { kind: "audited-projection", sourceDataPath: sourcePath, projectionDataPath: projectionPath,
      sourceCollection: "trajectories", projectionCollection: "publishedPathways", periodField: "periods",
      compareCoursePlacements: true, partial: true, completeDegreeSequence: false,
      reviewTrigger: source.conclusion.reviewTrigger },
    conflictNotes: [source.visualVerification, source.technicalComparison.compositeAliasReason],
  };
  const index = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (index < 0) reviews.reviews.push(review); else reviews.reviews[index] = review;
  await writeJsonIfChanged(reviewsPath, reviews);

  await buildAndWriteAuditQueue();
  await buildExtractedAcademicPlans();
  await buildAndWriteUiCurriculumQueue();
  const inventory = await buildOfficialTrajectoryInventory();
  const projection = await readJson(projectionPath);
  verifyFenfProjection(source, projection, inventory.plans.find(({ planId }) => planId === source.planId));
  console.log("Enfermería 2016: esquema indicativo parcial y 20 identidades técnicas cotejadas regeneradas sin red.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildFenfEnfermeria2016();
