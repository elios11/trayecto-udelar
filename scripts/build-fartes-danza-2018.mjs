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
const sourceDataPath = "data/fartes/danza-contemporanea-2018.json";
const projectionDataPath = "app/data/bedelias-generated/bedelias-fartes-licenciatura-en-danza-contemporanea-2018.json";
const sourcePath = path.join(projectRoot, sourceDataPath);
const snapshotPath = path.join(projectRoot, "data", "bedelias", "fartes-licenciatura-en-danza-contemporanea-2018.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, projectionDataPath);
const planUrl = "https://www.artes.udelar.edu.uy/wp-content/uploads/2024/06/Licenciatura_Danza_Contemporanea_Plan_de_Estudios_v2.pdf";
const careerUrl = "https://www.artes.udelar.edu.uy/carrera/licenciatura-en-danza-contemporanea/";
const expectedPeriodLabels = [
  "Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4",
  "Semestre 5", "Semestre 6", "Semestre 7", "Semestre 8",
];
const expectedPeriodCredits = [29, 36, 44, 40, 33, 29, 23, 23];
const expectedRequirementCredits = [81, 34, 43, 43, 20, 67, 36, 36];

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };
const sameMembers = (actual, expected) => actual.length === expected.length
  && new Set(actual).size === actual.length
  && actual.every((value) => expected.includes(value));
const exactRows = (source) => source.rows.filter(({ projectionBasis }) => projectionBasis === "exact-plan-row-and-bedelias-identity");
const sourceOnlyRows = (source) => source.rows.filter(({ projectionBasis }) => projectionBasis === "source-only-grid-block");
const trajectoryIdentity = (row) => row.sourceOnlyId ?? (row.overrideKey ? row.progressId : row.sourceCourseId);

function collectMatterNodes(snapshot) {
  const nodes = [];
  const visit = (node) => {
    if (node?.nodeType === "Materia") nodes.push(node);
    for (const child of node?.children ?? []) visit(child);
  };
  visit(snapshot.plan?.composition);
  return nodes;
}

