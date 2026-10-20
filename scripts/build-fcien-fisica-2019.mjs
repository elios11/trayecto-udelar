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
const sourceDataPath = "data/fcien/fisica-2019-trajectory-review.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const identityLoadAuthority = (courses) => courses.map((course) => [course.id, course.bedeliasCode, course.name, course.credits, course.eligibleRequirementIds, course.creditAllocations, course.authorityStatus]);
const replaceFileAtomically = async (target, content) => {
  const pending = `${target}.d03az.tmp`;
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

export function validatePhysicsSource(source, snapshot) {
  assert.equal(source.planId, "bedelias-fcien-licenciatura-en-fisica-2019");
  assert.equal(source.auditIdentity, "licenciatura en fisica:2019");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions), "Huella de evidencia normalizada alterada");
  assert.equal(source.trajectoryConclusion.state, "research-pending");
  assert.equal(source.publication.minimumCredits, 360);
  assert.equal(Object.values(source.publication.areaMinimums).reduce((sum, value) => sum + value, 0), 268);
  assert.equal(source.publication.flexibleCredits, 92);
  assert.deepEqual([source.publication.integralCreditsWithinHumanSocial, source.publication.researchInitiationCreditsWithinAnyArea], [10, 8]);
  assert.equal(snapshot.contentHash, source.projectionBaseline.snapshotContentHash);
  assert.equal(snapshot.plan.courses.length, 266);
  assert.deepEqual(source.scope.coursePeriodRowsReconciled, []);
  assert.equal(source.scope.technicalCourseIdentitiesPromoted, 0);
  const regular = source.sourcePortions["regular-courses"];
  assert.equal(regular.rows.length, 28);
  assert.equal(new Set(regular.rows.map((row) => row[1])).size, 28);
  assert.deepEqual(["Física", "Matemática", "Herramientas"].map((area) => regular.rows.filter((row) => row[0] === area).length), [13, 6, 9]);
  assert.ok(regular.rows.every((row) => row.length === 3 && ["Impar", "Par"].includes(row[2])));
  assert.equal(regular.frequency, "Anual");
  assert.equal(regular.codesPublished, false);
  assert.equal(regular.creditsPublished, false);
  assert.deepEqual(regular.ordinalCoursePeriodRows, []);
  const requirements = source.sourcePortions["course-requirements"];
  assert.equal(requirements.groups.flatMap(({ courses }) => courses).length, 28);
  assert.deepEqual(requirements.technicalMappingsConfirmed, []);
  assert.equal(source.sources.find(({ id }) => id === "institute-regulation").rawSha256, source.sources.find(({ id }) => id === "juridica-regulation").rawSha256);
  for (const entry of source.sources) {
    assert.ok(entry.consultedAt <= source.reviewedAt);
    assert.ok(entry.authority && entry.publishedValidity && entry.role);
    assert.ok(source.sourcePortions[entry.id], `Falta porción normalizada: ${entry.id}`);
    assert.match(new URL(entry.url).hostname, /(?:^|\.)(?:udelar\.edu\.uy|fcien\.edu\.uy|fisica\.edu\.uy|impo\.com\.uy)$/);
    if (entry.rawSha256) assert.match(entry.rawSha256, /^[0-9a-f]{64}$/);
  }
}

export function validatePhysicsProjection(source, projection, inventoryEntry) {
  assert.equal(inventoryEntry.state, "research-pending");
  assert.equal(inventoryEntry.evidence.kind, "insufficient-current-trajectory-evidence");
  assert.equal(inventoryEntry.evidence.sourceDataPath, sourceDataPath);
  assert.deepEqual(Object.keys(projection.pathways), source.scope.pathwayIds);
  assert.deepEqual(projection.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.equal(projection.plan.year, "2019");
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.creditStructure.credentials.length, 1);
  assert.deepEqual(Object.fromEntries(projection.creditStructure.credentials[0].nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits])), source.publication.areaMinimums);
  assert.equal(projection.courses.length, source.projectionBaseline.projectedCourseRecords);
  assert.equal(digest(identityLoadAuthority(projection.courses)), source.projectionBaseline.courseIdentityLoadAuthorityHash, "No alterar IDs, cargas, asignaciones ni autoridad del catálogo");
  assert.equal(digest(projection.rules), source.projectionBaseline.rulesHash, "No inferir previaturas desde la nueva fuente");
  assert.deepEqual(projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified").map(({ id }) => id), source.projectionBaseline.verifiedValidationIds);
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length, 290);
  const presentation = buildRegisteredPlanPresentation("formacion-personalizada", projection);
  assert.equal(presentation.generated, true);
  assert.equal(presentation.label, GENERATED_PATHWAY_LABEL);
  assert.match(presentation.description, /No es una trayectoria sugerida por la institución/);
  assert.ok(presentation.periods.length > 0);
  assert.ok(presentation.periods.every(({ label, courseIds }) => !/semestre|año/i.test(label) && courseIds.length > 0 && courseIds.length <= 6));
  assert.equal(presentation.courses.length, 290);
  assert.ok(presentation.courses.every(({ provisional, eligibleRequirementIds, creditAllocations }) => provisional === true && eligibleRequirementIds.length === 0 && creditAllocations.length === 0));
  assert.equal(projection.publishedRules.length, 0);
}

