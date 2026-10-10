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
const sourcePath = path.join(projectRoot, "data", "cur", "educacion-fisica-practicas-educativas-2014.json");
const snapshotPath = path.join(projectRoot, "data", "bedelias", "cur-licenciatura-en-educacion-fisica-2014.json");
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", "bedelias-cur-licenciatura-en-educacion-fisica-2014.json");

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const digestFile = async (filePath) => `sha256:${createHash("sha256").update(await readFile(filePath)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };

function compositionCourses(snapshot) {
  const courses = [];
  const visit = (node) => {
    if (node?.nodeType === "Materia") courses.push(node.course);
    for (const child of node?.children ?? []) visit(child);
  };
  visit(snapshot.plan?.composition);
  return courses;
}

async function validateSource(source, snapshot) {
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  if (source.planId !== "bedelias-cur-licenciatura-en-educacion-fisica-2014") {
    fail("El artefacto normalizado no corresponde al plan D03ag.");
  }
  if (source.publication.durationMonths !== 48
    || source.publication.semesterCount !== 8
    || source.publication.annualActivityCount !== 3
    || source.publication.minimumCredits !== 360
    || source.publication.mandatoryCredits !== 304
    || source.publication.optionalCredits !== 56
    || source.scope.campuses.length !== 1
    || source.scope.campuses[0].id !== "rivera") {
    fail("El alcance debe conservar 48 meses, ocho semestres, tres actividades anuales, 304 + 56 créditos y sede Rivera.");
  }
  if (await digestFile(snapshotPath) !== source.bedeliasComparison.snapshotContentHash) {
    fail("El snapshot de Bedelías cambió desde el cotejo versionado.");
  }

  const composition = compositionCourses(snapshot);
  const verifiedIds = new Set(source.authorityPolicy.verifiedBedeliasSourceCourseIds);
  const uniqueCodes = new Set(composition.map(({ code }) => code));
  const matchedEntries = composition.filter(({ code }) => verifiedIds.has(code));
  const candidateEntries = composition.filter(({ code }) => !verifiedIds.has(code));
  if (composition.length !== source.bedeliasComparison.compositionEntryCount
    || uniqueCodes.size !== source.bedeliasComparison.uniqueSourceCourseCodeCount
    || matchedEntries.length !== source.bedeliasComparison.verifiedCourseCount
    || candidateEntries.length !== source.bedeliasComparison.candidateRetainedCount) {
    fail("Los conteos del cotejo no coinciden con la composición Bedelías guardada.");
  }
  for (const id of verifiedIds) {
    const matches = composition.filter(({ code }) => code === id);
    if (matches.length !== 1) fail(`${id} debe corresponder a una única entrada Bedelías.`);
  }

  const rowById = new Map(source.rows.map((row) => [row.sourceCourseId, row]));
  if (rowById.size !== 33 || verifiedIds.size !== 33 || source.rows.some((row) => !verifiedIds.has(row.sourceCourseId))) {
    fail("La frontera oficial debe contener exactamente las 33 unidades obligatorias.");
  }
  for (const row of source.rows) {
    const matched = composition.find(({ code }) => code === row.sourceCourseId);
    if (!matched || Number(matched.credits) !== row.credits) {
      fail(`La correspondencia Bedelías cambió para ${row.sourceCourseId}.`);
    }
  }

  const trajectory = source.trajectories[0];
  const placements = trajectory.periods.flatMap((period) => period.courseIds.map((courseId) => ({
    period: period.label,
    courseId,
  })));
  if (trajectory.periods.length !== 11
    || placements.length !== source.rows.length
    || new Set(placements.map(({ courseId }) => courseId)).size !== source.rows.length) {
    fail("La trayectoria debe contener ocho semestres, tres períodos anuales y 33 ubicaciones únicas.");
  }
  for (const placement of placements) {
    const row = rowById.get(placement.courseId);
    if (!row || row.period !== placement.period) fail(`Ubicación inconsistente para ${placement.courseId}.`);
  }
  if (source.rows.filter(({ annual }) => annual).length !== 3) {
    fail("Las tres prácticas docentes deben conservarse como actividades anuales únicas.");
  }

  const areaCredits = Object.fromEntries(source.requirements.map(({ id }) => [
    id,
    source.rows.filter(({ requirementId }) => requirementId === id).reduce((sum, row) => sum + row.credits, 0),
  ]));
  for (const requirement of source.requirements.filter(({ id }) => id !== "optional")) {
    if (areaCredits[requirement.id] !== requirement.minCredits) {
      fail(`Los créditos obligatorios de ${requirement.id} no cierran con el Plan.`);
    }
  }
  if (source.rows.reduce((sum, row) => sum + row.credits, 0) !== source.publication.mandatoryCredits) {
    fail("Las 33 unidades obligatorias deben sumar exactamente 304 créditos, sin duplicar anuales.");
  }
  return { candidateEntries: candidateEntries.length, areaCredits };
}

const source = await readJson(sourcePath);
const snapshot = await readJson(snapshotPath);
const validation = await validateSource(source, snapshot);
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const projection = await readJson(projectionPath);
const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);

if (inventoryEntry?.state !== "official-trajectory-reproduced"
  || inventoryEntry.evidence?.expectedCoursePlacements !== source.rows.length
  || inventoryEntry.evidence?.matchedCoursePlacements !== source.rows.length) {
  fail("El inventario no confirmó la correspondencia exacta de la trayectoria D03ag.");
}
const projectedVerified = projection.courses.filter(({ authorityStatus, bedeliasCode }) => authorityStatus === "verified" && bedeliasCode);
const projectedCandidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
if (projectedVerified.length !== source.rows.length || projectedCandidates.length !== validation.candidateEntries) {
  fail("La proyección no conserva la frontera de 33 correspondencias y 406 candidatas.");
}
const projectedRows = new Map(projectedVerified.map((course) => [course.bedeliasCode, course]));
for (const row of source.rows) {
  const course = projectedRows.get(row.sourceCourseId);
  if (!course
    || course.name !== row.officialLabel
    || course.credits !== row.credits
    || !course.eligibleRequirementIds.includes(row.requirementId)) {
    fail(`La proyección perdió identidad, créditos o área de ${row.sourceCourseId}.`);
  }
}
const projectedPeriods = projection.publishedPathways.bedelias.periods;
if (JSON.stringify(projectedPeriods.map(({ label }) => label)) !== JSON.stringify(source.trajectories[0].periods.map(({ label }) => label))
  || projectedPeriods.flatMap(({ courseIds }) => courseIds).length !== source.rows.length) {
  fail("La proyección publicada no conserva los once períodos y las 33 ubicaciones oficiales.");
}
const publishedIds = new Set([
  ...projectedPeriods.flatMap(({ courseIds }) => courseIds),
  ...(projection.publishedPathways.bedelias.catalogCourseIds ?? []),
]);
if (projectedCandidates.some(({ id }) => publishedIds.has(id))) {
  fail("Una candidata de Bedelías alcanzó la trayectoria o el catálogo publicados.");
}
const completionValidation = projection.creditStructure.credentials[0].requiredCourseGroups
  .find(({ id }) => id === "validacion-final-plan");
if (!completionValidation || completionValidation.minCompleted !== 1
  || projectedPeriods.some(({ label }) => label === "Validación de egreso")) {
  fail("La validación manual de egreso debe conservarse como requisito, no como período curricular.");
}

console.log(`D03ag regenerado: 11 períodos oficiales, 33 ubicaciones únicas, 304 créditos obligatorios, 56 opcionales y ${validation.candidateEntries} candidatas ocultas; Validación de egreso queda sólo como requisito. ${report.counts.generatedPlans} planes e inventario actualizados.`);
