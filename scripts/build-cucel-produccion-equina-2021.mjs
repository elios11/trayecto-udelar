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
const sourcePath = path.join(projectRoot, "data", "cucel", "produccion-equina-2021-trajectory-review.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", "bedelias-cucel-tecnologo-en-produccion-equina-2022.json");

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };
const sameMembers = (actual, expected) => actual.length === expected.length
  && new Set(actual).size === actual.length
  && actual.every((value) => expected.includes(value));

function validateSource(source) {
  if (source.planId !== "bedelias-cucel-tecnologo-en-produccion-equina-2022"
    || source.publication.officialPlanYear !== "2021"
    || source.publication.bedeliasTechnicalYear !== "2022"
    || source.publication.durationMonths !== 36
    || source.publication.durationSemesters !== 6
    || source.publication.minimumCredits !== 270
    || source.publication.currentAtReview !== null) {
    fail("La evidencia normalizada debe separar Plan 2021, identidad técnica 2022, 36 meses y ausencia de una afirmación de oferta actual.");
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
  const impo = source.sources.find(({ id }) => id === "impo-plan-2022");
  if (impo?.rawPdfContentHash !== "sha256:f32dfbb9cb840d11bad695a0add546fa45fcece7637db8f15ea05ffd991360aa"
    || impo.exampleTablePdfPage !== 16
    || impo.exampleTableZeroBasedPageIndex !== 15
    || !sameMembers(impo.visuallyInspectedPdfPages ?? [], [13, 14, 15, 16])) {
    fail("La evidencia IMPO debe conservar el PDF auditado y las páginas inspeccionadas visualmente.");
  }
  if (source.creditTable.narrativeOptionalMinimum !== 55
    || source.creditTable.totals.required !== 214
    || source.creditTable.totals.optional !== 56
    || source.creditTable.totals.total !== 270
    || source.creditTable.resolutionTableTotals.arithmeticTotal !== 269) {
    fail("El conflicto 55/56 y el cierre normativo de 270 créditos deben permanecer explícitos.");
  }
  const courseIds = source.courses.map(({ sourceCourseId }) => sourceCourseId);
  const pathway = source.trajectories.find(({ id }) => id === "bedelias");
  const periodIds = pathway?.periods.flatMap(({ courseIds: ids }) => ids) ?? [];
  const expectedLabels = ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5", "Semestre 6"];
  if (source.courses.length !== 45 || !sameMembers(courseIds, periodIds)
    || !sameMembers(source.projectionBaseline.verifiedSourceCourseIds, courseIds)
    || !sameMembers(source.projectionBaseline.candidateSourceCourseIds, ["CUR-UNIV"])
    || JSON.stringify(pathway.periods.map(({ label }) => label)) !== JSON.stringify(expectedLabels)
    || JSON.stringify(pathway.periods.map(({ courseIds: ids }) => ids.length)) !== JSON.stringify([8, 7, 7, 8, 8, 7])
    || JSON.stringify(pathway.periods.map(({ totalCredits }) => totalCredits)) !== JSON.stringify([48, 42, 45, 45, 48, 42])) {
    fail("El ejemplo oficial debe conservar 45 identidades únicas, seis períodos y su orden y totales visualmente cotejados.");
  }
  if (!/ejemplo/i.test(source.trajectoryConclusion.justification)
    || source.trajectoryConclusion.mandatorySequence !== false
    || source.trajectoryConclusion.optionalOfferMustExceedExample !== true) {
    fail("La tabla debe conservarse como ejemplo flexible y no como requisito obligatorio.");
  }
  return { courseIds, pathway };
}

function validateRegistry(source, audits, reviews) {
  const audit = audits.audits.find(({ identity }) => identity === source.auditIdentity);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  if (!audit || audit.reviewedAt !== source.reviewedAt
    || audit.officialPlan?.curriculum?.strictOfficialCourseIds !== true
    || !sameMembers(audit.officialPlan.curriculum.verifiedCourseIds ?? [], source.projectionBaseline.verifiedSourceCourseIds)
    || audit.conclusion?.trajectoryStatus !== "official-trajectory-reproduced"
    || audit.conclusion?.trajectorySourceDataPath !== "data/cucel/produccion-equina-2021-trajectory-review.json") {
    fail("La auditoría no enlaza la evidencia D03ae ni conserva la frontera exacta de identidades.");
  }
  const periods = audit.officialPlan.curriculum.periods ?? [];
  if (JSON.stringify(periods.map(({ label }) => label)) !== JSON.stringify(source.trajectories[0].periods.map(({ label }) => label))) {
    fail("La auditoría perdió el orden oficial de los seis semestres.");
  }
  if (!review || review.state !== "official-trajectory-reproduced"
    || review.reviewedAt !== source.reviewedAt
    || review.projectionMechanism !== "official-periods"
    || review.evidence?.sourceDataPath !== "data/cucel/produccion-equina-2021-trajectory-review.json"
    || review.evidence?.compareCoursePlacements !== true) {
    fail("La revisión D03 debe registrar la correspondencia estructurada de períodos y materias.");
  }
}

function validateProjection(source, projection, inventoryEntry, baseline) {
  if (!inventoryEntry || inventoryEntry.state !== "official-trajectory-reproduced"
    || inventoryEntry.currentProjection?.primary !== "official-periods"
    || inventoryEntry.evidence?.matchedCoursePlacements !== 45
    || inventoryEntry.evidence?.expectedCoursePlacements !== 45) {
    fail("El inventario no reprodujo la correspondencia oficial completa de 45 identidades.");
  }
  if (projection.plan.year !== "2021" || projection.plan.durationMonths !== 36
    || projection.plan.minCredits !== 270 || projection.plan.degreeTitle !== "Tecnólogo en Producción Equina"
    || !sameMembers(projection.campuses.map(({ id }) => id), source.projectionBaseline.campusIds)) {
    fail("La proyección perdió los metadatos oficiales o la única sede de Melo.");
  }
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const canonicalIds = Object.values(source.projectionBaseline.courseIdBySourceId);
  if (verified.length !== 45 || candidates.length !== 1 || candidates[0].bedeliasCode !== "CUR-UNIV"
    || !sameMembers(projection.courses.map(({ id }) => id), canonicalIds)
    || projection.plan.courseCatalogAuditStatus !== "partial") {
    fail("La regeneración alteró IDs/progreso o la frontera de 45 verificadas y una candidata.");
  }
  for (const [sourceId, expectedId] of Object.entries(source.projectionBaseline.courseIdBySourceId)) {
    if (projection.courses.find(({ bedeliasCode }) => bedeliasCode === sourceId)?.id !== expectedId) {
      fail(`La identidad canónica de ${sourceId} cambió.`);
    }
  }
  const published = projection.publishedPathways?.bedelias;
  if (!published || published.periods.length !== 6
    || published.label !== "Ejemplo oficial de distribución"
    || !/flexible y no obligatorio/i.test(published.description)
    || published.periods.some(({ courseIds }) => courseIds.includes(candidates[0].id))) {
    fail("La trayectoria publicada debe contener sólo seis períodos y excluir CUR-UNIV.");
  }
  if (!/no cursado obligatorio/i.test(projection.plan.notice)
    || !/no exigen cursar todas las opciones/i.test(projection.plan.notice)) {
    fail("La UI debe distinguir el ejemplo de distribución de un cursado obligatorio y de una obligación de cursar todas las optativas.");
  }
  for (let index = 0; index < baseline.pathway.periods.length; index += 1) {
    const sourcePeriod = baseline.pathway.periods[index];
    const expectedIds = sourcePeriod.courseIds.map((sourceId) => source.projectionBaseline.courseIdBySourceId[sourceId]);
    const projectedPeriod = published.periods[index];
    if (projectedPeriod.label !== sourcePeriod.label
      || !sameMembers(projectedPeriod.courseIds, expectedIds)) {
      fail(`El ${sourcePeriod.label} no conserva las identidades del ejemplo oficial.`);
    }
  }
  const root = projection.creditStructure.nodes.find(({ id }) => id === "plan-total");
  const credential = projection.creditStructure.credentials.find(({ id }) => id === "bedelias-degree");
  const requiredIds = credential.requiredCourseGroups.flatMap(({ courseIds }) => courseIds);
  if (root?.minCredits !== 270 || credential?.minTotalCredits !== 270
    || requiredIds.includes(candidates[0].id)) {
    fail("La candidata no puede aportar a los 270 créditos ni a grupos obligatorios.");
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

console.log(`D03ae regenerado: Plan oficial 2021, ID técnico 2022, seis semestres, 45 identidades verificadas, una candidata y 270 créditos; ${report.counts.generatedPlans} planes e inventario actualizados.`);
