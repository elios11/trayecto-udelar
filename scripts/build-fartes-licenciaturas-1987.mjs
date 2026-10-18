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
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");

const plans = [
  {
    name: "Dirección Coral",
    slug: "direccion-coral",
    planId: "bedelias-fartes-licenciatura-en-direccion-coral-1987",
    auditIdentity: "licenciatura en direccion coral:1987",
    periodLengths: [8, 7, 6, 6, 6, 3, 3],
    candidateCount: 122,
    projectionCourseCount: 123,
    snapshotHash: "b579a1b36649734ca8efbe8f8f30aca01fb368381824053deb5a513fb5bc318a",
    candidateIdsHash: "sha256:c1bccfdfaf2d493c87932d66d03019e4ab72a48f1cf9898d92e4d66048739983",
  },
  {
    name: "Dirección Orquestal",
    slug: "direccion-orquestal",
    planId: "bedelias-fartes-licenciatura-en-direccion-orquestal-1987",
    auditIdentity: "licenciatura en direccion orquestal:1987",
    periodLengths: [8, 5, 6, 6, 5, 4, 4],
    candidateCount: 119,
    projectionCourseCount: 120,
    snapshotHash: "ca0b1c35891fc73ac1a9f7368ce8ff80279440ae2be7163fff0e85673dce8198",
    candidateIdsHash: "sha256:42333bf4b3aa835d8b28c02a3c8c66acab476c2b47f50e257b7ace3f402de624",
  },
  {
    name: "Musicología",
    slug: "musicologia",
    planId: "bedelias-fartes-licenciatura-en-musicologia-1987",
    auditIdentity: "licenciatura en musicologia:1987",
    periodLengths: [7, 6, 6, 6],
    candidateCount: 144,
    projectionCourseCount: 145,
    snapshotHash: "277b8f04ed02cbaec3e0e49c7e2f2184aca44703d6a416b23e67182aa7a869e2",
    candidateIdsHash: "sha256:108b30369b448268b1aeb2174315bbb94da1675fd164f25e125fbee7da8d26a4",
  },
];

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

function sourcePathFor(plan) {
  return path.join(projectRoot, "data", "fartes", `${plan.slug}-1987.json`);
}

function snapshotPathFor(plan) {
  return path.join(projectRoot, "data", "bedelias", `fartes-licenciatura-en-${plan.slug}-1987.json`);
}

function projectionPathFor(plan) {
  return path.join(projectRoot, "app", "data", "bedelias-generated", `${plan.planId}.json`);
}

function validateSource(plan, source, snapshot, audits, reviews) {
  const prefix = `${plan.name}: `;
  if (source.fingerprint?.value !== hash(source.sourcePortions)) {
    fail(`${prefix}la huella de sourcePortions no coincide con la evidencia normalizada.`);
  }
  if (source.planId !== plan.planId || source.auditIdentity !== plan.auditIdentity) {
    fail(`${prefix}el artefacto normalizado no corresponde al plan esperado.`);
  }
  if (source.publication.trajectoryStatus !== "research-pending"
    || source.authorityPolicy.allowSecondaryGridProjection !== false
    || source.authorityPolicy.verifiedSourceCourseIds.length !== 0) {
    fail(`${prefix}la reconstrucción secundaria no puede proyectarse como trayectoria oficial.`);
  }

  const grid = source.sourcePortions.secondaryHistoricalGrid;
  const placements = grid.periods.flatMap(({ courses }) => courses);
  if (grid.status !== "secondary-reconstruction-original-authority-unavailable"
    || JSON.stringify(grid.periods.map(({ courses }) => courses.length)) !== JSON.stringify(plan.periodLengths)
    || placements.length !== plan.periodLengths.reduce((total, count) => total + count, 0)
    || grid.creditsPublished !== false
    || grid.courseCodesPublished !== false
    || grid.originalAuthorityRecords.length !== 2) {
    fail(`${prefix}la reconstrucción secundaria alteró sus años, filas o límites de carga y código.`);
  }
  if (!grid.originalAuthorityRecords.some((record) => record.includes("2642/87"))
    || !grid.originalAuthorityRecords.some((record) => record.includes("7704/87"))) {
    fail(`${prefix}no se conservaron las identidades de los expedientes originales.`);
  }
  if (source.sources.some(({ trajectoryEvidence }) => trajectoryEvidence === true)
    || !source.sourceExclusions.some(({ source: name }) => name.includes("Plan 2005"))
    || source.sourcePortions.institutionalSearch.status !== "primary-records-not-located") {
    fail(`${prefix}la evidencia debe conservar el Plan 2005 excluido y la búsqueda primaria abierta.`);
  }

  const matters = collectMatterNodes(snapshot.plan);
  if (snapshot.contentHash !== plan.snapshotHash
    || snapshot.contentHash !== source.bedeliasComparison.snapshotContentHash.replace("sha256:", "")
    || matters.length !== plan.candidateCount
    || source.bedeliasComparison.snapshotMatterCount !== plan.candidateCount
    || source.bedeliasComparison.candidateRetainedCount !== plan.candidateCount
    || source.bedeliasComparison.candidateCourseIdsHash !== plan.candidateIdsHash
    || source.bedeliasComparison.projectionCourseCount !== plan.projectionCourseCount
    || source.bedeliasComparison.promotedCourseCount !== 0) {
    fail(`${prefix}la frontera candidate/verified no coincide con el snapshot de Bedelías.`);
  }

  const audit = audits.audits.find(({ identity }) => identity === plan.auditIdentity);
  if (!audit
    || audit.reviewedAt !== source.reviewedAt
    || audit.bedeliasComparison.compositionMatterCount !== plan.candidateCount
    || !audit.anomalies.some(({ field }) => field === "trajectory")) {
    fail(`${prefix}la auditoría oficial no conserva el checkpoint de investigación.`);
  }
  const review = reviews.reviews.find(({ planId }) => planId === plan.planId);
  if (!review
    || review.state !== "research-pending"
    || review.reviewedAt !== source.reviewedAt
    || review.projectionMechanism !== "administrative-composition"
    || review.evidence.kind !== "insufficient-primary-trajectory-evidence"
    || review.evidence.secondaryGridPeriodCount !== plan.periodLengths.length
    || review.evidence.secondaryGridCoursePlacements !== placements.length
    || review.evidence.candidateRetainedCount !== plan.candidateCount
    || review.evidence.promotedCourseCount !== 0) {
    fail(`${prefix}la revisión oficial no conserva el checkpoint research-pending.`);
  }
  return placements.length;
}

