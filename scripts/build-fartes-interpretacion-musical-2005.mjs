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
const sourceDataPath = "data/fartes/interpretacion-musical-2005.json";
const projectionDataPath = "app/data/bedelias-generated/bedelias-fartes-licenciatura-en-interpretacion-musical-2005.json";
const sourcePath = path.join(projectRoot, sourceDataPath);
const snapshotPath = path.join(projectRoot, "data", "bedelias", "fartes-licenciatura-en-interpretacion-musical-2005.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, projectionDataPath);
const planUrl = "https://www.artes.udelar.edu.uy/wp-content/uploads/2023/09/plan_2005_libro_naranja.pdf";
const careerUrl = "https://www.artes.udelar.edu.uy/carrera/licenciaturas-instituto-de-musica/";
const admissionUrl = "https://www.artes.udelar.edu.uy/wp-content/uploads/2025/10/PRUEBAS-ADMISION-INSTRUMENTOS-LICENCIATURAS-2026.pdf";
const expectedPeriodLabels = [
  "Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4",
  "Semestre 5", "Semestre 6", "Semestre 7", "Semestre 8",
];
const expectedPathwayIds = [
  "opcion-canto", "opcion-clarinete", "opcion-contrabajo", "opcion-corno", "opcion-fagot",
  "opcion-flauta", "opcion-guitarra", "opcion-oboe", "opcion-organo", "opcion-percusion",
  "opcion-piano", "opcion-saxofon", "opcion-trombon", "opcion-trompeta", "opcion-viola",
  "opcion-violin", "opcion-violoncello",
];
const expectedAdmissionLabels = [
  "Canto", "Clarinete", "Contrabajo", "Fagot", "Flauta", "Guitarra", "Oboe", "Órgano",
  "Percusión", "Piano", "Saxofón", "Trompeta", "Viola", "Violín", "Violonchelo",
];

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };

function collectMatterNodes(snapshot) {
  const nodes = [];
  const visit = (node) => {
    if (node?.nodeType === "Materia") nodes.push(node);
    for (const child of node?.children ?? []) visit(child);
  };
  visit(snapshot.plan?.composition);
  return nodes;
}

function expandTechnicalRows(source) {
  const seriesRows = source.technicalSeries.flatMap((series) => Array.from({ length: 8 }, (_, index) => {
    const level = index + 1;
    return {
      seriesId: series.id,
      level,
      sourceCourseId: `${series.sourceCoursePrefix}${level}`,
      progressId: `${series.progressIdPrefix}${level}`,
      officialLabel: `${series.officialLabel} ${level}`,
      credits: series.credits,
      requirementIds: series.requirementIds,
    };
  }));
  return [...source.technicalMatches, ...seriesRows];
}

function allRows(source) {
  return [...expandTechnicalRows(source), ...source.sourceOnlyBlocks];
}

function rowReference(row) {
  return row.sourceOnlyId ?? row.progressId;
}

function instrumentSpecificPeriods(source, trajectory) {
  const series = source.technicalSeries.find(({ id }) => id === trajectory.instrumentSeriesId);
  if (!series) fail(`No existe la serie instrumental ${trajectory.instrumentSeriesId}.`);
  const instrument = (level) => `${series.progressIdPrefix}${level}`;
  return [
    { label: "Semestre 1", courseRefs: [instrument(1), "fartes-eumus-pctc1"] },
    { label: "Semestre 2", courseRefs: [instrument(2), "fartes-eumus-pdc1"] },
    { label: "Semestre 3", courseRefs: [instrument(3), "fartes-eumus-pdc2"] },
    { label: "Semestre 4", courseRefs: [instrument(4), "fartes-eumus-pdc3"] },
    { label: "Semestre 5", courseRefs: [instrument(5)] },
    { label: "Semestre 6", courseRefs: [instrument(6)] },
    { label: "Semestre 7", courseRefs: [instrument(7)] },
    { label: "Semestre 8", courseRefs: [instrument(8), trajectory.graduationRef] },
  ];
}

function trajectorySpecificPeriods(source, trajectory) {
  return trajectory.specificPeriods ?? instrumentSpecificPeriods(source, trajectory);
}

function fullPeriods(source, trajectory) {
  const specificByLabel = new Map(trajectorySpecificPeriods(source, trajectory).map((period) => [period.label, period]));
  return source.sharedPeriods.map((period) => ({
    label: period.label,
    courseIds: [...period.courseRefs, ...(specificByLabel.get(period.label)?.courseRefs ?? [])],
  }));
}