export async function buildPhysicsReview() {
  const source = await readJson(sourceDataPath);
  validatePhysicsSource(source, await readJson("data/bedelias/fcien-licenciatura-en-fisica-2019.json"));
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  assert.ok(audit, "Falta la auditoría previa: no se reconstruye el plan");
  audit.reviewedAt = source.reviewedAt;
  audit.scope = "título, sede Montevideo, 360 créditos y mínimos, normativa 2017/2018/2021 y revisión 2026 de fuentes de trayectoria; paridad de 28 cursos regulares sin secuencia ordinal demostrada";
  Object.assign(audit.conclusion, {
    trajectoryStatus: source.trajectoryConclusion.state,
    trajectorySourceDataPath: sourceDataPath,
    trajectoryJustification: source.trajectoryConclusion.reason,
    trajectoryReviewTrigger: source.trajectoryConclusion.reviewTrigger,
  });
  audit.conclusion.normalization = audit.conclusion.normalization.filter((entry) => !entry.startsWith("Conservar las 290 apariciones"));
  const normalization = "Conservar las 290 apariciones como candidatas recuperables; el listado regular Impar/Par no crea catálogo verificado, períodos ordinales, oferta futura ni equivalencias técnicas.";
  if (!audit.conclusion.normalization.includes(normalization)) audit.conclusion.normalization.push(normalization);
  audit.officialPlan.curriculum.sourceDataPath = sourceDataPath;
  const sources = new Map(audit.sources.map((entry) => [entry.url, entry]));
  for (const entry of source.sources) sources.set(entry.url, {
    ...(sources.get(entry.url) ?? {}), url: entry.url, authority: entry.authority,
    supports: [entry.role], reviewedAt: entry.consultedAt, publishedValidity: entry.publishedValidity,
    contentHash: digest(source.sourcePortions[entry.id]),
    ...(entry.rawSha256 ? { rawContentHash: `sha256:${entry.rawSha256}` } : {}),
  });
  audit.sources = [...sources.values()];
  audit.anomalies = audit.anomalies.filter(({ field }) => field !== "trajectory" && field !== "approvalChronology");
  audit.anomalies.push(
    { field: "trajectory", resolution: source.trajectoryConclusion.reason },
    { field: "approvalChronology", resolution: "Plan rotulado 2017 y aprobado por FCIEN en diciembre 2017; IMPO confirma aprobación CDC 21 de 26/06/2018. Colibrí registra implementación 2019; el Reglamento CDC 2021 republicado por el Instituto en 2026 conserva el rótulo 2017. No son nuevos planes ni progreso distinto." },
  );
  audit.uiNotice = "Plan 2019 flexible de cuatro años y 360 créditos en Montevideo. La trayectoria sugerida sigue en investigación: el listado oficial Impar/Par describe frecuencia, no semestres ordinales. El orden visible es un recorrido orientativo generado por Trayecto, no una secuencia institucional. Cumplí los cinco mínimos por 268 créditos y distribuí los 92 restantes; la Comisión debe validar el currículo, 10 créditos integrales y 8 de iniciación a la investigación.";
  audit.remainingWork = source.trajectoryConclusion.reviewTrigger;
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);
  const reviews = await readJson(reviewsPath);
  const review = {
    planId: source.planId, state: "research-pending", reviewedAt: source.reviewedAt,
    effectiveAt: "Plan 2017, CDC 2018, implementación 2019; Reglamento 2021 republicado 2026",
    projectionMechanism: "official-flexible-structure",
    scope: { territories: source.scope.territories, pathwayIds: source.scope.pathwayIds },
    sources: source.sources.map((entry) => ({ authority: entry.authority, url: entry.url, reviewedAt: entry.consultedAt, role: entry.role, contentHash: digest(source.sourcePortions[entry.id]) })),
    evidence: {
      kind: "insufficient-current-trajectory-evidence", sourceDataPath,
      projectionDataPath: `app/data/bedelias-generated/${source.planId}.json`,
      sourceContentHash: digest(source.sourcePortions), regularCourseRows: 28, ordinalCoursePeriodRows: 0,
      promotedCourseCount: 0, candidateRetainedCount: 290,
      reason: source.trajectoryConclusion.reason, reviewTrigger: source.trajectoryConclusion.reviewTrigger,
    },
    conflictNotes: [
      "Impar/Par y frecuencia Anual no son semestres ordinales ni una garantía de oferta futura; no se proyectan como trayectoria.",
      "Las 28 etiquetas regulares no publican códigos ni créditos; se conservan 266 registros técnicos, 290 apariciones candidatas y sus versiones sin promover ni fusionar por semejanza.",
      "Los requisitos por créditos no permiten deducir períodos; se preservan las reglas previas sin sustituirlas por inferencia.",
      "La grilla del Anuario 2010 corresponde al Plan anterior y no demuestra adopción por el Plan 2019.",
      "La flexibilidad, el 403 de Colibrí y el enlace EVA de la Comisión no son evidencia positiva de ausencia de trayectoria.",
      "Se conserva 2019 como identidad técnica única, con origen FCIEN 2017, aprobación CDC 2018 y Reglamento 2021 republicado 2026.",
    ],
  };
  const index = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (index < 0) reviews.reviews.push(review);
  else reviews.reviews[index] = review;
  await writeJsonIfChanged(reviewsPath, reviews);

  // Los generadores compartidos escriben LF: preservar finales locales evita
  // modificar los otros 138 planes por la configuración CRLF de Windows.
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
  validatePhysicsProjection(source, await readJson(`app/data/bedelias-generated/${source.planId}.json`), inventory.plans.find(({ planId }) => planId === source.planId));
  console.log("D03az regenerado sin red: research-pending, 28 filas de paridad sin semestre inferido y 290 candidatas preservadas.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildPhysicsReview();
