#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDataPath = "data/fcien/ciencias-atmosfera-2007-trajectory-review.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const periodLabel = (row) => row.semester ? `Semestre ${row.semester}` : "Optativas/Electivas sin semestre fijo";
const normalizeLabel = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s*\(fing\)$/, "").trim();
const replaceFileAtomically = async (target, content) => {
  const pending = `${target}.d03ay.tmp`;
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

export function validateAtmosphericSciencesSource(source, snapshot) {
  assert.equal(source.planId, "bedelias-fcien-licenciatura-en-ciencias-de-la-atmosfera-2007");
  assert.equal(source.auditIdentity, "licenciatura en ciencias de la atmosfera:2007");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions), "Huella de evidencia normalizada alterada");
  assert.equal(snapshot.contentHash, source.bedeliasComparison.snapshotContentHash);
  assert.equal(snapshot.plan.courses.length, 173);
  assert.equal(source.publication.minimumCredits, 360);
  const portion = source.sourcePortions["department-plan"];
  assert.equal(portion.minimums.reduce((sum, row) => sum + row[1], 0), 279);
  assert.equal(source.publication.flexibleCredits, 81);
  assert.equal(portion.rows.length, 32);
  assert.equal(portion.rows.reduce((sum, row) => sum + (row[2] ?? 0), 0), 300);
  assert.equal(portion.flexibleOptions.length, 14);
  assert.equal(source.sourcePortions["department-faq"].formalOrientations, false);
  assert.match(source.sourcePortions["department-teaching"].currentHeading, /2026/);
  assert.equal(source.catalogMatches.length, 31);
  assert.equal(source.sourceOnlyRows.filter(({ curricularBlock }) => !curricularBlock).length, 9);
  assert.equal(source.sourceOnlyRows.filter(({ curricularBlock }) => curricularBlock).length, 6);
  const bySourceId = new Map([
    ...source.catalogMatches.map((row) => [row.sourceCourseId, row]),
    ...source.sourceOnlyRows.map((row) => [row.identityKey, row]),
  ]);
  assert.equal(bySourceId.size, 46, "No duplicar identidades de fuente");
  const periods = source.trajectories[0].periods;
  assert.equal(periods.length, 8);
  assert.deepEqual(periods.map(({ label }) => label), Array.from({ length: 8 }, (_, index) => `Semestre ${index + 1}`));
  const placements = periods.flatMap(({ courseIds }) => courseIds);
  assert.equal(placements.length, 32);
  assert.equal(new Set(placements).size, 32);
  for (const [index, id] of placements.entries()) {
    const row = bySourceId.get(id);
    assert.ok(row, `Falta fila normalizada ${id}`);
    assert.equal(row.semester, portion.rows[index][0]);
    assert.equal(normalizeLabel(row.officialLabel), normalizeLabel(portion.rows[index][1]), `Nombre de fila alterado: ${id}`);
    assert.equal(row.creditsPublished === false ? null : row.credits, portion.rows[index][2]);
  }
  const options = [...bySourceId.values()].filter(({ elective }) => elective);
  assert.equal(options.length, 14);
  for (const option of portion.flexibleOptions) {
    const row = options.find(({ officialLabel }) => normalizeLabel(officialLabel) === normalizeLabel(option[1]));
    assert.ok(row, `Falta opción publicada ${option[1]}`);
    assert.equal(row.creditsPublished === false ? null : row.credits, option[2]);
  }
  for (const row of source.catalogMatches) {
    const matches = snapshot.plan.courses.filter(({ code }) => code === row.sourceCourseId);
    assert.equal(matches.length, 1, `Identidad técnica ambigua: ${row.sourceCourseId}`);
    assert.equal(matches[0].name, row.bedeliasName);
    assert.equal(matches[0].credits, row.credits);
    assert.ok(!/\d{4}\s*\)/.test(row.bedeliasName), `No reactivar una versión cerrada: ${row.sourceCourseId}`);
  }
  for (const entry of source.sources) {
    assert.equal(entry.consultedAt, source.reviewedAt);
    assert.ok(entry.authority && entry.publishedValidity && entry.role);
    assert.ok(source.sourcePortions[entry.id]);
    assert.match(new URL(entry.url).hostname, /(?:^|\.)(?:udelar\.edu\.uy|fcien\.edu\.uy|fing\.edu\.uy|meteorologia\.edu\.uy)$/);
  }
}

