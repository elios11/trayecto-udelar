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
const sourceDataPath = "data/fartes/cur-artes-plasticas-2017.json";
const projectionDataPath = "app/data/bedelias-generated/bedelias-cur-tecnicatura-en-artes-plasticas-y-visuales-2017.json";
const sourcePath = path.join(projectRoot, sourceDataPath);
const snapshotPath = path.join(projectRoot, "data", "bedelias", "cur-tecnicatura-en-artes-plasticas-y-visuales-2017.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, projectionDataPath);
const planUrl = "https://www.artes.udelar.edu.uy/wp-content/uploads/2023/09/PlandeEstudios_TecnicaturaArtesPlsticasyVisuales_CUR.pdf";
const careerUrl = "https://www.artes.udelar.edu.uy/carrera/tecnicatura-en-artes-plasticas-y-visuales/";
const calendarUrl = "https://www.artes.udelar.edu.uy/wp-content/uploads/2023/09/Cambio_orden_cursado_tercer_ao.pdf";
const expectedPeriodLabels = ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5", "Semestre 6"];
const expectedAvailableCredits = [40, 40, 45, 40, 45, 35];
const expectedRequiredCredits = [40, 40, 40, 40, 45, 35];

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };
const sameMembers = (actual, expected) => actual.length === expected.length
  && new Set(actual).size === actual.length
  && actual.every((value) => expected.includes(value));

function validateSource(source, snapshot) {
  if (source.planId !== "bedelias-cur-tecnicatura-en-artes-plasticas-y-visuales-2017"
    || source.auditIdentity !== "tecnicatura en artes plasticas y visuales:2017"
    || source.publication.officialPlanYear !== "2017"
    || source.publication.durationMonths !== 36
    || source.publication.durationSemesters !== 6
    || source.publication.minimumCredits !== 240
    || source.publication.currentAtReview !== true
    || source.scope.campuses.length !== 1
    || source.scope.campuses[0].id !== "rivera") {
    fail("La evidencia debe conservar el Plan 2017 vigente, Rivera, seis semestres, 36 meses y 240 créditos.");
  }
  if (source.scope.excludedPlans.some(({ planYear, campus }) => planYear !== "2013" || campus !== "Rocha")) {
    fail("La frontera territorial debe excluir explícitamente el Plan 2013 de Rocha.");
  }
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    if (source.fingerprint.sourceHashes?.[sourceId] !== digest(portion)) {
      fail(`La huella normalizada no coincide para ${sourceId}.`);
    }
  }
  const planSource = source.sources.find(({ id }) => id === "fartes-plan-2017");
  const calendarSource = source.sources.find(({ id }) => id === "ienba-resolution-48-2019");
  if (planSource?.rawContentHash !== "sha256:ee73fc9fa498d439c574448d064d78c959fac75bd40e2a0d821c5df828fcc348"
    || JSON.stringify(planSource.visuallyInspectedPdfPages) !== JSON.stringify([1, 2])
    || calendarSource?.rawContentHash !== "sha256:445e5e1cb4b4fa7ac61940da052f6988d26734f1a82d2b380a0938d863a88ace"
    || JSON.stringify(calendarSource.visuallyInspectedPdfPages) !== JSON.stringify([1, 2])) {
    fail("Las huellas o páginas inspeccionadas del Plan y la Resolución 48/2019 cambiaron.");
  }

  const snapshotCourses = new Map((snapshot.plan?.courses ?? []).map((course) => [course.code, course]));
  const rowIds = source.rows.map(({ sourceCourseId }) => sourceCourseId);
  const verifiedIds = source.authorityPolicy.verifiedBedeliasSourceCourseIds;
  if (snapshotCourses.size !== 16
    || source.bedeliasComparison.compositionEntryCount !== 16
    || source.bedeliasComparison.compositionCredits !== 245
    || source.rows.length !== 16
    || !sameMembers(rowIds, [...snapshotCourses.keys()])
    || !sameMembers(verifiedIds, rowIds)
    || source.authorityPolicy.candidateSourceCourseIds.length !== 0) {
    fail("El contraste debe conservar exactamente las 16 identidades de Bedelías como verificadas y ninguna candidata.");
  }
  for (const row of source.rows) {
    const snapshotCourse = snapshotCourses.get(row.sourceCourseId);
    if (!snapshotCourse || Number(snapshotCourse.credits) !== row.credits) {
      fail(`La carga o identidad técnica cambió para ${row.sourceCourseId}.`);
    }
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
    || placements.length !== 16
    || new Set(placements.map(({ sourceCourseId }) => sourceCourseId)).size !== 16) {
    fail("La trayectoria debe contener seis períodos y las 16 identidades visibles una sola vez.");
  }
  const rowById = new Map(source.rows.map((row) => [row.sourceCourseId, row]));
  for (const placement of placements) {
    if (rowById.get(placement.sourceCourseId)?.period !== placement.period) {
      fail(`La ubicación oficial no coincide para ${placement.sourceCourseId}.`);
    }
  }
  const availableCredits = trajectory.periods.map((period) => period.courseIds.reduce((sum, courseId) => (
    sum + rowById.get(courseId).credits
  ), 0));
  if (JSON.stringify(availableCredits) !== JSON.stringify(expectedAvailableCredits)
    || source.requirements.map(({ minCredits }) => minCredits).join(",") !== expectedRequiredCredits.join(",")) {
    fail("La evidencia debe distinguir 245 créditos visibles de alternativas y 240 créditos requeridos.");
  }
  const seminarRows = source.rows.filter(({ alternativeGroupId }) => alternativeGroupId === "third-semester-seminar");
  if (!sameMembers(seminarRows.map(({ sourceCourseId }) => sourceCourseId), ["SPAF", "SEMI"])
    || source.authorityPolicy.alternativeSeminarsBecomeCumulativeRequirements !== false) {
    fail("SPAF y SEMI deben permanecer como alternativas no acumulativas del mismo cupo.");
  }
  if (rowById.get("TAIII").period !== "Semestre 4"
    || rowById.get("TAIV").period !== "Semestre 5"
    || rowById.get("STEA").period !== "Semestre 5"
    || rowById.get("EPV").period !== "Semestre 6") {
    fail("No se aplicó la resolución documental del Taller III ni la Resolución 48/2019.");
  }
  if (placements.filter(({ sourceCourseId }) => sourceCourseId === "PROE").length !== 1
    || rowById.get("PROE").period !== "Semestre 6") {
    fail("Proyecto de Egreso debe aparecer una sola vez en el sexto semestre.");
  }
}

