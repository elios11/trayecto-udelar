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
const sourceDataPath = "data/fartes/cure-artes-plasticas-2013.json";
const projectionDataPath = "app/data/bedelias-generated/bedelias-cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013.json";
const sourcePath = path.join(projectRoot, sourceDataPath);
const snapshotPath = path.join(projectRoot, "data", "bedelias", "cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, projectionDataPath);
const planUrl = "https://www.artes.udelar.edu.uy/wp-content/uploads/2023/09/Tecnicatura_Artes-Artes_Plasticas_y_Visuales.pdf";
const careerUrl = "https://www.artes.udelar.edu.uy/carrera/tecnicatura-en-artes-plasticas-y-visuales-2/";
const expectedPeriodLabels = ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5", "Semestre 6"];
const expectedSemesterCredits = [40, 40, 40, 40, 40, 40];

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };
const sameMembers = (actual, expected) => actual.length === expected.length
  && new Set(actual).size === actual.length
  && actual.every((value) => expected.includes(value));

function validateSource(source, snapshot) {
  if (source.planId !== "bedelias-cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013"
    || source.auditIdentity !== "tecnicatura en artes artes plasticas y visuales:2013"
    || source.publication.officialPlanYear !== "2013"
    || source.publication.durationMonths !== 36
    || source.publication.durationSemesters !== 6
    || source.publication.minimumCredits !== 240
    || source.publication.currentAtReview !== true
    || source.scope.campuses.length !== 1
    || source.scope.campuses[0].id !== "rocha") {
    fail("La evidencia debe conservar el Plan 2013 vigente, Rocha, seis semestres, 36 meses y 240 créditos.");
  }
  if (source.scope.excludedPlans.length !== 1
    || source.scope.excludedPlans[0].planYear !== "2017"
    || source.scope.excludedPlans[0].campus !== "Rivera") {
    fail("La frontera territorial debe excluir explícitamente el Plan 2017 de Rivera.");
  }
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    if (source.fingerprint.sourceHashes?.[sourceId] !== digest(portion)) {
      fail(`La huella normalizada no coincide para ${sourceId}.`);
    }
  }
  const planSource = source.sources.find(({ id }) => id === "fartes-plan-rocha-2013");
  const currentPageSource = source.sources.find(({ id }) => id === "fartes-current-career-page-rocha");
  const enrollmentSource = source.sources.find(({ id }) => id === "cure-ingresos-generacion-2026");
  if (planSource?.rawContentHash !== "sha256:bd646d5527965e2c88e919ab288e5d9bd9e5c467511bee8ae5c84ec2b2b0c194"
    || JSON.stringify(planSource.visuallyInspectedPdfPages) !== JSON.stringify([1, 2, 3])
    || currentPageSource?.rawContentHash !== "sha256:07fb3c7c7da3f677024563bbcf2cc6e7f95452e9e87dea2996a37c5a0d217ea2"
    || enrollmentSource?.rawContentHash !== "sha256:1531730b028ddce2d780134701ee81b1a2a0c921dae8d602a4dedcef1e8c357c") {
    fail("Las huellas crudas o páginas inspeccionadas de las fuentes institucionales cambiaron.");
  }

  const snapshotCourses = new Map((snapshot.plan?.courses ?? []).map((course) => [course.code, course]));
  const rowIds = source.rows.map(({ sourceCourseId }) => sourceCourseId);
  const verifiedIds = source.authorityPolicy.verifiedBedeliasSourceCourseIds;
  const candidateIds = source.authorityPolicy.candidateSourceCourseIds;
  if (digest(snapshot) !== source.bedeliasComparison.snapshotContentHash
    || snapshotCourses.size !== 17
    || source.bedeliasComparison.compositionEntryCount !== 17
    || source.bedeliasComparison.compositionCredits !== 244
    || source.rows.length !== 15
    || !sameMembers(verifiedIds, rowIds)
    || !sameMembers(candidateIds, ["INUNI", "AP16"])
    || !sameMembers([...snapshotCourses.keys()], [...verifiedIds, ...candidateIds])) {
    fail("El contraste debe conservar quince identidades verificadas y dos candidatas del snapshot versionado.");
  }
  for (const row of source.rows) {
    const snapshotCourse = snapshotCourses.get(row.sourceCourseId);
    if (!snapshotCourse || Number(snapshotCourse.credits) !== row.credits) {
      fail(`La carga o identidad técnica cambió para ${row.sourceCourseId}.`);
    }
  }
  if (snapshotCourses.get("INUNI")?.credits !== 4 || snapshotCourses.get("AP16")?.credits !== 0) {
    fail("Las candidatas INUNI y AP16 deben conservar sus valores técnicos sin convertirse en currícula.");
  }

  const trajectory = source.trajectories[0];
  const placements = trajectory.periods.flatMap((period) => period.courseIds.map((sourceCourseId) => ({
    sourceCourseId,
    period: period.label,
  })));
  if (source.trajectories.length !== 1
    || trajectory.id !== "bedelias"
    || trajectory.useOnlyConfiguredPeriods !== true
    || JSON.stringify(trajectory.periods.map(({ label }) => label)) !== JSON.stringify(expectedPeriodLabels)
    || placements.length !== 15
    || new Set(placements.map(({ sourceCourseId }) => sourceCourseId)).size !== 15
    || placements.some(({ sourceCourseId }) => candidateIds.includes(sourceCourseId))) {
    fail("La trayectoria debe contener seis períodos y las quince identidades oficiales una sola vez.");
  }
  const rowById = new Map(source.rows.map((row) => [row.sourceCourseId, row]));
  for (const placement of placements) {
    if (rowById.get(placement.sourceCourseId)?.period !== placement.period) {
      fail(`La ubicación oficial no coincide para ${placement.sourceCourseId}.`);
    }
  }
  const periodCredits = trajectory.periods.map((period) => period.courseIds.reduce((sum, courseId) => (
    sum + rowById.get(courseId).credits
  ), 0));
  if (JSON.stringify(periodCredits) !== JSON.stringify(expectedSemesterCredits)
    || JSON.stringify(source.requirements.map(({ minCredits }) => minCredits)) !== JSON.stringify(expectedSemesterCredits)) {
    fail("La evidencia debe reproducir seis semestres de 40 créditos.");
  }
  const seminarRows = source.rows.filter(({ flexibleSlotId }) => flexibleSlotId === "second-year-seminar-slots");
  const seminarRequirement = source.requiredCourseGroups.find(({ id }) => id === "second-year-seminar-slots");
  if (!sameMembers(seminarRows.map(({ sourceCourseId }) => sourceCourseId), ["AP07", "AP15"])
    || seminarRequirement?.minCompleted !== 2
    || !sameMembers(seminarRequirement.sourceCourseIds, ["AP07", "AP15"])
    || source.authorityPolicy.seminarContentOptionsBecomeCumulativeRequirements !== false) {
    fail("Los dos cupos de seminario deben permanecer flexibles sin acumular sus posibles contenidos.");
  }
  if (placements.filter(({ sourceCourseId }) => sourceCourseId === "AP14").length !== 1
    || rowById.get("AP14").period !== "Semestre 6") {
    fail("Proyecto de Egreso debe aparecer una sola vez en el sexto semestre.");
  }
}