export function validateAtmosphericSciencesProjection(source, projection, inventoryEntry) {
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 32);
  assert.deepEqual(Object.keys(projection.pathways), ["curriculo-personalizado"]);
  assert.deepEqual(projection.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.equal(projection.plan.degreeTitle, source.publication.title);
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.plan.durationMonths, 48);
  assert.deepEqual(projection.plan.sharedWith, ["FACULTAD DE INGENIERÍA"]);
  const extraIds = new Set(source.sourceOnlyRows.map(({ identityKey }) => identityKey));
  const existing = projection.courses.filter(({ sourceCourseId }) => !extraIds.has(sourceCourseId));
  assert.equal(existing.length, source.projectionBaseline.existingCourseRecords);
  assert.equal(digest(existing.map(({ id, bedeliasCode, credits }) => [id, bedeliasCode, credits])), source.projectionBaseline.existingIdentityLoadHash, "No alterar IDs ni cargas previas");
  const technical = projection.courses.filter(({ bedeliasCode, authorityStatus }) => bedeliasCode && authorityStatus === "verified");
  assert.deepEqual(technical.map(({ bedeliasCode }) => bedeliasCode).sort(), source.catalogMatches.map(({ sourceCourseId }) => sourceCourseId).sort());
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length, 206);
  const sourceOnly = projection.courses.filter(({ sourceCourseId }) => extraIds.has(sourceCourseId));
  assert.equal(sourceOnly.length, 15);
  assert.ok(sourceOnly.every(({ bedeliasCode, authorityStatus }) => !bedeliasCode && authorityStatus === "verified"));
  assert.equal(sourceOnly.filter(({ creditsPublished }) => creditsPublished === false).length, 7);
  const presentation = buildRegisteredPlanPresentation("curriculo-personalizado", projection);
  assert.equal(presentation.generated, false);
  assert.deepEqual(presentation.periods.map(({ label }) => label), source.trajectories[0].periods.map(({ label }) => label));
  assert.deepEqual(presentation.periods.map(({ courseIds }) => courseIds.length), [4, 4, 4, 4, 4, 4, 4, 4]);
  assert.ok(presentation.courses.every(({ authorityStatus, provisional }) => authorityStatus === "verified" && provisional !== true));
  const credential = projection.creditStructure.credentials[0];
  assert.equal(credential.minTotalCredits, 360);
  assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 279);
  const known = new Map(projection.courses.map((course) => [course.id, course]));
  const catalog = projection.pathways["curriculo-personalizado"].catalogCourseIds.map((id) => known.get(id));
  assert.equal(catalog.filter(({ elective }) => elective).length, 14);
}

