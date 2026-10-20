#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRegisteredPlanPresentation, GENERATED_PATHWAY_LABEL } from "../app/registered-plan-courses.mjs";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDataPath = "data/fcien/geografia-2018-trajectory-review.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const identityLoadAuthority = (courses) => courses.map((course) => [course.id, course.bedeliasCode, course.name, course.credits, course.eligibleRequirementIds, course.creditAllocations, course.authorityStatus]);
const replaceFileAtomically = async (target, content) => {
  const pending = `${target}.d03bb.tmp`;
  await writeFile(pending, content, "utf8");
  await rename(pending, target);
};
const writeJsonIfChanged = async (relativePath, value) => {
  const target = path.join(root, relativePath);
  const previous = await readFile(target, "utf8");
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (previous.replace(/\r\n/g, "\n") !== next) {
    await replaceFileAtomically(target, previous.includes("\r\n") ? next.replace(/\n/g, "\r\n") : next);
  }
};

export function validateGeographySource(source, snapshot) {
  assert.equal(source.planId, "bedelias-fcien-licenciatura-en-geografia-2018");
  assert.equal(source.auditIdentity, "licenciatura en geografia:2018");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions), "Huella de evidencia normalizada alterada");
  assert.equal(source.trajectoryConclusion.state, "research-pending");
  assert.equal(source.publication.minimumCredits, 360);
  assert.equal(Object.values(source.publication.coreAreaMinimums).reduce((sum, value) => sum + value, 0), 220);
  assert.equal(220 + source.publication.electiveMinimum + source.publication.extensionMinimum + source.publication.thesisCredits, 360);
  assert.equal(source.publication.durationMonths, 48);
  assert.equal(snapshot.contentHash, source.projectionBaseline.snapshotContentHash);
  assert.equal(snapshot.plan.courses.length, source.projectionBaseline.snapshotDistinctCourseRecords);
  assert.deepEqual(source.scope.coursePeriodRowsReconciled, []);
  assert.equal(source.scope.technicalCourseIdentitiesPromoted, 0);
  assert.equal(source.sourcePortions["historical-plan-2003"].applicableToPlan2018, false);
  assert.equal(source.sourcePortions["isolated-programs"].planCode, "1273");
  const regulation = source.sourcePortions["eva-reglamento-2021"];
  assert.deepEqual(regulation.suggestedSemesterTables.map(({ number }) => number), [2, 3]);
  assert.equal(regulation.regularCoursesTable, 4);
  assert.deepEqual(regulation.creditDistribution, { basic: 220, optional: 80, eligible: 20, extension: 10, thesis: 30, total: 360 });
  assert.deepEqual(regulation.plan2018ApprovedDistribution, { basic: 220, optional: 90, eligible: 0, extension: 10, thesis: 40, total: 360 });
  assert.equal(regulation.approvalResolutionVerified, false);
  assert.equal(regulation.visualTablesVerified, false);
  assert.equal(regulation.usedForCurriculumProjection, false);
  for (const entry of source.sources) {
    assert.ok(entry.consultedAt <= source.reviewedAt);
    assert.ok(entry.authority && entry.publishedValidity && entry.role);
    assert.ok(source.sourcePortions[entry.id], `Falta porción normalizada: ${entry.id}`);
    assert.match(new URL(entry.url).hostname, /(?:^|\.)(?:udelar\.edu\.uy|fcien\.edu\.uy|impo\.com\.uy)$/);
  }
  for (const portion of Object.values(source.sourcePortions)) {
    if ("ordinalCoursePeriodRows" in portion) assert.deepEqual(portion.ordinalCoursePeriodRows, []);
  }
}

export function validateGeographyProjection(source, projection, inventoryEntry) {
  assert.equal(inventoryEntry.state, "research-pending");
  assert.equal(inventoryEntry.evidence.kind, "insufficient-current-trajectory-evidence");
  assert.equal(inventoryEntry.evidence.sourceDataPath, sourceDataPath);
  assert.deepEqual(Object.keys(projection.pathways), source.scope.pathwayIds);
  assert.deepEqual(projection.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.equal(projection.plan.year, "2018");
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.creditStructure.credentials.length, 1);
  assert.deepEqual(Object.fromEntries(projection.creditStructure.credentials[0].nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits])), {
    ...source.publication.coreAreaMinimums,
    electives: source.publication.electiveMinimum,
    "extension-community": source.publication.extensionMinimum,
    thesis: source.publication.thesisCredits,
  });
  assert.equal(projection.courses.length, source.projectionBaseline.projectedCourseRecords);
  assert.equal(digest(identityLoadAuthority(projection.courses)), source.projectionBaseline.courseIdentityLoadAuthorityHash, "No alterar IDs, cargas, asignaciones ni autoridad del catálogo");
  assert.equal(digest(projection.rules), source.projectionBaseline.rulesHash, "No inferir previaturas desde programas aislados");
  assert.deepEqual(projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified").map(({ id }) => id), source.projectionBaseline.verifiedValidationIds);
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length, source.projectionBaseline.candidateCount);
  const presentation = buildRegisteredPlanPresentation("trayectoria-flexible", projection);
  assert.equal(presentation.generated, true);
  assert.equal(presentation.label, GENERATED_PATHWAY_LABEL);
  assert.match(presentation.description, /No es una trayectoria sugerida por la institución/);
  assert.ok(presentation.periods.length > 0);
  assert.ok(presentation.periods.every(({ label, courseIds }) => !/semestre|año/i.test(label) && courseIds.length > 0 && courseIds.length <= 6));
  assert.equal(presentation.courses.length, source.projectionBaseline.candidateCount);
  assert.ok(presentation.courses.every(({ provisional, eligibleRequirementIds, creditAllocations }) => provisional === true && eligibleRequirementIds.length === 0 && creditAllocations.length === 0));
  assert.equal(projection.publishedRules.length, 0);
}