function validateProjection(plan, source, projection, inventoryEntry) {
  const prefix = `${plan.name}: `;
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidateIds = candidates.map(({ id }) => id).sort();
  const administrativeYears = projection.pathways.bedelias.periods
    .filter(({ label }) => /^(PRIMER|SEGUNDO|TERCER|CUARTO|QUINTO|SEXTO|SEPTIMO) AÑO$/.test(label));

  if (inventoryEntry?.state !== "research-pending"
    || inventoryEntry.currentProjection.primary !== "administrative-composition"
    || inventoryEntry.evidence.kind !== "insufficient-primary-trajectory-evidence"
    || inventoryEntry.evidence.promotedCourseCount !== 0
    || inventoryEntry.evidence.candidateRetainedCount !== plan.candidateCount) {
    fail(`${prefix}el inventario no conservó el checkpoint research-pending.`);
  }
  if (projection.courses.length !== plan.projectionCourseCount
    || candidates.length !== plan.candidateCount
    || candidates.some(({ credits }) => credits !== 0)
    || verified.length !== 1
    || verified[0].id !== "fartes-validacion-final-plan"
    || verified[0].credits !== 0
    || new Set(projection.courses.map(({ id }) => id)).size !== projection.courses.length
    || hash(candidateIds) !== plan.candidateIdsHash) {
    fail(`${prefix}la proyección alteró estados, créditos o IDs recuperables.`);
  }
  if (administrativeYears.length !== plan.periodLengths.length
    || projection.publishedPathways.bedelias.periods.length !== 1
    || projection.publishedPathways.bedelias.periods[0].label !== "Validación de egreso"
    || projection.publishedPathways.bedelias.periods[0].courseIds.length !== 1
    || projection.publishedPathways.bedelias.periods[0].courseIds[0] !== "fartes-validacion-final-plan") {
    fail(`${prefix}la composición administrativa no debe publicarse como períodos verificados.`);
  }
  if (projection.source.reviewedAt !== source.reviewedAt) {
    fail(`${prefix}la proyección no conserva la fecha de la auditoría.`);
  }
}

const [audits, reviews] = await Promise.all([readJson(auditsPath), readJson(reviewsPath)]);
const normalizedPlans = [];
for (const plan of plans) {
  const [source, snapshot] = await Promise.all([
    readJson(sourcePathFor(plan)),
    readJson(snapshotPathFor(plan)),
  ]);
  const placements = validateSource(plan, source, snapshot, audits, reviews);
  normalizedPlans.push({ plan, source, placements });
}

if (new Set(normalizedPlans.map(({ source }) => source.planId)).size !== plans.length
  || new Set(normalizedPlans.map(({ source }) => source.auditIdentity)).size !== plans.length
  || normalizedPlans.some(({ source }) => JSON.stringify(source).includes("licenciatura-en-musica-2005"))) {
  fail("Los tres planes 1987 deben conservar IDs y evidencia separados del Plan 2005.");
}

audits.contentHash = officialAuditRegistryHash(audits);
await writeFile(auditsPath, `${JSON.stringify(audits, null, 2)}\n`, "utf8");
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();

for (const { plan, source } of normalizedPlans) {
  const projection = await readJson(projectionPathFor(plan));
  const inventoryEntry = inventory.plans.find(({ planId }) => planId === plan.planId);
  validateProjection(plan, source, projection, inventoryEntry);
}

const summary = normalizedPlans
  .map(({ plan, placements }) => `${plan.name}: ${placements} filas secundarias, ${plan.candidateCount} candidatas`)
  .join("; ");
console.log(`D03at regenerado sin promover grillas (${summary}); cero créditos y research-pending conservados; ${report.counts.generatedPlans} planes e inventario actualizados.`);
