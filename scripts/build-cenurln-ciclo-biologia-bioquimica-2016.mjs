#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "data", "cenurln", "ciclo-biologia-bioquimica-2016.json");
const snapshotPath = path.join(projectRoot, "data", "bedelias", "cenurln-ciclo-en-biologia-bioquimica-2016.json");

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };

function validateSource(source, snapshot) {
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  if (source.planId !== "bedelias-cenurln-ciclo-en-biologia-bioquimica-2016") {
    fail("El artefacto normalizado no corresponde al plan D03z.");
  }
  if (source.publication.minimumCredits !== 90 || source.scope.campuses.length !== 2) {
    fail("El alcance normalizado debe conservar 90 créditos y las sedes Salto/Paysandú.");
  }

  const snapshotCourses = new Map((snapshot.plan?.courses ?? []).map((course) => [course.code, course]));
  const rowIds = new Set();
  for (const row of source.rows) {
    if (rowIds.has(row.sourceCourseId)) fail(`Identidad curricular duplicada: ${row.sourceCourseId}.`);
    rowIds.add(row.sourceCourseId);
    const candidate = snapshotCourses.get(row.sourceCourseId);
    if (!candidate) fail(`Falta ${row.sourceCourseId} en el snapshot de Bedelías.`);
    if (candidate.name !== row.bedeliasName || Number(candidate.credits) !== Number(row.credits)) {
      fail(`La correspondencia Bedelías cambió para ${row.sourceCourseId}.`);
    }
  }

  const trajectoryRows = source.trajectories.flatMap((trajectory) => trajectory.periods.flatMap((period) => (
    period.courseIds.map((courseId) => ({ period: period.label, courseId }))
  )));
  if (trajectoryRows.length !== source.rows.length) fail("La trayectoria y las filas normalizadas no tienen la misma cobertura.");
  for (const placement of trajectoryRows) {
    const row = source.rows.find(({ sourceCourseId }) => sourceCourseId === placement.courseId);
    if (!row || row.period !== placement.period) fail(`Período inconsistente para ${placement.courseId}.`);
  }

  const publishedCredits = source.rows.reduce((sum, row) => sum + Number(row.credits), 0);
  if (publishedCredits !== source.publication.minimumCredits) {
    fail(`La currícula cotejada suma ${publishedCredits} créditos y no ${source.publication.minimumCredits}.`);
  }
  for (const requirement of source.requirements) {
    const credits = source.rows
      .filter((row) => row.requirementId === requirement.id)
      .reduce((sum, row) => sum + Number(row.credits), 0);
    if (credits < requirement.minCredits) fail(`La currícula no alcanza el mínimo de ${requirement.name}.`);
  }

  const verifiedIds = new Set(source.authorityPolicy.verifiedSourceCourseIds);
  if (verifiedIds.size !== source.rows.length || source.rows.some((row) => !verifiedIds.has(row.sourceCourseId))) {
    fail("La frontera verified/candidate no coincide con las filas oficiales.");
  }
  return {
    verifiedCourses: verifiedIds.size,
    candidateCourses: [...snapshotCourses.keys()].filter((id) => !verifiedIds.has(id)).length,
    publishedCredits,
  };
}

const source = await readJson(sourcePath);
const snapshot = await readJson(snapshotPath);
const validation = validateSource(source, snapshot);
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
if (inventoryEntry?.state !== "official-trajectory-reproduced") {
  fail("El inventario no confirmó la correspondencia exacta de la trayectoria D03z.");
}

console.log(`D03z regenerado: ${validation.verifiedCourses} unidades verificadas, ${validation.candidateCourses} candidatas, ${validation.publishedCredits} créditos; ${report.counts.generatedPlans} planes e inventario actualizados.`);