function buildAudit(source) {
  const sourceById = new Map(source.sources.map((entry) => [entry.id, entry]));
  const orderedSourceIds = [
    "fartes-plan-2017",
    "fartes-current-career-page",
    ...source.sources.map(({ id }) => id).filter((id) => ![
      "fartes-plan-2017",
      "fartes-current-career-page",
    ].includes(id)),
  ];
  const sources = orderedSourceIds.map((id) => sourceById.get(id)).map((entry) => ({
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
    ...(row.alternativeGroupId ? {
      elective: true,
      catalogRole: "official-semester-alternative",
    } : {}),
  }]));
  const calendarSource = source.sources.find(({ id }) => id === "ienba-resolution-48-2019");
  return {
    identity: source.auditIdentity,
    career: "TECNICATURA EN ARTES - PLÁSTICAS Y VISUALES",
    planYear: "2017",
    reviewedAt: source.reviewedAt,
    status: "official-evidence-complete",
    scope: "vigencia, título, duración, 240 créditos, seis semestres, calendario aprobado, errata de Taller III, seminarios alternativos y sede Rivera",
    publicationEligible: false,
    officialPlan: {
      approval: [
        "Plan de Estudios 2017 publicado por Facultad de Artes para el Centro Universitario de Rivera",
        source.publication.calendarResolution,
      ],
      planYear: source.publication.officialPlanYear,
      effectiveFrom: source.publication.calendarEffectiveFrom,
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
        sourceUrl: calendarUrl,
        catalogSourceCourseIds: [],
        restrictGeneratedCatalogToPublished: true,
      })),
      degreeRule: "El título exige 240 créditos en seis semestres, las 14 unidades obligatorias, un seminario de 5 créditos entre SPAF y SEMI y el Proyecto de Egreso. La Resolución 48/2019 deja 45 créditos en quinto y 35 en sexto sin cambiar el total.",
      curriculum: {
        useBedeliasCompositionTree: true,
        usePublishedCredits: true,
        strictOfficialCourseIds: true,
        verifiedCourseIds: source.authorityPolicy.verifiedBedeliasSourceCourseIds,
        sourceUrl: planUrl,
        sourceDataPath,
        includeAllCoursesInPathwayCatalog: false,
        pathRequirementMap: {
          "1R": "semester-1",
          "2R": "semester-2",
          "3R": "semester-3",
          "4R": "semester-4",
          "5R": "semester-5",
          "6R": "semester-6",
          "PROE": "semester-6"
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
      serviceCode: "CUR",
      locations: ["Rivera"],
      role: "oferta completa de Facultad de Artes en el CENUR Noreste, sede Rivera",
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
      reason: "Rivera conserva un Plan 2017 propio. La trayectoria aplica la Resolución 48/2019 y corrige el doble rótulo Taller IV sólo con documentos de Facultad de Artes; el Plan 2013 de Rocha no aporta identidad, períodos ni progreso.",
      normalization: [
        "Mantener el Plan 2017 de Rivera separado del Plan 2013 de Rocha bajo una sola carrera.",
        "Proyectar Taller III en cuarto semestre y Taller IV en quinto sin crear equivalencias por semejanza.",
        "Aplicar el intercambio aprobado: Seminario-Taller de Educación Artística en quinto y Estética y Percepción V en sexto.",
        "Conservar SPAF y SEMI como alternativas del único cupo de seminario de 5 créditos del tercer semestre.",
        "Mostrar Proyecto de Egreso una sola vez en sexto semestre.",
      ],
    },
    sources,
    anomalies: source.conflicts,
    uiNotice: "Plan 2017 vigente en Rivera: 240 créditos en seis semestres. La implementación aprobada ubica el Seminario-Taller de Educación Artística en quinto y Estética y Percepción V en sexto; en tercer semestre elegí un seminario de 5 créditos entre las propuestas vigentes.",
    remainingWork: "Revisar sólo ante una nueva resolución, plan, errata o programa oficial de Facultad de Artes. EVA y la oferta periódica no modifican esta trayectoria.",
    sourceEvidence: {
      sourceDataPath,
      normalizedFingerprint: source.fingerprint.value,
      calendarContentHash: calendarSource.rawContentHash,
    },
  };
}