function buildAudit(source) {
  const sources = source.sources.map((entry) => ({
    url: entry.url,
    authority: entry.authority,
    supports: entry.supports,
    contentHash: entry.rawContentHash,
  }));
  const curriculumRows = Object.fromEntries(source.rows.map((row) => [row.sourceCourseId, {
    name: row.officialLabel,
    preserveName: true,
    officialIdentity: true,
    officialCredits: true,
    credits: row.credits,
    creditSourceUrl: planUrl,
    requirementId: row.requirementId,
    periodLabel: row.period,
    ...(row.flexibleSlotId ? {
      elective: true,
      catalogRole: "official-semester-choice-slot",
    } : {}),
  }]));
  const planSource = source.sources.find(({ id }) => id === "fartes-plan-rocha-2013");
  const enrollmentSource = source.sources.find(({ id }) => id === "cure-ingresos-generacion-2026");
  return {
    identity: source.auditIdentity,
    career: "TECNICATURA EN ARTES - ARTES PLÁSTICAS Y VISUALES",
    planYear: "2013",
    reviewedAt: source.reviewedAt,
    status: "official-evidence-complete",
    scope: "vigencia 2026, título, duración, 240 créditos, seis semestres, seminarios de contenido variable, Proyecto de Egreso y sede Rocha",
    publicationEligible: false,
    officialPlan: {
      approval: [
        "Plan de Estudios publicado por Facultad de Artes para el Centro Universitario Regional Este, sede Rocha",
        "Apertura de ingreso CURE para la generación 2026",
      ],
      planYear: source.publication.officialPlanYear,
      effectiveFrom: source.publication.effectiveFrom,
      title: source.publication.credential,
      careerName: "Tecnicatura en Artes Plásticas y Visuales",
      facultyCode: "FARTES",
      facultyName: "Facultad de Artes",
      durationMonths: source.publication.durationMonths,
      semesters: source.publication.durationSemesters,
      minimumCredits: source.publication.minimumCredits,
      current: source.publication.currentAtReview,
      pathwayLabel: source.trajectories[0].label,
      trajectories: source.trajectories.map((trajectory) => ({
        ...trajectory,
        sourceUrl: planUrl,
        catalogSourceCourseIds: [],
        restrictGeneratedCatalogToPublished: true,
      })),
      degreeRule: "El título exige 240 créditos en seis semestres de 40: las trece unidades fijas, dos cupos de seminario de contenido variable y el Proyecto de Egreso.",
      curriculum: {
        useBedeliasCompositionTree: true,
        usePublishedCredits: true,
        strictOfficialCourseIds: true,
        verifiedCourseIds: source.authorityPolicy.verifiedBedeliasSourceCourseIds,
        sourceUrl: planUrl,
        sourceDataPath,
        includeAllCoursesInPathwayCatalog: false,
        pathRequirementMap: {
          "3309": "semester-1",
          "2859": "semester-2",
          "2674": "semester-3",
          "3379": "semester-4",
          "2449": "semester-5",
          "2593": "semester-6",
        },
        courseOverrides: curriculumRows,
        periodOrder: expectedPeriodLabels,
        pathwayLabel: source.trajectories[0].label,
        pathwayDescription: source.trajectories[0].description,
        creditRequirements: source.requirements,
        requiredCourseGroups: source.requiredCourseGroups.map((group) => ({
          ...group,
          sourceUrl: planUrl,
        })),
        projectionAnomalies: source.conflicts,
      },
    },
    offerings: [{
      serviceCode: "CURE",
      locations: ["Rocha"],
      role: "oferta completa de Facultad de Artes en el CENUR Este, sede Rocha",
      trajectoryIds: ["bedelias"],
      curriculumVariant: false,
    }],
    bedeliasComparison: {
      canonicalSnapshot: source.bedeliasComparison.snapshotPath,
      metadataCurrent: true,
      publishedDurationMonths: source.publication.durationMonths,
      publishedMinimumCredits: source.publication.minimumCredits,
      compositionMatterEntries: source.bedeliasComparison.compositionEntryCount,
      compositionCredits: source.bedeliasComparison.compositionCredits,
      exactVerifiedEntries: source.bedeliasComparison.verifiedCourseCount,
      candidateEntriesPreserved: source.bedeliasComparison.candidateRetainedCount,
      interpretation: source.bedeliasComparison.interpretation,
    },
    conclusion: {
      canonicalModel: "one-career-distinct-site-plan",
      regionalCurriculumVariant: true,
      siteSpecificTrajectoryAvailability: false,
      trajectoryStatus: "official-trajectory-reproduced",
      trajectorySourceDataPath: sourceDataPath,
      reason: "Rocha conserva un Plan 2013 propio y vigente en 2026. Su malla de seis semestres se reconstruye sólo con las quince correspondencias exactas del Plan; Rivera 2017 no aporta identidad, calendario ni progreso.",
      normalization: [
        "Mantener el Plan 2013 de Rocha separado del Plan 2017 de Rivera bajo una sola carrera.",
        "Reproducir seis semestres de 40 créditos desde el Plan PDF de Facultad de Artes.",
        "Conservar AP07 y AP15 como dos cupos semestrales de contenido variable, sin acumular todas sus propuestas posibles.",
        "Mantener INUNI y AP16 candidatas fuera de la trayectoria y del catálogo normal.",
        "Mostrar Proyecto de Egreso una sola vez en sexto semestre.",
      ],
    },
    sources,
    anomalies: source.conflicts,
    uiNotice: "Plan 2013 vigente en Rocha: 240 créditos en seis semestres de 40. En segundo año completás un seminario de contenido variable en cada semestre; las entradas auxiliares de Bedelías no forman parte de la malla.",
    remainingWork: "Revisar sólo ante un nuevo plan, resolución o grilla oficial de Facultad de Artes. La oferta concreta de contenidos de seminario no se convierte en obligación acumulativa.",
    sourceEvidence: {
      sourceDataPath,
      normalizedFingerprint: source.fingerprint.value,
      planContentHash: planSource.rawContentHash,
      currentEnrollmentContentHash: enrollmentSource.rawContentHash,
    },
  };
}