function requirementDefinitions(source) {
  return [
    { id: "common-core", name: "Tronco común", shortName: "Tronco común", minCredits: source.requirements.commonCoreCredits },
    { id: "degree-core", name: "Materias troncales de la Licenciatura", shortName: "Troncales", minCredits: source.requirements.degreeCoreCredits },
    { id: "option-specific", name: "Materias específicas de la opción", shortName: "Opción", minCredits: source.requirements.specificCredits },
    { id: "electives", name: "Asignaturas electivas", shortName: "Electivas", minCredits: source.requirements.electiveCredits },
    { id: "special-projects", name: "Proyectos especiales", shortName: "Proyectos", minCredits: source.requirements.specialProjectsCredits },
    { id: "graduation", name: "Actividad de Graduación", shortName: "Graduación", minCredits: source.requirements.graduationCredits },
  ];
}

function credentialDefinitions(source) {
  return source.trajectories.map((trajectory) => ({
    id: trajectory.id,
    title: trajectory.credentialTitle,
    minTotalCredits: source.publication.minimumCredits,
    nodeRequirements: requirementDefinitions(source).map(({ id, minCredits }) => ({ nodeId: id, minCredits })),
    requiredCourseGroupIds: [],
  }));
}

function buildCourseOverrides(source) {
  return Object.fromEntries(expandTechnicalRows(source).map((row) => [row.sourceCourseId, {
    name: row.officialLabel,
    preserveName: true,
    officialIdentity: true,
    officialCredits: true,
    authorityStatus: "verified",
    creditSourceUrl: planUrl,
  }]));
}

function buildAdditionalCourses(source) {
  return source.sourceOnlyBlocks.map((row) => ({
    id: row.sourceOnlyId,
    sourceCourseId: row.sourceOnlyId,
    name: row.officialLabel,
    credits: row.credits,
    requirementId: row.requirementId,
    sourceUrl: planUrl,
    curricularBlock: true,
  }));
}

function pathRequirementMap() {
  return {
    "tronco comun": "common-core",
    "materias troncales de lic": "degree-core",
    "materias troncales": "degree-core",
    "area practica de conjunto": "degree-core",
    "seminarios de interpretacion": "degree-core",
    "materias especificas de opcion": "option-specific",
    "asignaturas electivas": "electives",
    "de formacion musical": "electives",
    "de foramcion musical": "electives",
    "de formacion no musical": "electives",
    "proyectos especiales": "special-projects",
    "actividad de graduacion": "graduation",
  };
}