export async function buildAtmosphericSciencesReview() {
  const source = await readJson(sourceDataPath);
  validateAtmosphericSciencesSource(source, await readJson("data/bedelias/fcien-licenciatura-en-ciencias-de-la-atmosfera-2007.json"));
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  assert.ok(audit, "Falta la auditoría previa: no se reconstruye el plan");
  const trajectory = source.trajectories[0];
  const curriculumUrl = source.sources.find(({ id }) => id === "department-plan").url;
  audit.reviewedAt = source.reviewedAt;
  audit.scope = "título compartido, Montevideo, 360 créditos, nueve mínimos, currículo individual y trayectoria ejemplo departamental de ocho semestres con catálogo flexible";
  audit.officialPlan.pathwayLabel = "Trayectoria";
  audit.officialPlan.trajectories = [{ ...trajectory, useOnlyConfiguredPeriods: true, restrictGeneratedCatalogToPublished: true }];
  Object.assign(audit.officialPlan.curriculum, {
    strictOfficialCourseIds: true,
    verifiedCourseIds: source.catalogMatches.map(({ sourceCourseId }) => sourceCourseId),
    sourceUrl: curriculumUrl,
    sourceDataPath,
    includeAllCoursesInPathwayCatalog: true,
    pathwayLabel: "Trayectoria",
    pathwayDescription: trajectory.description,
    courseOverrides: Object.fromEntries(source.catalogMatches.map((row) => [row.sourceCourseId, {
      name: row.officialLabel, preserveName: true,
      requirementId: row.requirementId, periodLabel: periodLabel(row),
      officialIdentity: true, officialCredits: true, authorityStatus: "verified",
      ...(row.elective ? { elective: true, catalogRole: "official-flexible-option" } : {}),
    }])),
    additionalCourses: source.sourceOnlyRows.map((row) => ({
      id: row.identityKey, sourceCourseId: row.identityKey, name: row.officialLabel,
      credits: row.credits, creditsPublished: row.creditsPublished,
      curricularBlock: row.curricularBlock === true,
      requirementId: row.requirementId, periodLabel: periodLabel(row), sourceUrl: curriculumUrl,
      ...(row.elective ? { elective: true } : {}),
      catalogRole: row.curricularBlock ? "official-flexible-slot" : row.elective ? "official-flexible-source-only-option" : "official-semester-source-only-course",
      availabilityStatus: "official-example-not-guaranteed-offering",
    })),
    projectionAnomalies: source.conflicts,
  });
  Object.assign(audit.conclusion, {
    trajectoryStatus: source.trajectoryConclusion.state,
    trajectorySourceDataPath: sourceDataPath,
    reason: source.trajectoryConclusion.reason,
  });
  audit.conclusion.normalization = audit.conclusion.normalization.filter((entry) => !entry.startsWith("Mantener las 238"));
  const instruction = "Reproducir 32 filas de la trayectoria ejemplo departamental en ocho semestres y 14 opciones sin semestre; sólo 31 códigos cotejados, nueve materias sólo-fuente y seis bloques sin carga inventada. Mantener el resto como candidatas recuperables.";
  if (!audit.conclusion.normalization.includes(instruction)) audit.conclusion.normalization.push(instruction);
  const sources = new Map(audit.sources.map((entry) => [entry.url, entry]));
  for (const entry of source.sources) sources.set(entry.url, {
    ...(sources.get(entry.url) ?? {}), url: entry.url, authority: entry.authority,
    supports: [entry.role], reviewedAt: entry.consultedAt, publishedValidity: entry.publishedValidity,
    contentHash: digest(source.sourcePortions[entry.id]),
    ...(entry.rawSha256 ? { rawContentHash: `sha256:${entry.rawSha256}` } : {}),
  });
  audit.sources = [...sources.values()];
  audit.anomalies = audit.anomalies.filter(({ field }) => !source.conflicts.some((entry) => entry.field === field));
  audit.anomalies.push(...source.conflicts);
  audit.uiNotice = "Ejemplo oficial de ocho semestres referido a cursos de Ciencias, compartido con Ingeniería. Es una guía flexible, no una secuencia obligatoria ni oferta garantizada. Completá 360 créditos, los nueve mínimos por 279 y los 81 restantes con tutoría y aprobación de la Comisión. Las identidades sólo-fuente no acreditan automáticamente versiones técnicas con otra carga o vigencia.";
  audit.remainingWork = source.trajectoryConclusion.reviewTrigger;
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);
  const reviews = await readJson(reviewsPath);
  const review = {
    planId: source.planId, state: source.trajectoryConclusion.state,
    reviewedAt: source.reviewedAt, effectiveAt: source.publication.trajectoryEffectiveAt,
    projectionMechanism: "official-periods",
    scope: { territories: ["Montevideo"], pathwayIds: [trajectory.id], coverage: source.publication.coverage },
    sources: source.sources.map((entry) => ({ authority: entry.authority, url: entry.url, reviewedAt: entry.consultedAt, role: entry.role, contentHash: digest(source.sourcePortions[entry.id]) })),
    evidence: {
      kind: "audited-projection", sourceDataPath,
      projectionDataPath: `app/data/bedelias-generated/${source.planId}.json`,
      sourceCollection: "trajectories", projectionCollection: "publishedPathways", periodField: "periods",
      compareCoursePlacements: true,
    },
    conflictNotes: source.conflicts.map(({ resolution }) => resolution),
  };
  const index = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (index < 0) reviews.reviews.push(review);
  else reviews.reviews[index] = review;
  await writeJsonIfChanged(reviewsPath, reviews);

  // Los generadores compartidos escriben LF: conservar el formato local del lote.
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
  validateAtmosphericSciencesProjection(source, await readJson(`app/data/bedelias-generated/${source.planId}.json`), inventory.plans.find(({ planId }) => planId === source.planId));
  console.log("D03ay regenerado sin red: ocho semestres, 32 ubicaciones, 14 opciones y progreso preservado.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildAtmosphericSciencesReview();
