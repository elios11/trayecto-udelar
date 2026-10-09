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
const sourcePath = path.join(projectRoot, "data", "cenurln", "ciencias-sociales-2009.json");
const snapshotPath = path.join(projectRoot, "data", "bedelias", "cenurln-licenciatura-en-ciencias-sociales-2009.json");
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", "bedelias-cenurln-licenciatura-en-ciencias-sociales-2009.json");

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };
const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es-UY")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const moduleGroupPrefix = new Map([
  ["perspectivas", "4408 -"],
  ["metodologia", "4633 -"],
  ["procesos", "5258 -"],
  ["region", "4547 -"],
  ["talleres", "4438 -"],
  ["monografia", "5016 -"],
]);

function validateSource(source, snapshot) {
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  if (source.planId !== "bedelias-cenurln-licenciatura-en-ciencias-sociales-2009") {
    fail("El artefacto normalizado no corresponde al plan D03ab.");
  }
  if (source.publication.identityStatus !== "confirmed-plan-2009"
    || source.sourcePortions.identityResolution.acceptedPlanYear !== "2009") {
    fail("La resolución de identidad debe conservar Plan 2009.");
  }
  if (source.publication.trajectoryStatus !== "research-pending"
    || source.authorityPolicy.allowHistoricalGridProjection !== false
    || source.authorityPolicy.verifiedSourceCourseIds.length !== 0) {
    fail("La grilla histórica no puede proyectarse como trayectoria vigente.");
  }

  const { approvedCreditStructure, recoveredHistoricalGrid } = source.sourcePortions;
  const initialCredits = approvedCreditStructure.initialCycle.modules.reduce((sum, module) => sum + module.credits, 0);
  const advancedCredits = approvedCreditStructure.advancedCycle.modules.reduce((sum, module) => sum + module.credits, 0);
  if (initialCredits !== 120 || advancedCredits !== 240 || initialCredits + advancedCredits !== 360) {
    fail("La estructura normativa debe conservar 120 + 240 = 360 créditos.");
  }
  const periodTotals = recoveredHistoricalGrid.periods.map((period) => period.courses.reduce((sum, course) => sum + course.credits, 0));
  if (JSON.stringify(periodTotals) !== JSON.stringify(recoveredHistoricalGrid.semesterCreditTotals)
    || periodTotals.reduce((sum, credits) => sum + credits, 0) !== 210
    || recoveredHistoricalGrid.finalWork.credits !== 30) {
    fail("Los totales de la malla histórica deben conservar 210 créditos semestrales y 30 de monografía.");
  }
  const historicalPlacements = recoveredHistoricalGrid.periods.flatMap(({ courses }) => courses);
  if (recoveredHistoricalGrid.status !== "historical-official-current-validity-unresolved"
    || recoveredHistoricalGrid.periods.length !== 6
    || historicalPlacements.length !== 27) {
    fail("La grilla recuperada debe permanecer histórica, con seis períodos y 27 ubicaciones.");
  }

  const snapshotCourses = snapshot.plan?.courses ?? [];
  if (snapshot.contentHash !== source.bedeliasComparison.snapshotContentHash.replace("sha256:", "")
    || snapshotCourses.length !== 425
    || source.bedeliasComparison.snapshotCourseCount !== 425
    || source.bedeliasComparison.candidateRetainedCount !== 425
    || source.bedeliasComparison.promotedCourseCount !== 0) {
    fail("La frontera de 425 candidatas no coincide con el snapshot de Bedelías.");
  }
  const matches = source.bedeliasComparison.exactHistoricalMatches;
  if (matches.length !== 15 || new Set(matches.map(({ sourceCourseId }) => sourceCourseId)).size !== matches.length) {
    fail("Las coincidencias históricas exactas deben ser 15 identidades únicas.");
  }
  for (const match of matches) {
    const candidates = snapshotCourses.filter(({ code }) => code === match.sourceCourseId);
    if (candidates.length !== 1) fail(`La identidad ${match.sourceCourseId} no es única en Bedelías.`);
    const [candidate] = candidates;
    if (normalize(candidate.name) !== normalize(match.sourceName) || Number(candidate.credits) !== Number(match.credits)) {
      fail(`Cambió la coincidencia histórica exacta ${match.sourceCourseId}.`);
    }
    const expectedGroupPrefix = moduleGroupPrefix.get(match.moduleId);
    if (!expectedGroupPrefix || !candidate.curriculumPaths.some((curriculumPath) => curriculumPath.some((segment) => segment.startsWith(expectedGroupPrefix)))) {
      fail(`${match.sourceCourseId} no conserva el módulo administrativo ${match.moduleId}.`);
    }
  }
  return { historicalPlacements: historicalPlacements.length, exactHistoricalMatches: matches.length };
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

if (inventoryEntry?.state !== "research-pending"
  || inventoryEntry.currentProjection.primary !== "administrative-composition"
  || inventoryEntry.evidence.kind !== "insufficient-current-trajectory-evidence"
  || inventoryEntry.evidence.promotedCourseCount !== 0
  || inventoryEntry.evidence.candidateRetainedCount !== 425) {
  fail("El inventario no conservó el checkpoint research-pending de D03ab.");
}
if (projection.courses.length !== 425
  || projection.courses.some(({ authorityStatus }) => authorityStatus !== "candidate")
  || projection.publishedPathways?.bedelias?.periods?.length !== 0) {
  fail("La proyección promovió materias o períodos sin evidencia vigente.");
}
if (projection.source.reviewedAt !== source.reviewedAt) {
  fail("La proyección no conserva la fecha de la auditoría D03ab.");
}

console.log(`D03ab regenerado: Plan 2009 confirmado; ${validation.historicalPlacements} ubicaciones históricas y ${validation.exactHistoricalMatches} coincidencias exactas no promovidas; 425 candidatas y research-pending conservados; ${report.counts.generatedPlans} planes e inventario actualizados.`);