function validateSource(source, snapshot, previousProjection) {
  if (source.planId !== "bedelias-fartes-licenciatura-en-interpretacion-musical-2005"
    || source.auditIdentity !== "licenciatura en interpretacion musical:2005"
    || source.publication.planYear !== "2005"
    || source.publication.durationMonths !== 48
    || source.publication.durationSemesters !== 8
    || source.publication.minimumCredits !== 360
    || source.publication.currentAtReview !== true
    || source.scope.campuses.length !== 1
    || source.scope.campuses[0].id !== "montevideo") {
    fail("La evidencia debe conservar Interpretación Musical, Plan 2005, Montevideo, ocho semestres y 360 créditos.");
  }
  if (source.fingerprint?.value !== digest(source.sourcePortions)) fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    if (source.fingerprint.sourceHashes?.[sourceId] !== digest(portion)) fail(`La huella normalizada no coincide para ${sourceId}.`);
  }
  const planSource = source.sources.find(({ id }) => id === "fartes-interpretacion-plan-2005");
  if (planSource?.url !== planUrl
    || planSource.rawContentHash !== "sha256:9994f1c969c824718b2eae0e092b62bd8ed00db7bd6820b1c9121ae67659d335"
    || JSON.stringify(planSource.visuallyInspectedPdfPages) !== JSON.stringify([20, 21])) {
    fail("La URL, huella o inspección visual del Plan 2005 cambió.");
  }
  if (source.sources.find(({ id }) => id === "fartes-interpretacion-current-career-page")?.url !== careerUrl
    || source.sources.find(({ id }) => id === "fartes-interpretacion-admission-2026")?.url !== admissionUrl) {
    fail("Falta la página vigente o la convocatoria de admisión 2026.");
  }
  const admissionFacts = source.sourcePortions["fartes-interpretacion-admission-2026"].facts;
  const currentMentionLabels = source.sourcePortions["fartes-interpretacion-current-career-page"].facts.publishedMentionLabels;
  if (currentMentionLabels.length !== 15
    || !currentMentionLabels.includes("Trompeta")
    || currentMentionLabels.some((label) => ["Corno", "Trombón"].includes(label))) {
    fail("La página vigente debe conservar quince menciones publicadas y excluir Corno/Trombón.");
  }
  if (JSON.stringify(admissionFacts.admissionMentionLabels) !== JSON.stringify(expectedAdmissionLabels)
    || JSON.stringify(admissionFacts.continuityOnlyMentionLabels) !== JSON.stringify(["Corno", "Trombón"])) {
    fail("La convocatoria 2026 debe conservar quince ingresos y Corno/Trombón sólo como continuidad.");
  }
  if (source.bedeliasComparison.snapshotContentHash !== digest(snapshot)) fail("La huella del snapshot de Bedelías ya no coincide.");
  const matterNodes = collectMatterNodes(snapshot);
  const matterCredits = matterNodes.reduce((sum, node) => sum + (Number(node.course?.credits) || 0), 0);
  if (matterNodes.length !== source.bedeliasComparison.compositionEntryCount
    || matterCredits !== source.bedeliasComparison.compositionCredits) {
    fail(`La composición técnica cambió: ${matterNodes.length} entradas y ${matterCredits} créditos.`);
  }

  const technicalRows = expandTechnicalRows(source);
  if (technicalRows.length !== 200 || source.sourceOnlyBlocks.length !== 25) {
    fail("La frontera auditada debe conservar 200 correspondencias técnicas y 25 bloques sólo-fuente.");
  }
  const previousById = new Map(previousProjection.courses.map((course) => [course.id, course]));
  for (const row of technicalRows) {
    const course = previousById.get(row.progressId);
    if (!course
      || course.bedeliasCode !== row.sourceCourseId
      || course.credits !== row.credits
      || !row.requirementIds.every((requirementId) => course.eligibleRequirementIds.includes(requirementId))) {
      fail(`La identidad técnica o el ID de progreso no coincide para ${row.progressId}.`);
    }
  }
  const progressIds = allRows(source).map(({ progressId }) => progressId);
  if (new Set(progressIds).size !== progressIds.length) fail("Los IDs de progreso auditados deben ser únicos.");
  if (JSON.stringify(source.trajectories.map(({ id }) => id)) !== JSON.stringify(expectedPathwayIds)
    || JSON.stringify(source.sharedPeriods.map(({ label }) => label)) !== JSON.stringify(expectedPeriodLabels)) {
    fail("Las diecisiete menciones o los ocho períodos cambiaron de orden.");
  }

  const rowByReference = new Map(allRows(source).map((row) => [rowReference(row), row]));
  const usedReferences = new Set();
  const planFacts = source.sourcePortions["fartes-interpretacion-plan-2005"].facts;
  for (const trajectory of source.trajectories) {
    const periods = fullPeriods(source, trajectory);
    if (JSON.stringify(periods.map(({ label }) => label)) !== JSON.stringify(expectedPeriodLabels)) fail(`${trajectory.id} no conserva ocho semestres.`);
    const placements = periods.flatMap(({ courseIds }) => courseIds);
    const expectedPlacementCount = trajectory.id === "opcion-canto" ? 77 : 58;
    if (placements.length !== expectedPlacementCount || new Set(placements).size !== placements.length) fail(`Las ubicaciones de ${trajectory.id} no coinciden con la grilla oficial.`);
    const periodCredits = periods.map((period) => period.courseIds.reduce((sum, courseRef) => {
      const row = rowByReference.get(courseRef);
      if (!row) fail(`No existe la fila auditada ${courseRef}.`);
      usedReferences.add(courseRef);
      return sum + row.credits;
    }, 0));
    const expectedCredits = trajectory.id === "opcion-canto" ? planFacts.cantoPeriodCreditsFromRows : planFacts.instrumentPeriodCreditsFromRows;
    if (JSON.stringify(periodCredits) !== JSON.stringify(expectedCredits)) fail(`La carga por semestre cambió para ${trajectory.id}: ${periodCredits.join("/")}.`);
    if (periodCredits.reduce((sum, credits) => sum + credits, 0)
      + source.requirements.electiveCredits + source.requirements.specialProjectsCredits !== 360) {
      fail(`Los mínimos de ${trajectory.id} no cierran 360 créditos.`);
    }
  }
  if (usedReferences.size !== allRows(source).length) fail("Hay identidades auditadas que no aparecen en ninguna grilla.");
  for (const field of ["durationMonths", "currentOptions", "cantoSemester3StageCredits", "cantoSemester5Counterpoint", "ambiguousTechnicalAliases", "flatFlexibleOffer"]) {
    if (!source.conflicts.some((conflict) => conflict.field === field)) fail(`Falta conservar el conflicto ${field}.`);
  }
}

