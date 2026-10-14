#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRegisteredPlanPresentation, GENERATED_PATHWAY_LABEL } from "../app/registered-plan-courses.mjs";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "data", "fcien", "astronomia-2016-trajectory-review.json");
const snapshotPath = path.join(projectRoot, "data", "bedelias", "fcien-licenciatura-en-astronomia-2016.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", "bedelias-fcien-licenciatura-en-astronomia-2016.json");

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };
const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es-UY")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();
const sameMembers = (actual, expected) => actual.length === expected.length
  && new Set(actual).size === actual.length
  && actual.every((value) => expected.includes(value));

function compositionMatterCount(node) {
  if (!node) return 0;
  return (node.nodeType === "Materia" ? 1 : 0)
    + (node.children ?? []).reduce((sum, child) => sum + compositionMatterCount(child), 0);
}

function validateSource(source, snapshot) {
  if (source.planId !== "bedelias-fcien-licenciatura-en-astronomia-2016") {
    fail("El artefacto normalizado no corresponde al plan D03ao.");
  }
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    if (source.fingerprint.sourceHashes?.[sourceId] !== digest(portion)) {
      fail(`La huella normalizada no coincide para ${sourceId}.`);
    }
  }
  if (source.publication.trajectoryStatus !== "research-pending"
    || source.scope.officialTemporalPeriodsReproduced !== 0
    || source.trajectoryConclusion.durationIsNotPeriodEvidence !== true
    || source.trajectoryConclusion.publicTemporalPeriods.length !== 0) {
    fail("La evidencia debe conservar research-pending sin períodos temporales inferidos.");
  }
  if (source.sources.find(({ id }) => id === "modified-plan-2023-link")?.accessStatus !== "http-404") {
    fail("Debe quedar registrado el HTTP 404 del enlace institucional modificado en 2023.");
  }

  const rootCredits = source.requirements.reduce((sum, requirement) => sum + requirement.minCredits, 0);
  if (rootCredits !== 360 || source.publication.minimumCredits !== 360 || source.publication.durationMonths !== 48) {
    fail("La evidencia debe conservar los 360 créditos y los 48 meses publicados.");
  }
  const training = source.requirements.find(({ id }) => id === "training-experiences");
  const flexible = source.requirements.find(({ id }) => id === "flexible");
  if (training.children.reduce((sum, requirement) => sum + requirement.minCredits, 0) !== 22
    || flexible.children.reduce((sum, requirement) => sum + requirement.minCredits, 0) !== 40
    || flexible.minCredits !== 50) {
    fail("Los mínimos internos de experiencias y flexibilidad cambiaron.");
  }

  const snapshotCourses = snapshot.plan?.courses ?? [];
  if (snapshot.contentHash !== source.bedeliasComparison.snapshotContentHash.replace("sha256:", "")
    || snapshotCourses.length !== source.bedeliasComparison.distinctSnapshotCourseRecords
    || compositionMatterCount(snapshot.plan?.composition) !== source.bedeliasComparison.compositionMatterEntries) {
    fail("El snapshot de Bedelías ya no coincide con los conteos auditados.");
  }
  for (const match of source.catalogMatches) {
    const candidates = snapshotCourses.filter(({ code }) => code === match.sourceCourseId);
    if (candidates.length !== 1) fail(`La identidad ${match.sourceCourseId} no es única en Bedelías.`);
    const [candidate] = candidates;
    if (normalize(candidate.name) !== normalize(match.bedeliasName) || Number(candidate.credits) !== Number(match.credits)) {
      fail(`Cambió la correspondencia exacta ${match.sourceCourseId}.`);
    }
  }
  if (!sameMembers(source.authorityPolicy.verifiedSourceCourseIds, source.catalogMatches.map(({ sourceCourseId }) => sourceCourseId))) {
    fail("La frontera de programas verificados no coincide con las correspondencias normalizadas.");
  }
}

