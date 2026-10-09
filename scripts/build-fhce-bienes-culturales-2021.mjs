#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRegisteredPlanPresentation, GENERATED_PATHWAY_LABEL } from "../app/registered-plan-courses.mjs";
import { buildAndWriteAuditQueue } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "data", "fhce", "bienes-culturales-2021-trajectory-review.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", "bedelias-cenurso-tecnicatura-universitaria-en-bienes-culturales-2021.json");

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };
const sameMembers = (actual, expected) => actual.length === expected.length
  && new Set(actual).size === actual.length
  && actual.every((value) => expected.includes(value));

function validateSource(source) {
  if (source.planId !== "bedelias-cenurso-tecnicatura-universitaria-en-bienes-culturales-2021") {
    fail("El artefacto normalizado no corresponde al plan D03ad.");
  }
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    const expectedHash = digest(portion);
    if (source.fingerprint.sourceHashes?.[sourceId] !== expectedHash
      || source.sources.find(({ id }) => id === sourceId)?.contentHash !== expectedHash) {
      fail(`La huella normalizada no coincide para ${sourceId}.`);
    }
  }
  if (source.publication.trajectoryStatus !== "no-official-trajectory-documented"
    || source.publication.trajectoryPublicationState !== "announced-pending"
    || source.trajectoryConclusion.temporary !== true
    || !/Próximamente/.test(source.trajectoryConclusion.justification)) {
    fail("La evidencia debe conservar la ausencia temporal y explícitamente anunciada de la malla.");
  }
  if (!sameMembers(source.scope.campuses.map(({ id }) => id), ["colonia", "paysandu", "tacuarembo"])
    || !sameMembers(source.scope.mentions.map(({ id }) => id), ["historia-regional-y-local", "museologia", "patrimonio"])
    || source.scope.singlePlan !== true || source.scope.singleCredential !== true || source.scope.sharedProgress !== true) {
    fail("El alcance debe conservar un plan, un título, progreso compartido, tres sedes y tres menciones.");
  }
  const sums = source.creditTable.rows.reduce((totals, row) => ({
    general: totals.general + row.general,
    specific: totals.specific + row.specific,
    electives: totals.electives + row.electives,
    integrated: totals.integrated + row.integrated,
    total: totals.total + row.total,
  }), { general: 0, specific: 0, electives: 0, integrated: 0, total: 0 });
  if (JSON.stringify(sums) !== JSON.stringify(source.creditTable.totals)
    || sums.total !== 200
    || source.creditTable.notes.integratedDistributionTentative !== true
    || source.creditTable.notes.integratedActivitiesAccreditableAtAnyTime !== true
    || source.creditTable.notes.modernLanguageAccreditableAtAnyTime !== true) {
    fail("El cuadro visualmente cotejado debe conservar los 200 créditos y sus notas de flexibilidad.");
  }
  if (!sameMembers(source.sources.find(({ id }) => id === "fhce-plan-2021")?.visuallyInspectedPages ?? [], [9, 10])) {
    fail("Deben quedar registradas las páginas 9 y 10 inspeccionadas visualmente.");
  }
  const verifiedIds = source.projectionBaseline.verifiedCourseIds;
  const candidateIds = source.projectionBaseline.candidateCourseIds;
  if (verifiedIds.length !== 1 || candidateIds.length !== 63 || !sameMembers([...verifiedIds, ...candidateIds], [...new Set([...verifiedIds, ...candidateIds])])) {
    fail("La frontera auditable debe conservar una identidad verificada y 63 candidatas sin duplicados.");
  }
  for (const pathwayId of source.projectionBaseline.pathwayIds) {
    const fallbackIds = source.projectionBaseline.fallbackCoreByPathway[pathwayId];
    if (!Array.isArray(fallbackIds) || fallbackIds.length === 0 || fallbackIds.some((id) => !candidateIds.includes(id))) {
      fail(`El fallback ${pathwayId} debe usar sólo candidatas auditadas de Bedelías.`);
    }
  }
  return { verifiedIds, candidateIds };
}

