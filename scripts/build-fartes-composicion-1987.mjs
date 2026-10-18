#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "data", "fartes", "composicion-1987.json");
const snapshotPath = path.join(projectRoot, "data", "bedelias", "fartes-licenciatura-en-composicion-1987.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", "bedelias-fartes-licenciatura-en-composicion-1987.json");

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const hash = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };

function collectMatterNodes(node, output = []) {
  if (Array.isArray(node)) {
    for (const child of node) collectMatterNodes(child, output);
    return output;
  }
  if (!node || typeof node !== "object") return output;
  if (node.nodeType === "Materia") output.push(node);
  for (const value of Object.values(node)) collectMatterNodes(value, output);
  return output;
}

function validateSource(source, snapshot, audits) {
  if (source.fingerprint?.value !== hash(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  if (source.planId !== "bedelias-fartes-licenciatura-en-composicion-1987"
    || source.auditIdentity !== "licenciatura en composicion:1987") {
    fail("El artefacto normalizado no corresponde al plan D03as.");
  }
  if (source.publication.trajectoryStatus !== "research-pending"
    || source.authorityPolicy.allowSecondaryGridProjection !== false
    || source.authorityPolicy.verifiedSourceCourseIds.length !== 0) {
    fail("La reconstrucción secundaria no puede proyectarse como trayectoria oficial.");
  }

  const grid = source.sourcePortions.secondaryHistoricalGrid;
  const placements = grid.periods.flatMap(({ courses }) => courses);
  if (grid.status !== "secondary-reconstruction-original-authority-unavailable"
    || grid.periods.length !== 7
    || placements.length !== 38
    || grid.creditsPublished !== false
    || grid.courseCodesPublished !== false
    || grid.originalAuthorityRecords.length !== 2) {
    fail("La reconstrucción secundaria debe conservar siete años, 38 ubicaciones, cero créditos/códigos publicados y dos expedientes pendientes.");
  }
  if (!grid.originalAuthorityRecords.some((record) => record.includes("2642/87"))
    || !grid.originalAuthorityRecords.some((record) => record.includes("7704/87"))) {
    fail("No se conservaron las identidades de los expedientes originales.");
  }
  if (source.sources.some(({ trajectoryEvidence }) => trajectoryEvidence === true)
    || !source.sourceExclusions.some(({ source: name }) => name.includes("Plan 2005"))) {
    fail("La evidencia debe mantener el Plan 2005 excluido y ninguna fuente como trayectoria primaria.");
  }

  const matters = collectMatterNodes(snapshot.plan);
  if (snapshot.contentHash !== source.bedeliasComparison.snapshotContentHash.replace("sha256:", "")
    || matters.length !== 129
    || source.bedeliasComparison.snapshotMatterCount !== 129
    || source.bedeliasComparison.candidateRetainedCount !== 129
    || source.bedeliasComparison.promotedCourseCount !== 0) {
    fail("La frontera de 129 candidatas no coincide con el snapshot de Bedelías.");
  }

  const audit = audits.audits.find(({ identity }) => identity === source.auditIdentity);
  if (!audit
    || audit.reviewedAt !== source.reviewedAt
    || audit.bedeliasComparison.compositionMatterCount !== 129
    || !audit.anomalies.some(({ field }) => field === "trajectory")) {
    fail("La auditoría oficial no conserva el checkpoint de investigación D03as.");
  }
  return placements.length;
}

const source = await readJson(sourcePath);
const snapshot = await readJson(snapshotPath);
const audits = await readJson(auditsPath);
const placements = validateSource(source, snapshot, audits);

audits.contentHash = officialAuditRegistryHash(audits);
await writeFile(auditsPath, `${JSON.stringify(audits, null, 2)}\n`, "utf8");
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();

const projection = await readJson(projectionPath);
const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
const candidateIds = candidates.map(({ id }) => id).sort();
const administrativeYears = projection.pathways.bedelias.periods
  .filter(({ label }) => /^(PRIMER|SEGUNDO|TERCER|CUARTO|QUINTO|SEXTO|SEPTIMO) AÑO$/.test(label));

if (inventoryEntry?.state !== "research-pending"
  || inventoryEntry.currentProjection.primary !== "administrative-composition"
  || inventoryEntry.evidence.kind !== "insufficient-primary-trajectory-evidence"
  || inventoryEntry.evidence.promotedCourseCount !== 0
  || inventoryEntry.evidence.candidateRetainedCount !== 129) {
  fail("El inventario no conservó el checkpoint research-pending de D03as.");
}
if (projection.courses.length !== 130
  || candidates.length !== 129
  || candidates.some(({ credits }) => credits !== 0)
  || verified.length !== 1
  || verified[0].id !== "fartes-validacion-final-plan"
  || verified[0].credits !== 0
  || new Set(projection.courses.map(({ id }) => id)).size !== projection.courses.length
  || hash(candidateIds) !== source.bedeliasComparison.candidateCourseIdsHash) {
  fail("La proyección alteró estados, créditos o IDs recuperables del Plan 1987.");
}
if (administrativeYears.length !== 7
  || projection.publishedPathways.bedelias.periods.length !== 1
  || projection.publishedPathways.bedelias.periods[0].label !== "Validación de egreso"
  || projection.publishedPathways.bedelias.periods[0].courseIds.some((id) => candidateIds.includes(id))) {
  fail("La composición administrativa no debe publicarse como períodos verificados.");
}
if (projection.source.reviewedAt !== source.reviewedAt) {
  fail("La proyección no conserva la fecha de la auditoría D03as.");
}

console.log(`D03as regenerado: ${placements} ubicaciones secundarias no promovidas; 129 candidatas, cero créditos y research-pending conservados; ${report.counts.generatedPlans} planes e inventario actualizados.`);