function validateRegistry(source, audits, reviews) {
  const audit = audits.audits.find(({ identity }) => identity === source.auditIdentity);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  if (!audit || audit.reviewedAt !== source.reviewedAt
    || audit.conclusion?.trajectoryStatus !== "research-pending"
    || audit.conclusion?.trajectorySourceDataPath !== "data/fcien/astronomia-2016-trajectory-review.json") {
    fail("La auditoría no enlaza el checkpoint D03ao normalizado.");
  }
  const trajectory = audit.officialPlan?.trajectories?.find(({ id }) => id === source.projectionBaseline.pathwayId);
  if (!trajectory || trajectory.generatedFallback !== true
    || !sameMembers(trajectory.generatedFallbackCourseIds ?? [], source.projectionBaseline.generatedFallbackSourceCourseIds)) {
    fail("La auditoría perdió el fallback no temporal explícitamente generado.");
  }
  if (!review || review.state !== "research-pending"
    || review.reviewedAt !== source.reviewedAt
    || review.evidence?.kind !== "insufficient-current-trajectory-evidence"
    || review.evidence?.sourceDataPath !== "data/fcien/astronomia-2016-trajectory-review.json"
    || review.evidence?.publicTemporalPeriodCount !== 0) {
    fail("La revisión D03 no conserva el estado research-pending y su evidencia.");
  }
}

function validateProjection(source, projection, inventoryEntry) {
  if (!inventoryEntry || inventoryEntry.state !== "research-pending"
    || inventoryEntry.evidence?.kind !== "insufficient-current-trajectory-evidence"
    || inventoryEntry.evidence?.sourceDataPath !== "data/fcien/astronomia-2016-trajectory-review.json"
    || inventoryEntry.evidence?.publicTemporalPeriodCount !== 0) {
    fail("El inventario no conservó el checkpoint research-pending de D03ao.");
  }
  if (projection.plan.minCredits !== 360 || projection.plan.durationMonths !== 48
    || projection.source.reviewedAt !== source.reviewedAt
    || projection.courses.length !== source.bedeliasComparison.projectedCourseRecords) {
    fail("La proyección perdió los metadatos o el conteo auditado.");
  }
  const realVerified = projection.courses
    .filter(({ authorityStatus, curricularBlock }) => authorityStatus === "verified" && curricularBlock !== true)
    .map(({ bedeliasCode }) => bedeliasCode);
  const validationBlocks = projection.courses.filter(({ authorityStatus, curricularBlock }) => (
    authorityStatus === "verified" && curricularBlock === true
  ));
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  if (!sameMembers(realVerified, source.authorityPolicy.verifiedSourceCourseIds)
    || validationBlocks.length !== source.bedeliasComparison.verifiedValidationBlockCount
    || candidates.length !== source.bedeliasComparison.candidateRetainedCount) {
    fail("La regeneración alteró la frontera de dos materias verificadas, un bloque y 184 candidatas.");
  }

  const pathway = projection.pathways[source.projectionBaseline.pathwayId];
  if (pathway?.generatedFallback !== true || !sameMembers(
    pathway.generatedFallbackCourseIds ?? [],
    realVerified.map((code) => projection.courses.find(({ bedeliasCode }) => bedeliasCode === code)?.id),
  )) {
    fail("La proyección perdió el fallback AS20/AS28.");
  }
  const presentation = buildRegisteredPlanPresentation(source.projectionBaseline.pathwayId, projection);
  if (!presentation.generated || presentation.label !== GENERATED_PATHWAY_LABEL || presentation.periods.length !== 1
    || presentation.periods.some(({ label }) => /semestre|año/i.test(label))) {
    fail("La presentación inventó períodos temporales o atribuyó el recorrido a la institución.");
  }
  const activeIds = presentation.periods.flatMap(({ courseIds }) => courseIds);
  if (!sameMembers(activeIds, pathway.generatedFallbackCourseIds)) {
    fail("La selección orientativa no conserva exactamente AS20 y AS28.");
  }
  const provisionalCourses = presentation.courses.filter(({ provisional }) => provisional === true);
  if (provisionalCourses.length !== candidates.length || provisionalCourses.some(({ eligibleRequirementIds, creditAllocations }) => (
    eligibleRequirementIds.length !== 0 || creditAllocations.length !== 0
  ))) {
    fail("Una candidata aporta indebidamente a los requisitos oficiales.");
  }
}

const source = await readJson(sourcePath);
const snapshot = await readJson(snapshotPath);
const audits = await readJson(auditsPath);
const reviews = await readJson(reviewsPath);
validateSource(source, snapshot);
validateRegistry(source, audits, reviews);
audits.contentHash = officialAuditRegistryHash(audits);
await writeJson(auditsPath, audits);
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const projection = await readJson(projectionPath);
validateProjection(source, projection, inventory.plans.find(({ planId }) => planId === source.planId));

console.log(`D03ao regenerado: 360 créditos, 0 períodos temporales oficiales, 2 materias verificadas, 184 candidatas y research-pending conservado; ${report.counts.generatedPlans} planes e inventario actualizados.`);