export async function buildGeographyReview() {
  const source = await readJson(sourceDataPath);
  validateGeographySource(source, await readJson("data/bedelias/fcien-licenciatura-en-geografia-2018.json"));
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  assert.ok(audit, "Falta auditoría previa: no se reconstruye el plan");
  audit.reviewedAt = source.reviewedAt;
  audit.scope = "vigencia, aprobación, título, sede, duración, mínimos, optativas, extensión, tesina y contraste del reglamento EVA con grillas no adoptadas y distribución contradictoria";
  Object.assign(audit.conclusion, {
    trajectoryStatus: source.trajectoryConclusion.state,
    trajectorySourceDataPath: sourceDataPath,
    trajectoryJustification: source.trajectoryConclusion.reason,
    trajectoryReviewTrigger: source.trajectoryConclusion.reviewTrigger,
  });
  audit.officialPlan.curriculum.sourceDataPath = sourceDataPath;
  const sources = new Map(audit.sources.map((entry) => [entry.url, entry]));
  for (const entry of source.sources) sources.set(entry.url, {
    ...(sources.get(entry.url) ?? {}), url: entry.url, authority: entry.authority,
    supports: [entry.role], reviewedAt: entry.consultedAt, publishedValidity: entry.publishedValidity,
    contentHash: digest(source.sourcePortions[entry.id]),
  });
  audit.sources = [...sources.values()];
  audit.anomalies = audit.anomalies.filter(({ field }) => field !== "trajectory");
  audit.anomalies.push({ field: "trajectory", resolution: source.trajectoryConclusion.reason });
  audit.uiNotice = "Plan 2018 flexible de cuatro años y 360 créditos en Montevideo. Una guía semestral publicada en EVA tiene vigencia sin confirmar y contradice los créditos del Plan aprobado; el orden visible sigue siendo un recorrido orientativo generado por Trayecto, no una trayectoria institucional validada. Cumplí los cinco mínimos por 220 créditos, 90 optativos, 10 de extensión y la tesina de 40; la Comisión debe avalar su propuesta y verificar los mínimos previamente.";
  audit.remainingWork = source.trajectoryConclusion.reviewTrigger;
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);
  const reviews = await readJson(reviewsPath);
  const review = {
    planId: source.planId, state: "research-pending", reviewedAt: source.reviewedAt,
    effectiveAt: "Plan aprobado en 2017 y registrado como implementación 2018; ficha FCIEN actualizada febrero 2024",
    projectionMechanism: "official-flexible-structure",
    scope: { territories: source.scope.territories, pathwayIds: source.scope.pathwayIds },
    sources: source.sources.map((entry) => ({ authority: entry.authority, url: entry.url, reviewedAt: entry.consultedAt, role: entry.role, contentHash: digest(source.sourcePortions[entry.id]) })),
    evidence: {
      kind: "insufficient-current-trajectory-evidence", sourceDataPath,
      projectionDataPath: `app/data/bedelias-generated/${source.planId}.json`,
      sourceContentHash: digest(source.sourcePortions), ordinalCoursePeriodRows: 0,
      promotedCourseCount: 0, candidateRetainedCount: source.projectionBaseline.candidateCount,
      reason: source.trajectoryConclusion.reason, reviewTrigger: source.trajectoryConclusion.reviewTrigger,
    },
    conflictNotes: [
      "El Plan 2018 aprobado describe cinco áreas y trayectorias individuales, sin ubicar unidades en semestres ordinales; sus cuatro años no autorizan inferir una grilla de ocho semestres.",
      "El PDF de reglamentación alojado en EVA contiene tres trayectorias sugeridas en los Cuadros 2–3 y cursos regulares en el Cuadro 4, pero no se verificó resolución ni vigencia; la descarga y la captura visual fallaron.",
      "El PDF EVA propone 220 básicos + 80 optativos + 20 elegibles + 10 extensión + 30 tesina, incompatible con los 220 + 90 + 10 + 40 del Plan aprobado. No se modifican mínimos ni se adoptan semestres sin aclaración oficial.",
      "La grilla semestral del Plan 2003 y los anuarios anteriores no se trasladan a 2018 por semejanza nominal.",
      "Un programa GF075 del Plan 2018 valida un curso aislado, pero no la secuencia ni las 167 apariciones técnicas; no se promueven candidatas en esta auditoría de trayectoria.",
      "El rango 10–15 de actividades en la prosa y el mínimo de 10 del cuadro se conservan como anomalía; no se cambia la regla operativa.",
      "La flexibilidad individual y la búsqueda sin resultados no son una declaración institucional positiva de ausencia de malla.",
    ],
  };
  const index = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (index < 0) reviews.reviews.push(review);
  else reviews.reviews[index] = review;
  await writeJsonIfChanged(reviewsPath, reviews);

  // Los generadores compartidos emiten LF; no alterar por ese motivo los otros planes en Windows.
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
    if (generated !== previous) await replaceFileAtomically(target, generated.replace(/\r?\n/g, "\r\n"));
  }
  validateGeographyProjection(source, await readJson(`app/data/bedelias-generated/${source.planId}.json`), inventory.plans.find(({ planId }) => planId === source.planId));
  console.log("D03bd regenerado sin red: reglamento EVA contradictorio sin adopción comprobada; research-pending y 167 candidatas preservadas.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildGeographyReview();