function validateRegistry(source, audits, reviews) {
  const audit = audits.audits.find(({ identity }) => identity === source.auditIdentity);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  if (!audit || audit.reviewedAt !== source.reviewedAt
    || audit.conclusion?.trajectoryStatus !== "no-official-trajectory-documented"
    || audit.conclusion?.trajectorySourceDataPath !== "data/fhce/bienes-culturales-2021-trajectory-review.json") {
    fail("La auditoría no enlaza la conclusión D03ad normalizada.");
  }
  for (const trajectory of audit.officialPlan.trajectories ?? []) {
    if (trajectory.generatedFallback !== true
      || !sameMembers(trajectory.generatedFallbackCourseIds ?? [], source.projectionBaseline.fallbackCoreByPathway[trajectory.id] ?? [])) {
      fail(`La mención ${trajectory.id} perdió su fallback explícitamente generado.`);
    }
  }
  if (!review || review.state !== "no-official-trajectory-documented"
    || review.reviewedAt !== source.reviewedAt
    || review.evidence?.kind !== "documented-absence"
    || review.evidence?.sourceDataPath !== "data/fhce/bienes-culturales-2021-trajectory-review.json"
    || !/Próximamente/.test(review.evidence.justification)) {
    fail("La revisión D03 debe conservar fuente, fecha y justificación explícita de la ausencia actual.");
  }
}

function validateProjection(source, projection, inventoryEntry, baseline) {
  if (!inventoryEntry || inventoryEntry.state !== "no-official-trajectory-documented"
    || inventoryEntry.evidence?.kind !== "documented-absence") {
    fail("El inventario no conservó la ausencia documentada de trayectoria.");
  }
  if (!sameMembers(Object.keys(projection.pathways), source.projectionBaseline.pathwayIds)
    || !sameMembers(projection.campuses.map(({ id }) => id), source.projectionBaseline.campusIds)) {
    fail("La proyección perdió una mención o sede del único Plan 2021.");
  }
  const verifiedIds = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified").map(({ id }) => id);
  const candidateIds = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").map(({ id }) => id);
  if (!sameMembers(verifiedIds, baseline.verifiedIds) || !sameMembers(candidateIds, baseline.candidateIds)) {
    fail("La regeneración alteró IDs o la frontera de una verificada y 63 candidatas.");
  }
  for (const pathwayId of source.projectionBaseline.pathwayIds) {
    const pathway = projection.pathways[pathwayId];
    if (pathway.generatedFallback !== true
      || !sameMembers(pathway.generatedFallbackCourseIds ?? [], source.projectionBaseline.fallbackCoreByPathway[pathwayId])) {
      fail(`La proyección ${pathwayId} perdió la atribución del fallback.`);
    }
    const presentation = buildRegisteredPlanPresentation(pathwayId, projection);
    if (!presentation.generated || presentation.label !== GENERATED_PATHWAY_LABEL || presentation.periods.length === 0) {
      fail(`La presentación ${pathwayId} atribuye indebidamente el recorrido a FHCE.`);
    }
    if (presentation.periods.some(({ label, courseIds }) => /semestre|año/i.test(label) || courseIds.length > 6)) {
      fail(`La presentación ${pathwayId} inventó períodos temporales o excedió el tamaño del tramo orientativo.`);
    }
    const activeIds = new Set(presentation.periods.flatMap(({ courseIds }) => courseIds));
    if (!sameMembers([...activeIds], source.projectionBaseline.fallbackCoreByPathway[pathwayId])) {
      fail(`La presentación ${pathwayId} no conserva su selección orientativa explícita.`);
    }
    for (const course of presentation.courses.filter(({ id }) => activeIds.has(id))) {
      if (course.provisional !== true || course.eligibleRequirementIds.length !== 0 || course.creditAllocations.length !== 0) {
        fail(`La candidata ${course.id} aporta indebidamente a requisitos oficiales.`);
      }
    }
  }
}

const source = await readJson(sourcePath);
const baseline = validateSource(source);
validateRegistry(source, await readJson(auditsPath), await readJson(reviewsPath));
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const projection = await readJson(projectionPath);
validateProjection(source, projection, inventory.plans.find(({ planId }) => planId === source.planId), baseline);

console.log(`D03ad regenerado: un Plan 2021, tres menciones, tres sedes, ${baseline.verifiedIds.length} identidad verificada, ${baseline.candidateIds.length} candidatas y ausencia temporal documentada; ${report.counts.generatedPlans} planes e inventario actualizados.`);