function buildAudit(source) {
  const trajectories = source.trajectories.map((trajectory) => ({
    id: trajectory.id,
    label: trajectory.label,
    description: trajectory.description ?? (trajectory.admissionStatus === "continuity-only"
      ? "Mención oficial de continuidad registrada en Bedelías, sin ingreso publicado en la convocatoria 2026."
      : "Mención oficial incluida en la convocatoria de admisión 2026."),
    credentialId: trajectory.id,
    campusIds: ["montevideo"],
    useOnlyConfiguredPeriods: true,
    restrictGeneratedCatalogToPublished: true,
    catalogSourceCourseIds: [],
    periods: fullPeriods(source, trajectory),
    sourceUrl: planUrl,
  }));
  return {
    identity: source.auditIdentity,
    career: "LICENCIATURA EN INTERPRETACIÓN MUSICAL",
    planYear: source.publication.planYear,
    reviewedAt: source.reviewedAt,
    status: "official-evidence-complete",
    scope: "vigencia, Plan 2005, diecisiete menciones, ocho semestres, 360 créditos, admisión 2026 y mínimos flexibles",
    publicationEligible: false,
    officialPlan: {
      approval: ["Plan de Estudios 2005 de la Escuela Universitaria de Música, vigente en el Instituto de Música de Facultad de Artes"],
      planYear: source.publication.planYear,
      effectiveFrom: source.publication.effectiveFrom,
      title: source.publication.credential,
      careerName: "Licenciatura en Interpretación Musical",
      facultyCode: "FARTES",
      facultyName: "Facultad de Artes",
      durationMonths: source.publication.durationMonths,
      semesters: source.publication.durationSemesters,
      minimumCredits: source.publication.minimumCredits,
      current: source.publication.currentAtReview,
      pathwayLabel: "Mención",
      trajectories,
      degreeRule: "El título exige 360 créditos: 138 de tronco común, 18 troncales de la Licenciatura, 152 específicos de la mención, 29 electivos, 8 en al menos dos proyectos especiales y 15 de Actividad de Graduación. Electivas y proyectos son mínimos flexibles, no obligaciones acumulativas de todo el catálogo.",
      curriculum: {
        useBedeliasCompositionTree: true,
        usePublishedCredits: true,
        deduplicateSharedProfileCourses: true,
        strictOfficialCourseIds: true,
        sourceUrl: planUrl,
        sourceDataPath,
        includeAllCoursesInPathwayCatalog: false,
        pathRequirementMap: pathRequirementMap(),
        courseOverrides: buildCourseOverrides(source),
        additionalCourses: buildAdditionalCourses(source),
        periodOrder: expectedPeriodLabels,
        pathwayLabel: "Mención",
        creditRequirements: requirementDefinitions(source),
        credentials: credentialDefinitions(source),
        projectionAnomalies: source.conflicts,
      },
    },
    offerings: [{
      serviceCode: "FARTES",
      locations: ["Montevideo"],
      role: "oferta completa del Instituto de Música de Facultad de Artes",
      curriculumVariant: false,
      pathwayIds: expectedPathwayIds,
    }],
    bedeliasComparison: {
      canonicalSnapshot: source.bedeliasComparison.snapshotPath,
      metadataCurrent: true,
      publishedDurationMonths: 60,
      publishedMinimumCredits: source.publication.minimumCredits,
      publishedProfileTitles: expectedPathwayIds.length,
      compositionMatterEntries: source.bedeliasComparison.compositionEntryCount,
      compositionOfferedCredits: source.bedeliasComparison.compositionCredits,
      exactVerifiedEntries: source.bedeliasComparison.verifiedTechnicalCourseCount,
      sourceOnlyEntries: source.bedeliasComparison.sourceOnlyGridBlockCount,
      candidateEntriesPreserved: source.bedeliasComparison.candidateRetainedCount,
      interpretation: source.bedeliasComparison.interpretation,
    },
    conclusion: {
      canonicalModel: "one-degree-seventeen-certified-mentions",
      regionalCurriculumVariant: false,
      siteSpecificTrajectoryAvailability: false,
      trajectoryStatus: "official-trajectory-reproduced",
      trajectorySourceDataPath: sourceDataPath,
      reason: "El Plan 2005 publica una grilla común para dieciséis instrumentos y una grilla propia para Canto, todas de ocho semestres y 360 créditos.",
      normalization: [
        "Conservar diecisiete menciones, incluida Canto, con un tronco común y troncales compartidos sin duplicar IDs de progreso.",
        "Reproducir la grilla instrumental y la grilla propia de Canto durante ocho semestres.",
        "Preservar 200 identidades técnicas inequívocas y 25 bloques sólo-fuente donde el Plan no resuelve aliases de Bedelías.",
        "Controlar electivas y proyectos como mínimos flexibles sin sumar todas las alternativas del catálogo.",
        "Mantener Corno y Trombón como continuidad sin presentarlos como ingreso abierto en 2026.",
        "Mantener separadas Licenciatura en Música 2005 y las cuatro carreras históricas de 1987.",
      ],
    },
    sources: source.sources.map((entry) => ({
      url: entry.url,
      authority: entry.authority,
      supports: entry.supports,
      contentHash: entry.rawContentHash ?? source.fingerprint.sourceHashes[entry.id],
    })),
    anomalies: source.conflicts,
    uiNotice: "Plan 2005 de ocho semestres y 360 créditos en Montevideo. Elegís una de diecisiete menciones; Corno y Trombón se conservan como continuidad sin ingreso publicado en 2026. Electivas y proyectos son mínimos flexibles.",
    remainingWork: "Las ediciones concretas de electivas, proyectos, seminarios y los aliases técnicos ambiguos permanecen candidatas hasta contar con una fuente curricular que confirme su identidad.",
    sourceEvidence: {
      sourceDataPath,
      normalizedFingerprint: source.fingerprint.value,
      planContentHash: source.sources.find(({ id }) => id === "fartes-interpretacion-plan-2005").rawContentHash,
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
    scope: { territories: ["Montevideo"], pathwayIds: expectedPathwayIds },
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
      periodField: "specificPeriods",
      projectionPeriodField: "periods",
      sharedPeriodsField: "sharedPeriods",
      sourceCourseIdsField: "courseRefs",
      compareCoursePlacements: true,
    },
    conflictNotes: source.conflicts.map(({ resolution }) => resolution),
  };
}