function validateSource(source, snapshot, previousProjection) {
  if (source.planId !== "bedelias-fartes-licenciatura-en-danza-contemporanea-2018"
    || source.auditIdentity !== "licenciatura en danza contemporanea:2018"
    || source.publication.officialPlanYear !== "2008"
    || source.publication.implementationYear !== "2018"
    || source.publication.catalogPlanYear !== "2018"
    || source.publication.durationMonths !== 48
    || source.publication.durationSemesters !== 8
    || source.publication.minimumCredits !== 360
    || source.publication.currentAtReview !== true
    || source.scope.campuses.length !== 1
    || source.scope.campuses[0].id !== "montevideo") {
    fail("La evidencia debe conservar Plan 2008 / Implementación 2018, Montevideo, ocho semestres y 360 créditos.");
  }
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    if (source.fingerprint.sourceHashes?.[sourceId] !== digest(portion)) {
      fail(`La huella normalizada no coincide para ${sourceId}.`);
    }
  }
  const planSource = source.sources.find(({ id }) => id === "fartes-danza-plan-2008-implementation-2018");
  if (planSource?.url !== planUrl
    || planSource.rawContentHash !== "sha256:e54d8ddd06f8d768a63ce7d905ca560413d3d1d69cd536af40a251f302d45ce4"
    || JSON.stringify(planSource.visuallyInspectedPdfPages) !== JSON.stringify([3, 4, 5])) {
    fail("La URL, huella o inspección visual del Plan oficial cambió.");
  }
  if (source.sources.find(({ id }) => id === "fartes-danza-current-career-page")?.url !== careerUrl) {
    fail("Falta la página vigente de la carrera en Facultad de Artes.");
  }
  if (source.bedeliasComparison.snapshotContentHash !== digest(snapshot)) {
    fail("La huella del snapshot de Bedelías ya no coincide.");
  }

  const matterNodes = collectMatterNodes(snapshot);
  const matterCredits = matterNodes.reduce((sum, node) => sum + (Number(node.course?.credits) || 0), 0);
  if (matterNodes.length !== source.bedeliasComparison.compositionEntryCount
    || matterCredits !== source.bedeliasComparison.compositionCredits) {
    fail(`La composición técnica cambió: ${matterNodes.length} entradas y ${matterCredits} créditos.`);
  }

  const matchedRows = exactRows(source);
  const blocks = sourceOnlyRows(source);
  if (matchedRows.length !== 30 || blocks.length !== 6 || source.rows.length !== 36) {
    fail("La grilla debe conservar 30 correspondencias técnicas y seis bloques sólo-fuente.");
  }
  for (const row of matchedRows) {
    const matches = matterNodes.filter((node) => String(node.label ?? "").startsWith(`${row.bedeliasRawIdentity} - `));
    if (matches.length !== 1 || Number(matches[0].course?.credits) !== row.credits) {
      fail(`La identidad o carga técnica no coincide para ${row.rowId}.`);
    }
    if (!previousProjection.courses.some(({ id }) => id === row.progressId)) {
      fail(`No existe el ID de progreso previo ${row.progressId}.`);
    }
  }
  if (!sameMembers(
    matchedRows.filter(({ overrideKey }) => !overrideKey).map(({ sourceCourseId }) => sourceCourseId),
    source.authorityPolicy.verifiedBedeliasSourceCourseIds,
  ) || !sameMembers(
    matchedRows.filter(({ overrideKey }) => overrideKey).map(({ rowId }) => rowId),
    source.authorityPolicy.verifiedByExactRawNameRowIds,
  )) {
    fail("La frontera de correspondencias técnicas no coincide con la política de autoridad.");
  }

  const trajectory = source.trajectories[0];
  const placements = trajectory.periods.flatMap((period) => period.courseIds.map((courseId) => ({ courseId, period: period.label })));
  if (source.trajectories.length !== 1
    || trajectory.id !== "bedelias"
    || trajectory.useOnlyConfiguredPeriods !== true
    || JSON.stringify(trajectory.periods.map(({ label }) => label)) !== JSON.stringify(expectedPeriodLabels)
    || placements.length !== 36
    || new Set(placements.map(({ courseId }) => courseId)).size !== 36) {
    fail("La trayectoria debe contener ocho semestres y 36 ubicaciones oficiales únicas.");
  }
  const rowByTrajectoryIdentity = new Map(source.rows.map((row) => [trajectoryIdentity(row), row]));
  for (const placement of placements) {
    if (rowByTrajectoryIdentity.get(placement.courseId)?.period !== placement.period) {
      fail(`La ubicación oficial no coincide para ${placement.courseId}.`);
    }
  }
  const periodCredits = trajectory.periods.map((period) => period.courseIds.reduce((sum, courseId) => (
    sum + rowByTrajectoryIdentity.get(courseId).credits
  ), 0));
  if (JSON.stringify(periodCredits) !== JSON.stringify(expectedPeriodCredits)) {
    fail(`La carga visible por semestre cambió: ${periodCredits.join("/")}.`);
  }
  const rowCreditsByRequirement = Object.fromEntries(source.requirements.map(({ id }) => [id, source.rows
    .filter(({ requirementId }) => requirementId === id)
    .reduce((sum, row) => sum + row.credits, 0)]));
  if (rowCreditsByRequirement.creation !== 81
    || rowCreditsByRequirement.research !== 34
    || rowCreditsByRequirement["theory-history"] !== 43
    || rowCreditsByRequirement["body-studies"] !== 43
    || rowCreditsByRequirement.mediation !== 20
    || rowCreditsByRequirement["final-project"] !== 36
    || source.requirements.map(({ minCredits }) => minCredits).join(",") !== expectedRequirementCredits.join(",")
    || source.requirements.reduce((sum, requirement) => sum + requirement.minCredits, 0) !== 360) {
    fail("La evidencia alteró los seis ejes, la flexibilidad, el TFE o el total de 360 créditos.");
  }
  if (source.sourcePortions["fartes-danza-plan-2008-implementation-2018"].facts.narrativeBodyMinimumCredits !== 38
    || source.sourcePortions["fartes-danza-plan-2008-implementation-2018"].facts.gridBodyMinimumCredits !== 43
    || !source.conflicts.some(({ field }) => field === "bodyStudiesMinimumCredits")) {
    fail("Debe conservarse explícitamente el conflicto 38/43 de Estudios del cuerpo.");
  }
}

function buildCourseOverrides(source) {
  return Object.fromEntries(exactRows(source).map((row) => [row.overrideKey ?? row.sourceCourseId, {
    name: row.officialLabel,
    preserveName: true,
    officialIdentity: true,
    officialCredits: true,
    authorityStatus: "verified",
    credits: row.credits,
    creditSourceUrl: planUrl,
    requirementId: row.requirementId,
    periodLabel: row.period,
  }]));
}

function buildAdditionalCourses(source) {
  return sourceOnlyRows(source).map((row) => ({
    id: row.sourceOnlyId,
    sourceCourseId: row.sourceOnlyId,
    name: row.officialLabel,
    credits: row.credits,
    requirementId: row.requirementId,
    periodLabel: row.period,
    sourceUrl: planUrl,
    curricularBlock: true,
  }));
}

