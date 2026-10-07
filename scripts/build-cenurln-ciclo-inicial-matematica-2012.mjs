#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "data", "cenurln", "ciclo-inicial-matematica-2012.json");
const snapshotPath = path.join(projectRoot, "data", "bedelias", "cenurln-ciclo-inicial-de-matematica-2012.json");
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", "bedelias-cenurln-ciclo-inicial-de-matematica-2012.json");

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };

function validateSource(source, snapshot) {
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  if (source.planId !== "bedelias-cenurln-ciclo-inicial-de-matematica-2012") {
    fail("El artefacto normalizado no corresponde al plan D03aa.");
  }
  if (source.publication.trajectoryStatus !== "no-official-trajectory-documented") {
    fail("La auditoría debe conservar la ausencia documentada de secuencia oficial.");
  }
  if (source.publication.ownDurationMonths !== 12 || source.publication.accumulatedCioCimDurationMonths !== 24) {
    fail("La duración propia del CIM y el recorrido acumulado CIO-CT + CIM deben permanecer separados.");
  }

  const countableCredits = source.rows.reduce((sum, row) => sum + row.credits, 0);
  const countableMathematicsCredits = source.rows
    .filter(({ requirementId }) => requirementId === "matematica")
    .reduce((sum, row) => sum + row.credits, 0);
  const coverage = source.creditComputationCoverage;
  if (countableCredits !== 86
    || countableMathematicsCredits !== 86
    || coverage?.status !== "partial"
    || coverage.countableCredits !== countableCredits
    || coverage.countableMathematicsCredits !== countableMathematicsCredits
    || coverage.requiredCredits !== source.publication.minimumCredits
    || coverage.requiredMathematicsCredits !== source.requirements.find(({ id }) => id === "matematica")?.minCredits
    || coverage.manualValidationRequired !== true) {
    fail("La cobertura parcial del cómputo debe conservar 86 créditos matemáticos frente a 160 exigidos.");
  }

  const snapshotCourses = new Map((snapshot.plan?.courses ?? []).map((course) => [course.code, course]));
  const verifiedIds = new Set(source.authorityPolicy.verifiedSourceCourseIds);
  const candidateIds = new Set(source.bedeliasComparison.candidateSourceCourseIds);
  if (verifiedIds.size !== source.rows.length || source.rows.some(({ sourceCourseId }) => !verifiedIds.has(sourceCourseId))) {
    fail("La frontera verified no coincide con las filas propias del CIM.");
  }
  if (candidateIds.size !== source.bedeliasComparison.candidateRetainedCount) {
    fail("El conteo de candidatas no coincide con sus identidades.");
  }
  if (verifiedIds.size + candidateIds.size !== snapshotCourses.size) {
    fail("La auditoría no cubre todas las identidades del snapshot.");
  }
  for (const courseId of verifiedIds) {
    if (candidateIds.has(courseId)) fail(`La identidad ${courseId} no puede ser verificada y candidata a la vez.`);
  }
  for (const [courseId] of snapshotCourses) {
    if (!verifiedIds.has(courseId) && !candidateIds.has(courseId)) fail(`Falta cotejar ${courseId}.`);
  }
  for (const row of source.rows) {
    const candidate = snapshotCourses.get(row.sourceCourseId);
    if (!candidate) fail(`Falta ${row.sourceCourseId} en el snapshot de Bedelías.`);
    if (candidate.name !== row.bedeliasName || Number(candidate.credits) !== Number(row.bedeliasCredits)) {
      fail(`La correspondencia Bedelías cambió para ${row.sourceCourseId}.`);
    }
  }

  const sourceOnlyIds = new Set(source.officialSourceOnlyOptions.map(({ identityKey }) => identityKey));
  if (sourceOnlyIds.size !== source.officialSourceOnlyOptions.length || sourceOnlyIds.size !== source.authorityPolicy.verifiedSourceOnlyOptionCount) {
    fail("Las identidades sólo-fuente deben ser únicas y coincidir con su conteo declarado.");
  }
  if (source.officialSourceOnlyOptions.some((option) => "credits" in option || verifiedIds.has(option.identityKey) || snapshotCourses.has(option.identityKey))) {
    fail("Una opción sólo-fuente recibió carga o una correspondencia administrativa inventada.");
  }
  const [matchedPeriod, sourceOnlyPeriod] = source.fallbackPathway.periods;
  if (matchedPeriod.courseIds.length !== verifiedIds.size || matchedPeriod.courseIds.some((courseId) => !verifiedIds.has(courseId))) {
    fail("El fallback flexible debe mostrar una vez cada UC propia cotejada.");
  }
  if (sourceOnlyPeriod.courseIds.length !== sourceOnlyIds.size || sourceOnlyPeriod.courseIds.some((courseId) => !sourceOnlyIds.has(courseId))) {
    fail("El fallback flexible debe conservar una vez cada ejemplo opcional sólo-fuente.");
  }
  const fallbackIds = source.fallbackPathway.periods.flatMap(({ courseIds }) => courseIds);
  if (new Set(fallbackIds).size !== verifiedIds.size + sourceOnlyIds.size) {
    fail("El fallback flexible duplica o pierde identidades oficiales.");
  }
  if (source.scope.predecessor.sourceCourseIdsRetainedAsCandidates.some((courseId) => !candidateIds.has(courseId))) {
    fail("Una UC previa del CIO-CT fue promovida indebidamente dentro del CIM.");
  }
  return {
    verifiedSnapshotCourses: verifiedIds.size,
    sourceOnlyOptions: sourceOnlyIds.size,
    verifiedCourses: verifiedIds.size + sourceOnlyIds.size,
    candidateCourses: candidateIds.size,
  };
}

const source = await readJson(sourcePath);
const snapshot = await readJson(snapshotPath);
const validation = validateSource(source, snapshot);
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const projection = await readJson(projectionPath);
const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);

if (inventoryEntry?.state !== "no-official-trajectory-documented") {
  fail("El inventario no conservó la ausencia documentada de trayectoria del CIM.");
}
if (projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified").length !== validation.verifiedCourses) {
  fail("La proyección no conserva las UC cotejadas y las opciones sólo-fuente verificadas.");
}
if (projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length !== validation.candidateCourses) {
  fail("La proyección no conserva las 21 candidatas.");
}
if (JSON.stringify(projection.plan.creditComputationCoverage) !== JSON.stringify(source.creditComputationCoverage)) {
  fail("La proyección no conserva la cobertura parcial del cómputo del CIM.");
}
const sourceOnlyProjection = projection.courses.filter(({ catalogRole }) => catalogRole === "official-plan-example-option");
if (sourceOnlyProjection.length !== validation.sourceOnlyOptions
  || sourceOnlyProjection.some((course) => course.bedeliasCode || course.sourceCourseId || course.creditsPublished !== false || course.availabilityStatus !== "not-asserted-by-plan")) {
  fail("La proyección inventó código, carga u oferta vigente para una opción sólo-fuente.");
}

console.log(`D03aa regenerado: ${validation.verifiedSnapshotCourses} UC cotejadas, ${validation.sourceOnlyOptions} opciones oficiales sólo-fuente, ${validation.candidateCourses} candidatas y ausencia de secuencia documentada; ${report.counts.generatedPlans} planes e inventario actualizados.`);