function buildReview(source) {
  return {
    planId: source.planId,
    state: "official-trajectory-reproduced",
    reviewedAt: source.reviewedAt,
    effectiveAt: source.publication.effectiveFrom,
    projectionMechanism: "official-periods",
    scope: {
      territories: ["Rocha"],
      pathwayIds: ["bedelias"],
    },
    sources: source.sources.map((entry) => ({
      authority: entry.authority,
      url: entry.url,
      reviewedAt: source.reviewedAt,
      role: entry.supports.join("; "),
    })),
    evidence: {
      kind: "audited-projection",
      sourceDataPath,
      projectionDataPath,
      sourceCollection: "trajectories",
      projectionCollection: "publishedPathways",
      periodField: "periods",
      compareCoursePlacements: true,
    },
    conflictNotes: source.conflicts.map(({ resolution }) => resolution),
  };
}

async function updateRegistries(source) {
  const audits = await readJson(auditsPath);
  const auditIndex = audits.audits.findIndex(({ identity }) => identity === source.auditIdentity);
  if (auditIndex < 0) fail("No existe la auditoría previa de la Tecnicatura de Rocha.");
  audits.audits[auditIndex] = buildAudit(source);
  audits.contentHash = officialAuditRegistryHash(audits);
  await writeJson(auditsPath, audits);

  const reviews = await readJson(reviewsPath);
  const review = buildReview(source);
  const reviewIndex = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (reviewIndex >= 0) reviews.reviews[reviewIndex] = review;
  else reviews.reviews.push(review);
  await writeJson(reviewsPath, reviews);
}