function buildReview(source) {
  return {
    planId: source.planId,
    state: "official-trajectory-reproduced",
    reviewedAt: source.reviewedAt,
    effectiveAt: source.publication.calendarEffectiveFrom,
    projectionMechanism: "official-periods",
    scope: {
      territories: ["Rivera"],
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
  if (auditIndex < 0) fail("No existe la auditoría previa de la Tecnicatura de Rivera.");
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
  if (verified.length !== 16 || candidates.length !== 0 || projection.plan.courseCatalogAuditStatus !== "verified") {
    fail(`La frontera esperada es 16 verificadas y ninguna candidata; resultó ${verified.length}/${candidates.length}.`);
  }
  if (!sameMembers(verified.map(({ bedeliasCode }) => bedeliasCode), source.authorityPolicy.verifiedBedeliasSourceCourseIds)) {
    fail("La regeneración alteró los códigos verificados de Bedelías.");
  }
  for (const course of verified) {
    const expectedId = `cur-${course.bedeliasCode.toLocaleLowerCase("es-UY")}-2`;
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
  if (projection.source?.careerPage !== careerUrl) {
    fail("La proyección perdió la página vigente de Facultad de Artes como fuente de carrera.");
  }
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  const availableCredits = pathway.periods.map((period) => period.courseIds.reduce((sum, id) => (
    sum + courseById.get(id).credits
  ), 0));
  if (JSON.stringify(availableCredits) !== JSON.stringify(expectedAvailableCredits)) {
    fail(`La oferta visible por semestre cambió: ${availableCredits.join("/")}.`);
  }

  const credential = projection.creditStructure.credentials[0];
  if (credential.minTotalCredits !== 240
    || JSON.stringify(credential.nodeRequirements.map(({ minCredits }) => minCredits)) !== JSON.stringify(expectedRequiredCredits)) {
    fail("La proyección alteró los 240 créditos o la distribución efectiva 40/40/40/40/45/35.");
  }
  const mandatory = credential.requiredCourseGroups.find(({ id }) => id === "mandatory-curriculum");
  const seminar = credential.requiredCourseGroups.find(({ id }) => id === "third-semester-seminar");
  if (mandatory?.minCompleted !== 14 || mandatory.courseIds.length !== 14
    || seminar?.minCompleted !== 1 || seminar.courseIds.length !== 2
    || !sameMembers(seminar.courseIds.map((id) => courseById.get(id)?.bedeliasCode), ["SPAF", "SEMI"])) {
    fail("La regeneración acumuló seminarios alternativos o alteró las unidades obligatorias.");
  }
  const projectId = projection.courses.find(({ bedeliasCode }) => bedeliasCode === "PROE")?.id;
  if (!projectId || pathway.periods.flatMap(({ courseIds }) => courseIds).filter((id) => id === projectId).length !== 1
    || !pathway.periods[5].courseIds.includes(projectId)) {
    fail("Proyecto de Egreso debe aparecer una sola vez en sexto semestre.");
  }
  if (inventoryEntry?.state !== "official-trajectory-reproduced"
    || inventoryEntry.currentProjection?.primary !== "official-periods"
    || inventoryEntry.evidence?.expectedCoursePlacements !== 16
    || inventoryEntry.evidence?.matchedCoursePlacements !== 16) {
    fail("El inventario no confirmó los seis períodos y las 16 ubicaciones oficiales.");
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

console.log(`D03aj regenerado: Plan 2017 de Rivera, seis semestres, 240 créditos requeridos, 16 identidades verificadas, seminario alternativo y Proyecto de Egreso único; ${report.counts.generatedPlans} planes e inventario actualizados.`);
