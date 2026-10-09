#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndWriteAuditQueue } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "data", "cenurln", "imagen-fotografica-2008.json");
const snapshotPath = path.join(projectRoot, "data", "bedelias", "cenurln-tecnicatura-en-tecnologias-de-la-imagen-fotografica-2008.json");
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", "bedelias-cenurln-tecnicatura-en-tecnologias-de-la-imagen-fotografica-2008.json");

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };

function validateSource(source, snapshot) {
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  if (source.planId !== "bedelias-cenurln-tecnicatura-en-tecnologias-de-la-imagen-fotografica-2008") {
    fail("El artefacto normalizado no corresponde al plan D03ac.");
  }
  if (source.publication.durationMonths !== 36
    || source.publication.semesterCount !== 6
    || source.publication.creditsPerSemester !== 40
    || source.publication.minimumCredits !== 240
    || source.scope.campuses.length !== 1
    || source.scope.campuses[0].id !== "paysandu") {
    fail("El alcance debe conservar 36 meses, seis semestres, 40 créditos por tramo, 240 totales y sede Paysandú.");
  }

  const snapshotCourses = new Map((snapshot.plan?.courses ?? []).map((course) => [course.code, course]));
  const matchedRows = source.rows.filter(({ projectionBasis }) => projectionBasis === "bedelias-match");
  const sourceOnlyRows = source.rows.filter(({ projectionBasis }) => projectionBasis === "source-only");
  const matchedIds = new Set(source.authorityPolicy.verifiedBedeliasSourceCourseIds);
  const sourceOnlyIds = new Set(source.authorityPolicy.verifiedSourceOnlyIdentityKeys);
  const candidateIds = new Set(source.bedeliasComparison.candidateSourceCourseIds);

  if (snapshotCourses.size !== source.bedeliasComparison.snapshotCourseCount
    || matchedRows.length !== source.bedeliasComparison.matchedCourseCount
    || sourceOnlyRows.length !== source.bedeliasComparison.sourceOnlyCourseCount
    || candidateIds.size !== source.bedeliasComparison.candidateRetainedCount) {
    fail("Los conteos del cotejo no coinciden con el snapshot y las filas normalizadas.");
  }
  if (matchedIds.size !== matchedRows.length
    || matchedRows.some(({ sourceCourseId }) => !matchedIds.has(sourceCourseId))) {
    fail("La frontera de correspondencias Bedelías no coincide con las diez filas verificadas.");
  }
  if (sourceOnlyIds.size !== sourceOnlyRows.length
    || sourceOnlyRows.some(({ identityKey, sourceCourseId }) => !sourceOnlyIds.has(identityKey) || sourceCourseId)) {
    fail("Las diez actividades sólo-fuente deben ser únicas y no recibir códigos de Bedelías.");
  }
  if (matchedIds.size + candidateIds.size !== snapshotCourses.size) {
    fail("Toda identidad del snapshot debe quedar verificada o candidata.");
  }
  for (const courseId of matchedIds) {
    if (candidateIds.has(courseId)) fail(`${courseId} no puede ser verificada y candidata a la vez.`);
  }
  for (const [courseId] of snapshotCourses) {
    if (!matchedIds.has(courseId) && !candidateIds.has(courseId)) fail(`Falta cotejar ${courseId}.`);
  }
  for (const row of matchedRows) {
    const candidate = snapshotCourses.get(row.sourceCourseId);
    if (!candidate) fail(`Falta ${row.sourceCourseId} en el snapshot de Bedelías.`);
    if (candidate.name !== row.bedeliasName || Number(candidate.credits) !== Number(row.bedeliasCredits)) {
      fail(`La correspondencia Bedelías cambió para ${row.sourceCourseId}.`);
    }
  }

  const trajectory = source.trajectories[0];
  const placements = trajectory.periods.flatMap((period) => period.courseIds.map((courseId) => ({
    period: period.label,
    courseId,
  })));
  const rowByIdentity = new Map(source.rows.map((row) => [row.sourceCourseId ?? row.identityKey, row]));
  if (trajectory.periods.length !== source.publication.semesterCount
    || placements.length !== source.rows.length
    || new Set(placements.map(({ courseId }) => courseId)).size !== source.rows.length) {
    fail("La trayectoria debe contener seis períodos y las veinte actividades una sola vez.");
  }
  for (const placement of placements) {
    const row = rowByIdentity.get(placement.courseId);
    if (!row || row.period !== placement.period) fail(`Ubicación inconsistente para ${placement.courseId}.`);
  }
  const periodCredits = trajectory.periods.map((period) => period.courseIds.reduce((sum, courseId) => (
    sum + Number(rowByIdentity.get(courseId)?.credits ?? 0)
  ), 0));
  if (periodCredits.some((credits) => credits !== source.publication.creditsPerSemester)
    || periodCredits.reduce((sum, credits) => sum + credits, 0) !== source.publication.minimumCredits) {
    fail(`Las cargas semestrales deben ser 40 y sumar 240; se obtuvo ${periodCredits.join(", ")}.`);
  }
  const finalRow = source.rows.find(({ sourceCourseId }) => sourceCourseId === source.publication.titleRequirement.requiredActivityId);
  if (!finalRow?.titleRequirement || finalRow.period !== "Sexto semestre" || !/después del sexto/.test(finalRow.layoutPlacement)) {
    fail("El Trabajo Final debe conservar su ubicación visual, su cómputo en el sexto tramo y su rol en el título.");
  }
  const optionRows = source.rows.filter(({ electiveSlot }) => electiveSlot);
  if (optionRows.length !== 2 || source.authorityPolicy.optionalSlotsBecomeCumulativeRequirements !== false) {
    fail("Los dos seminarios opcionales deben permanecer como espacios no acumulativos.");
  }
  return {
    verifiedSnapshotCourses: matchedIds.size,
    sourceOnlyCourses: sourceOnlyIds.size,
    candidateCourses: candidateIds.size,
    periodCredits,
  };
}

const source = await readJson(sourcePath);
const snapshot = await readJson(snapshotPath);
const validation = validateSource(source, snapshot);
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const projection = await readJson(projectionPath);
const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);

if (inventoryEntry?.state !== "official-trajectory-reproduced"
  || inventoryEntry.evidence?.expectedCoursePlacements !== source.rows.length
  || inventoryEntry.evidence?.matchedCoursePlacements !== source.rows.length) {
  fail("El inventario no confirmó la correspondencia exacta de la trayectoria D03ac.");
}
if (projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified").length !== validation.verifiedSnapshotCourses + validation.sourceOnlyCourses
  || projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length !== validation.candidateCourses) {
  fail("La proyección no conserva la frontera de veinte verificadas y cinco candidatas.");
}
const sourceOnlyProjected = projection.courses.filter(({ id }) => source.authorityPolicy.verifiedSourceOnlyIdentityKeys
  .some((identityKey) => id.endsWith(`-${identityKey}`)));
if (sourceOnlyProjected.length !== validation.sourceOnlyCourses
  || sourceOnlyProjected.some((course) => course.bedeliasCode || course.sourceCourseId || course.equivalentCourseIds || course.equivalentBedeliasCodes)) {
  fail("La proyección inventó código o equivalencia para una actividad sólo-fuente.");
}

console.log(`D03ac regenerado: ${validation.verifiedSnapshotCourses} correspondencias Bedelías, ${validation.sourceOnlyCourses} actividades sólo-fuente, ${validation.candidateCourses} candidatas y seis tramos de ${validation.periodCredits.join("/")} créditos; ${report.counts.generatedPlans} planes e inventario actualizados.`);