function validateProjection(source, projection, inventoryEntry) {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  if (verified.length !== 15 || candidates.length !== 2 || projection.plan.courseCatalogAuditStatus !== "partial") {
    fail(`La frontera esperada es quince verificadas y dos candidatas; resultó ${verified.length}/${candidates.length}.`);
  }
  if (!sameMembers(verified.map(({ bedeliasCode }) => bedeliasCode), source.authorityPolicy.verifiedBedeliasSourceCourseIds)
    || !sameMembers(candidates.map(({ bedeliasCode }) => bedeliasCode), source.authorityPolicy.candidateSourceCourseIds)) {
    fail("La regeneración promovió, eliminó o alteró identidades sin autoridad curricular.");
  }
  for (const course of projection.courses) {
    const expectedId = `cure-${course.bedeliasCode.toLocaleLowerCase("es-UY")}-2`;
    if (course.id !== expectedId) fail(`Cambió la identidad de progreso de ${course.bedeliasCode}: ${course.id}.`);
  }

  const pathway = projection.publishedPathways?.bedelias;
  const projectedCodes = pathway?.periods.map((period) => period.courseIds.map((id) => (
    projection.courses.find((course) => course.id === id)?.bedeliasCode
  )));
  if (!pathway
    || JSON.stringify(pathway.periods.map(({ label }) => label)) !== JSON.stringify(expectedPeriodLabels)
    || JSON.stringify(projectedCodes) !== JSON.stringify(source.trajectories[0].periods.map(({ courseIds }) => courseIds))
    || pathway.periods.some(({ label }) => label === "Validación de egreso")) {
    fail("La proyección no reproduce exactamente los seis períodos oficiales.");
  }
  if (projection.source?.careerPage !== careerUrl || projection.source?.planDocument !== planUrl) {
    fail("La proyección perdió las fuentes académicas de Facultad de Artes.");
  }
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  const periodCredits = pathway.periods.map((period) => period.courseIds.reduce((sum, id) => (
    sum + courseById.get(id).credits
  ), 0));
  if (JSON.stringify(periodCredits) !== JSON.stringify(expectedSemesterCredits)) {
    fail(`La carga visible por semestre cambió: ${periodCredits.join("/")}.`);
  }

  const credential = projection.creditStructure.credentials[0];
  if (credential.minTotalCredits !== 240
    || JSON.stringify(credential.nodeRequirements.map(({ minCredits }) => minCredits)) !== JSON.stringify(expectedSemesterCredits)) {
    fail("La proyección alteró los 240 créditos o la distribución 40/40/40/40/40/40.");
  }
  const mandatory = credential.requiredCourseGroups.find(({ id }) => id === "mandatory-core");
  const seminars = credential.requiredCourseGroups.find(({ id }) => id === "second-year-seminar-slots");
  if (mandatory?.minCompleted !== 13 || mandatory.courseIds.length !== 13
    || seminars?.minCompleted !== 2 || seminars.courseIds.length !== 2
    || !sameMembers(seminars.courseIds.map((id) => courseById.get(id)?.bedeliasCode), ["AP07", "AP15"])
    || seminars.courseIds.some((id) => courseById.get(id)?.elective !== true)) {
    fail("La regeneración acumuló contenidos de seminario o alteró los dos cupos oficiales.");
  }
  const visibleIds = pathway.periods.flatMap(({ courseIds }) => courseIds);
  if (candidates.some(({ id }) => visibleIds.includes(id))) {
    fail("Las entradas candidatas no pueden ingresar en la trayectoria oficial.");
  }
  const projectId = projection.courses.find(({ bedeliasCode }) => bedeliasCode === "AP14")?.id;
  if (!projectId || visibleIds.filter((id) => id === projectId).length !== 1
    || !pathway.periods[5].courseIds.includes(projectId)) {
    fail("Proyecto de Egreso debe aparecer una sola vez en sexto semestre.");
  }
  if (inventoryEntry?.state !== "official-trajectory-reproduced"
    || inventoryEntry.currentProjection?.primary !== "official-periods"
    || inventoryEntry.evidence?.expectedCoursePlacements !== 15
    || inventoryEntry.evidence?.matchedCoursePlacements !== 15) {
    fail("El inventario no confirmó los seis períodos y las quince ubicaciones oficiales.");
  }
}

const source = await readJson(sourcePath);
const snapshot = await readJson(snapshotPath);
validateSource(source, snapshot);
await updateRegistries(source);
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const projection = await readJson(projectionPath);
validateProjection(source, projection, inventory.plans.find(({ planId }) => planId === source.planId));

console.log(`D03ak regenerado: Plan 2013 de Rocha vigente en 2026, seis semestres de 40 créditos, quince identidades verificadas, dos candidatas, seminarios flexibles y Proyecto de Egreso único; ${report.counts.generatedPlans} planes e inventario actualizados.`);