async function updateRegistries(source) {
  const audits = await readJson(auditsPath);
  const auditIndex = audits.audits.findIndex(({ identity }) => identity === source.auditIdentity);
  if (auditIndex < 0) fail("No existe la auditoría previa de Interpretación Musical.");
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

function validateProjection(source, projection, inventory) {
  const technicalRows = expandTechnicalRows(source);
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const expectedVerified = technicalRows.length + source.sourceOnlyBlocks.length + 1;
  if (verified.length !== expectedVerified
    || candidates.length !== source.bedeliasComparison.candidateRetainedCount
    || projection.courses.length !== expectedVerified + source.bedeliasComparison.candidateRetainedCount
    || projection.plan.courseCatalogAuditStatus !== "partial") {
    fail(`La frontera esperada es ${expectedVerified} verificadas y ${source.bedeliasComparison.candidateRetainedCount} candidatas; resultó ${verified.length}/${candidates.length}.`);
  }
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  for (const row of technicalRows) {
    const course = courseById.get(row.progressId);
    if (!course || course.authorityStatus !== "verified" || course.bedeliasCode !== row.sourceCourseId
      || course.name !== row.officialLabel || course.credits !== row.credits) {
      fail(`La proyección alteró la identidad, nombre o carga de ${row.progressId}.`);
    }
  }
  for (const row of source.sourceOnlyBlocks) {
    const course = courseById.get(row.progressId);
    if (!course || course.authorityStatus !== "verified" || course.sourceCourseId !== row.sourceOnlyId
      || course.bedeliasCode || course.name !== row.officialLabel || course.credits !== row.credits) {
      fail(`La proyección alteró el bloque sólo-fuente ${row.sourceOnlyId}.`);
    }
  }
  const candidateIds = new Set(candidates.map(({ id }) => id));
  for (const id of [
    "fartes-iu24-2", "fartes-iu23-2", "fartes-eumus-iun", "fartes-eumus-arm1", "fartes-eumus-armo1",
    "fartes-eumus-rep1", "fartes-eumus-rpt1", "fartes-eumus-sin1", "fartes-eumus-ppa1", "fartes-eumus-ppac2",
  ]) {
    if (!candidateIds.has(id)) fail(`${id} debe permanecer candidata recuperable.`);
  }

  const sourceOnlyProgress = new Map(source.sourceOnlyBlocks.map((row) => [row.sourceOnlyId, row.progressId]));
  const projectedPathways = projection.publishedPathways ?? {};
  const visibleIds = new Set();
  for (const trajectory of source.trajectories) {
    const projected = projectedPathways[trajectory.id];
    const expectedPeriods = fullPeriods(source, trajectory).map((period) => ({
      label: period.label,
      courseIds: period.courseIds.map((reference) => sourceOnlyProgress.get(reference) ?? reference),
    }));
    const expectedPlacementCount = trajectory.id === "opcion-canto" ? 77 : 58;
    if (!projected || projected.credentialId !== trajectory.id
      || JSON.stringify(projected.periods) !== JSON.stringify(expectedPeriods)
      || projected.periods.length !== 8
      || projected.periods.flatMap(({ courseIds }) => courseIds).length !== expectedPlacementCount
      || projected.catalogCourseIds) {
      fail(`La proyección no reproduce exactamente los ocho semestres de ${trajectory.id}.`);
    }
    for (const id of projected.periods.flatMap(({ courseIds }) => courseIds)) visibleIds.add(id);
  }
  if (candidates.some(({ id }) => visibleIds.has(id))) fail("Una candidata técnica ingresó a las grillas oficiales.");
  const sharedProgressIds = source.sharedPeriods.flatMap(({ courseRefs }) => courseRefs)
    .map((reference) => sourceOnlyProgress.get(reference) ?? reference);
  for (const sharedId of sharedProgressIds) {
    if (!expectedPathwayIds.every((pathwayId) => projectedPathways[pathwayId].periods.some(({ courseIds }) => courseIds.includes(sharedId)))) {
      fail(`El tronco compartido duplicó o perdió ${sharedId}.`);
    }
  }

  const nodesById = new Map(projection.creditStructure.nodes.map((node) => [node.id, node]));
  if (projection.creditStructure.credentials.length !== 17) fail("Deben conservarse diecisiete credenciales de mención.");
  for (const credential of projection.creditStructure.credentials) {
    const rootCredits = credential.nodeRequirements
      .filter(({ nodeId }) => nodesById.get(nodeId)?.parentId === "plan-total")
      .reduce((sum, requirement) => sum + requirement.minCredits, 0);
    if (credential.minTotalCredits !== 360 || rootCredits !== 360) fail(`Los mínimos de ${credential.id} no cierran 360 créditos.`);
  }
  if (projection.source?.careerPage !== careerUrl) fail("La proyección perdió la página vigente de Facultad de Artes.");
  if (!/Corno y Trombón.*continuidad/i.test(projection.plan.notice)
    || !/Electivas y proyectos.*mínimos flexibles/i.test(projection.plan.notice)) {
    fail("La UI debe explicar la continuidad sin ingreso y la flexibilidad no acumulativa.");
  }

  const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
  if (inventoryEntry?.state !== "official-trajectory-reproduced"
    || inventoryEntry.currentProjection?.primary !== "official-periods"
    || inventoryEntry.evidence?.expectedCoursePlacements !== 1005
    || inventoryEntry.evidence?.matchedCoursePlacements !== 1005) {
    fail("El inventario no confirmó las diecisiete grillas y sus 1005 ubicaciones oficiales.");
  }
  for (const separatedPlanId of source.authorityPolicy.separatedPlanIds) {
    if (!inventory.plans.some(({ planId }) => planId === separatedPlanId)) fail(`La auditoría no puede absorber ni eliminar ${separatedPlanId}.`);
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
validateProjection(source, projection, inventory);

console.log(`D03an regenerado: diecisiete menciones, ocho semestres, 360 créditos, 200 identidades técnicas (más una ocurrencia duplicada de PC2), 25 bloques sólo-fuente y 824 candidatas; ${report.counts.generatedPlans} planes e inventario actualizados.`);