function buildAudit(source) {
  const sources = source.sources.map((entry) => ({
    url: entry.url,
    authority: entry.authority,
    supports: entry.supports,
    contentHash: entry.rawContentHash ?? source.fingerprint.sourceHashes[entry.id],
  }));
  return {
    identity: source.auditIdentity,
    career: "LICENCIATURA EN DANZA CONTEMPORÁNEA",
    planYear: source.publication.catalogPlanYear,
    reviewedAt: source.reviewedAt,
    status: "official-evidence-complete",
    scope: "vigencia, Plan 2008 / Implementación 2018, título, sede, ocho semestres, 360 créditos, seis ejes, flexibilidad y Trabajo Final",
    publicationEligible: false,
    officialPlan: {
      approval: ["Plan de Estudios 2008 / Implementación 2018, expediente 161110-001274-07"],
      planYear: source.publication.catalogPlanYear,
      approvedPlanYear: source.publication.officialPlanYear,
      implementationYear: source.publication.implementationYear,
      effectiveFrom: source.publication.effectiveFrom,
      title: source.publication.credential,
      careerName: "Licenciatura en Danza Contemporánea",
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
      degreeRule: "El título exige 360 créditos: Creación 81, Investigación 34, Estudios teórico-históricos 43, Estudios del cuerpo 43, Mediación 20, Optativas 67, Electivas 36 y Trabajo Final 36. La malla distribuye 257 créditos en ocho semestres y deja 103 créditos flexibles sin semestre único.",
      curriculum: {
        useBedeliasCompositionTree: true,
        usePublishedCredits: true,
        strictOfficialCourseIds: true,
        verifiedCourseIds: source.authorityPolicy.verifiedBedeliasSourceCourseIds,
        excludedSourceCourseIds: source.authorityPolicy.excludedHistoricalSourceCourseIds,
        sourceUrl: planUrl,
        sourceDataPath,
        includeAllCoursesInPathwayCatalog: false,
        pathRequirementMap: {
          CA: "creation",
          INV: "research",
          THAD: "theory-history",
          TEC: "body-studies",
          MED: "mediation",
          OP: "optatives",
          ELE: "electives",
          TFE: "final-project"
        },
        courseOverrides: buildCourseOverrides(source),
        additionalCourses: buildAdditionalCourses(source),
        periodOrder: expectedPeriodLabels,
        pathwayLabel: source.trajectories[0].label,
        pathwayDescription: source.trajectories[0].description,
        creditRequirements: source.requirements,
        projectionAnomalies: source.conflicts,
      },
    },
    offerings: [{
      serviceCode: "FARTES",
      locations: ["Montevideo"],
      role: "oferta completa del Instituto de Artes Escénicas de Facultad de Artes",
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
      exactVerifiedEntries: source.bedeliasComparison.verifiedBedeliasCourseCount,
      sourceOnlyEntries: source.bedeliasComparison.sourceOnlyGridBlockCount,
      candidateEntriesPreserved: source.bedeliasComparison.candidateRetainedCount,
      interpretation: source.bedeliasComparison.interpretation,
    },
    conclusion: {
      canonicalModel: "one-degree-common-eight-semester-trajectory",
      regionalCurriculumVariant: false,
      siteSpecificTrajectoryAvailability: false,
      trajectoryStatus: "official-trajectory-reproduced",
      trajectorySourceDataPath: sourceDataPath,
      reason: "Facultad de Artes publica una única Licenciatura de cuatro años en Montevideo. La malla del Plan 2008 / Implementación 2018 distribuye 36 ubicaciones en ocho semestres y reserva 103 créditos flexibles; los perfiles personales no son orientaciones certificadas.",
      normalization: [
        "Conservar el ID técnico 2018 y mostrar la denominación académica Plan 2008 / Implementación 2018.",
        "Reproducir las 36 ubicaciones de los ocho semestres sin ubicar los 103 créditos flexibles por inferencia.",
        "Preservar 30 IDs de progreso con correspondencia técnica exacta y crear seis bloques sólo-fuente sin código inventado.",
        "Mantener candidatas las ediciones de seminarios, LTFE1/LTFE2 y la oferta variable no demostrada por la malla.",
        "Controlar 43 créditos de Estudios del cuerpo y conservar visible la contradicción narrativa de 38.",
        "No crear selector de orientación para perfiles personales.",
      ],
    },
    sources,
    anomalies: source.conflicts,
    uiNotice: "Plan de Estudios 2008 / Implementación 2018: ocho semestres y 360 créditos en Montevideo. La malla ubica 257 créditos y deja 67 optativos y 36 electivos para un recorrido personal, sin orientación certificada. El texto del Plan dice 38 créditos de Estudios del cuerpo, pero su cuadro y sus unidades suman 43.",
    remainingWork: "Las optativas, electivas y ediciones concretas de seminarios permanecen candidatas hasta que una fuente curricular vigente confirme identidad y pertenencia; su oferta por período no se infiere.",
    sourceEvidence: {
      sourceDataPath,
      normalizedFingerprint: source.fingerprint.value,
      planContentHash: source.sources.find(({ id }) => id === "fartes-danza-plan-2008-implementation-2018").rawContentHash,
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
      territories: ["Montevideo"],
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
  if (auditIndex < 0) fail("No existe la auditoría previa de Danza Contemporánea.");
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
  if (verified.length !== 36
    || candidates.length !== source.bedeliasComparison.candidateRetainedCount
    || projection.plan.courseCatalogAuditStatus !== "partial") {
    fail(`La frontera esperada es 36 verificadas y 387 candidatas; resultó ${verified.length}/${candidates.length}.`);
  }
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  for (const row of source.rows) {
    const course = courseById.get(row.progressId);
    if (!course || course.authorityStatus !== "verified" || course.name !== row.officialLabel || course.credits !== row.credits) {
      fail(`La proyección alteró la identidad, nombre o carga de ${row.rowId}.`);
    }
    if (row.sourceCourseId && row.sourceCourseId !== "ENBA" && course.bedeliasCode !== row.sourceCourseId) {
      fail(`La proyección perdió el código técnico exacto de ${row.rowId}.`);
    }
  }

  const pathway = projection.publishedPathways?.bedelias;
  const identityToId = new Map();
  for (const course of projection.courses) {
    for (const identity of [course.id, course.bedeliasCode, course.sourceCourseId].filter(Boolean)) {
      identityToId.set(identity, course.id);
    }
  }
  const projectedExpectedIds = source.trajectories[0].periods.map((period) => period.courseIds.map((identity) => identityToId.get(identity)));
  if (!pathway
    || pathway.label !== source.trajectories[0].label
    || JSON.stringify(pathway.periods.map(({ label }) => label)) !== JSON.stringify(expectedPeriodLabels)
    || JSON.stringify(pathway.periods.map(({ courseIds }) => courseIds)) !== JSON.stringify(projectedExpectedIds)
    || pathway.periods.flatMap(({ courseIds }) => courseIds).length !== 36
    || pathway.periods.some(({ label }) => label === "Validación de egreso")) {
    fail("La proyección no reproduce exactamente los ocho semestres y 36 ubicaciones oficiales.");
  }
  const periodCredits = pathway.periods.map((period) => period.courseIds.reduce((sum, id) => sum + courseById.get(id).credits, 0));
  if (JSON.stringify(periodCredits) !== JSON.stringify(expectedPeriodCredits)) {
    fail(`La carga visible por semestre cambió: ${periodCredits.join("/")}.`);
  }
  if (projection.source?.careerPage !== careerUrl) {
    fail("La proyección perdió la página vigente de Facultad de Artes.");
  }

  const credential = projection.creditStructure.credentials[0];
  if (credential.minTotalCredits !== 360
    || JSON.stringify(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits])) !== JSON.stringify(
      source.requirements.map(({ id, minCredits }) => [id, minCredits]),
    )) {
    fail("La proyección alteró los 360 créditos o la distribución por ejes, flexibilidad y TFE.");
  }
  const candidateCodes = new Set(candidates.map(({ bedeliasCode }) => bedeliasCode));
  for (const code of ["ENBA-STAM1", "ENBA-STAM2", "ENBA-SI1", "ENBA-SI2", "ENBA-LTFE1", "ENBA-LTFE2"]) {
    if (!candidateCodes.has(code)) fail(`${code} debe permanecer como candidata recuperable.`);
  }
  const visibleIds = new Set(pathway.periods.flatMap(({ courseIds }) => courseIds));
  if (candidates.some(({ id }) => visibleIds.has(id))) {
    fail("Una candidata técnica ingresó a la malla oficial.");
  }
  if (Object.keys(projection.pathways).length !== 1
    || Object.keys(projection.pathways)[0] !== "bedelias"
    || projection.pathways.bedelias.label.toLocaleLowerCase("es-UY").includes("orientación")) {
    fail("La elección personal no puede crear orientaciones o trayectorias certificadas.");
  }
  if (inventoryEntry?.state !== "official-trajectory-reproduced"
    || inventoryEntry.currentProjection?.primary !== "official-periods"
    || inventoryEntry.evidence?.expectedCoursePlacements !== 36
    || inventoryEntry.evidence?.matchedCoursePlacements !== 36) {
    fail("El inventario no confirmó los ocho períodos y 36 ubicaciones oficiales.");
  }
}

const source = await readJson(sourcePath);
const snapshot = await readJson(snapshotPath);
const previousProjection = await readJson(projectionPath);
validateSource(source, snapshot, previousProjection);
await updateRegistries(source);
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const projection = await readJson(projectionPath);
validateProjection(source, projection, inventory.plans.find(({ planId }) => planId === source.planId));

console.log(`D03al regenerado: Plan 2008 / Implementación 2018, ocho semestres, 360 créditos, 30 identidades técnicas preservadas, seis bloques sólo-fuente y 387 candidatas; ${report.counts.generatedPlans} planes e inventario actualizados.`);
