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
const sourceDataPath = "data/fartes/musica-2005.json";
const projectionDataPath = "app/data/bedelias-generated/bedelias-fartes-licenciatura-en-musica-2005.json";
const sourcePath = path.join(projectRoot, sourceDataPath);
const snapshotPath = path.join(projectRoot, "data", "bedelias", "fartes-licenciatura-en-musica-2005.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, projectionDataPath);
const planUrl = "https://www.artes.udelar.edu.uy/wp-content/uploads/2023/09/plan_2005_libro_naranja.pdf";
const careerUrl = "https://www.artes.udelar.edu.uy/carrera/licenciaturas-instituto-de-musica/";
const expectedPathwayIds = ["composicion", "direccion-de-coro", "direccion-de-orquesta", "musicologia"];
const expectedPeriodLabels = [
  "Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4",
  "Semestre 5", "Semestre 6", "Semestre 7", "Semestre 8",
];
const expectedPlacementCounts = {
  composicion: 56,
  "direccion-de-coro": 61,
  "direccion-de-orquesta": 55,
  musicologia: 51,
};

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

function allRows(source) {
  return [...source.technicalMatches, ...source.sourceOnlyBlocks];
}

function rowReference(row) {
  return row.sourceOnlyId ?? row.progressId;
}

function fullPeriods(source, trajectory) {
  const specificByLabel = new Map(trajectory.specificPeriods.map((period) => [period.label, period]));
  return source.sharedPeriods.map((period) => ({
    label: period.label,
    courseIds: [...period.courseRefs, ...(specificByLabel.get(period.label)?.courseRefs ?? [])],
  }));
}

function requirementDefinitions(source) {
  const common = [{
    id: "common-core",
    name: "Tronco común",
    shortName: "Tronco común",
    minCredits: source.requirements.commonCoreCredits,
  }];
  const definitions = [
    ["composicion", "composition", "Composición"],
    ["direccion-de-coro", "chorus", "Dirección de Coro"],
    ["direccion-de-orquesta", "orchestra", "Dirección de Orquesta"],
    ["musicologia", "musicology", "Musicología"],
  ];
  return [...common, ...definitions.flatMap(([pathwayId, prefix, label]) => {
    const requirement = source.requirements.pathways[pathwayId];
    return [
      { id: `${prefix}-degree-core`, name: `${label} · materias troncales`, shortName: "Troncales", minCredits: source.requirements.degreeCoreCredits },
      { id: `${prefix}-specific`, name: `${label} · materias específicas`, shortName: "Específicas", minCredits: requirement.specificCredits },
      { id: `${prefix}-electives`, name: `${label} · asignaturas electivas`, shortName: "Electivas", minCredits: requirement.electiveCredits },
      { id: `${prefix}-musical-electives`, parentId: `${prefix}-electives`, name: `${label} · electivas musicales`, shortName: "Musicales", minCredits: requirement.musicalElectiveMinimum },
      { id: `${prefix}-non-musical-electives`, parentId: `${prefix}-electives`, name: `${label} · electivas no musicales`, shortName: "No musicales", minCredits: requirement.nonMusicalElectiveMinimum },
      { id: `${prefix}-projects`, name: `${label} · proyectos especiales`, shortName: "Proyectos", minCredits: source.requirements.specialProjectsCredits },
    ];
  })];
}

function credentialDefinitions(source) {
  const definitions = [
    ["composicion", "composition", "Composición"],
    ["direccion-de-coro", "chorus", "Dirección de Coro"],
    ["direccion-de-orquesta", "orchestra", "Dirección de Orquesta"],
    ["musicologia", "musicology", "Musicología"],
  ];
  return definitions.map(([pathwayId, prefix, label]) => {
    const requirement = source.requirements.pathways[pathwayId];
    return {
      id: pathwayId,
      title: `Licenciado en Música opción ${label}`,
      minTotalCredits: source.publication.minimumCredits,
      nodeRequirements: [
        { nodeId: "common-core", minCredits: source.requirements.commonCoreCredits },
        { nodeId: `${prefix}-degree-core`, minCredits: source.requirements.degreeCoreCredits },
        { nodeId: `${prefix}-specific`, minCredits: requirement.specificCredits },
        { nodeId: `${prefix}-electives`, minCredits: requirement.electiveCredits },
        { nodeId: `${prefix}-musical-electives`, minCredits: requirement.musicalElectiveMinimum },
        { nodeId: `${prefix}-non-musical-electives`, minCredits: requirement.nonMusicalElectiveMinimum },
        { nodeId: `${prefix}-projects`, minCredits: source.requirements.specialProjectsCredits },
      ],
      requiredCourseGroupIds: [],
    };
  });
}

function buildCourseOverrides(source) {
  return Object.fromEntries(source.technicalMatches.map((row) => [row.overrideKey ?? row.sourceCourseId, {
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
    1092: "musicology-degree-core",
    1134: "orchestra-specific",
    1263: "orchestra-degree-core",
    1315: "chorus-electives",
    1365: "orchestra-projects",
    1457: "musicology-specific",
    1532: "chorus-degree-core",
    1588: "composition-projects",
    1634: "chorus-specific",
    1648: "composition-specific",
    1653: "chorus-projects",
    1678: "musicology-projects",
    1682: "composition-electives",
    1735: "orchestra-electives",
    1771: "musicology-electives",
    1814: "composition-degree-core",
    2929: "common-core",
    4163: "musicology-non-musical-electives",
    4226: "chorus-musical-electives",
    4462: "orchestra-musical-electives",
    4614: "chorus-non-musical-electives",
    4675: "orchestra-non-musical-electives",
    4907: "composition-non-musical-electives",
    4928: "composition-musical-electives",
    5192: "musicology-musical-electives",
  };
}

function validateSource(source, snapshot, previousProjection) {
  if (source.planId !== "bedelias-fartes-licenciatura-en-musica-2005"
    || source.auditIdentity !== "licenciatura en musica:2005"
    || source.publication.planYear !== "2005"
    || source.publication.durationMonths !== 48
    || source.publication.durationSemesters !== 8
    || source.publication.minimumCredits !== 360
    || source.publication.currentAtReview !== true
    || source.scope.campuses.length !== 1
    || source.scope.campuses[0].id !== "montevideo") {
    fail("La evidencia debe conservar el Plan 2005, Montevideo, ocho semestres y 360 créditos.");
  }
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    if (source.fingerprint.sourceHashes?.[sourceId] !== digest(portion)) {
      fail(`La huella normalizada no coincide para ${sourceId}.`);
    }
  }
  const planSource = source.sources.find(({ id }) => id === "fartes-musica-plan-2005");
  if (planSource?.url !== planUrl
    || planSource.rawContentHash !== "sha256:9994f1c969c824718b2eae0e092b62bd8ed00db7bd6820b1c9121ae67659d335"
    || JSON.stringify(planSource.visuallyInspectedPdfPages) !== JSON.stringify([16, 17, 18, 19])) {
    fail("La URL, huella o inspección visual del Plan 2005 cambió.");
  }
  if (source.sources.find(({ id }) => id === "fartes-musica-current-career-page")?.url !== careerUrl) {
    fail("Falta la página vigente del Instituto de Música.");
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

  if (source.technicalMatches.length !== 93 || source.sourceOnlyBlocks.length !== 10) {
    fail("La frontera auditada debe conservar 93 correspondencias técnicas y diez bloques sólo-fuente.");
  }
  const previousById = new Map(previousProjection.courses.map((course) => [course.id, course]));
  for (const row of source.technicalMatches) {
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
    fail("Las cuatro opciones o los ocho períodos cambiaron de orden.");
  }
  const rowByReference = new Map(allRows(source).map((row) => [rowReference(row), row]));
  const usedReferences = new Set();
  for (const trajectory of source.trajectories) {
    const periods = fullPeriods(source, trajectory);
    if (JSON.stringify(periods.map(({ label }) => label)) !== JSON.stringify(expectedPeriodLabels)) {
      fail(`La opción ${trajectory.id} no conserva ocho semestres.`);
    }
    const placements = periods.flatMap(({ courseIds }) => courseIds);
    if (placements.length !== expectedPlacementCounts[trajectory.id] || new Set(placements).size !== placements.length) {
      fail(`Las ubicaciones de ${trajectory.id} no coinciden con la grilla oficial.`);
    }
    const periodCredits = periods.map((period) => period.courseIds.reduce((sum, courseRef) => {
      const row = rowByReference.get(courseRef);
      if (!row) fail(`No existe la fila auditada ${courseRef}.`);
      usedReferences.add(courseRef);
      return sum + row.credits;
    }, 0));
    const expectedCredits = source.sourcePortions["fartes-musica-plan-2005"].facts.pathways[trajectory.id].periodCreditsFromRows;
    if (JSON.stringify(periodCredits) !== JSON.stringify(expectedCredits)) {
      fail(`La carga por semestre cambió para ${trajectory.id}: ${periodCredits.join("/")}.`);
    }
    const requirement = source.requirements.pathways[trajectory.id];
    if (periodCredits.reduce((sum, credits) => sum + credits, 0)
      + requirement.electiveCredits + source.requirements.specialProjectsCredits !== 360) {
      fail(`Los mínimos de ${trajectory.id} no cierran 360 créditos.`);
    }
  }
  if (usedReferences.size !== allRows(source).length) fail("Hay identidades auditadas que no aparecen en ninguna grilla.");
  for (const field of ["compositionSemester5Subtotal", "musicologySemester8Subtotal", "musicologySemester4SpecificRow", "ambiguousTechnicalAliases"]) {
    if (!source.conflicts.some((conflict) => conflict.field === field)) fail(`Falta conservar el conflicto ${field}.`);
  }
}

function buildAudit(source) {
  const trajectories = source.trajectories.map((trajectory) => ({
    id: trajectory.id,
    label: trajectory.label,
    description: trajectory.description,
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
    career: "LICENCIATURA EN MÚSICA",
    planYear: source.publication.planYear,
    reviewedAt: source.reviewedAt,
    status: "official-evidence-complete",
    scope: "vigencia, Plan 2005, título, sede, cuatro opciones certificadas, ocho semestres por opción, 360 créditos y mínimos flexibles",
    publicationEligible: false,
    officialPlan: {
      approval: ["Plan de Estudios 2005 de la Escuela Universitaria de Música, vigente en el Instituto de Música de Facultad de Artes"],
      planYear: source.publication.planYear,
      effectiveFrom: source.publication.effectiveFrom,
      title: source.publication.credential,
      careerName: "Licenciatura en Música",
      facultyCode: "FARTES",
      facultyName: "Facultad de Artes",
      durationMonths: source.publication.durationMonths,
      semesters: source.publication.durationSemesters,
      minimumCredits: source.publication.minimumCredits,
      current: source.publication.currentAtReview,
      pathwayLabel: "Opción",
      trajectories,
      degreeRule: "El título exige 360 créditos y expresa la opción elegida. Las cuatro opciones comparten 138 créditos de Tronco Común, 12 troncales de Licenciatura y 8 de al menos dos proyectos especiales; los mínimos específicos y electivos completan 360 sin volver obligatoria toda la oferta flexible.",
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
        pathwayLabel: "Opción",
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
      publishedProfileTitles: 4,
      compositionMatterEntries: source.bedeliasComparison.compositionEntryCount,
      compositionOfferedCredits: source.bedeliasComparison.compositionCredits,
      exactVerifiedEntries: source.bedeliasComparison.verifiedTechnicalCourseCount,
      sourceOnlyEntries: source.bedeliasComparison.sourceOnlyGridBlockCount,
      candidateEntriesPreserved: source.bedeliasComparison.candidateRetainedCount,
      interpretation: source.bedeliasComparison.interpretation,
    },
    conclusion: {
      canonicalModel: "one-degree-four-certified-options",
      regionalCurriculumVariant: false,
      siteSpecificTrajectoryAvailability: false,
      trajectoryStatus: "official-trajectory-reproduced",
      trajectorySourceDataPath: sourceDataPath,
      reason: "El Plan 2005 y la página vigente publican una única Licenciatura en Música con cuatro opciones certificadas, cada una organizada en ocho semestres y con mínimos flexibles propios.",
      normalization: [
        "Conservar un único plan y progreso para Composición, Dirección de Coro, Dirección de Orquesta y Musicología.",
        "Reproducir las cuatro grillas de ocho semestres con el mismo tronco común y los mismos IDs de progreso compartidos.",
        "Preservar 93 identidades técnicas inequívocas y crear diez bloques sólo-fuente donde los aliases de Bedelías no se pueden resolver.",
        "Controlar 360 créditos y los mínimos electivos y de proyectos sin convertir catálogos variables en obligaciones acumulativas.",
        "Mantener separadas Interpretación Musical 2005 y las cuatro carreras históricas de 1987.",
        "Conservar explícitas las contradicciones de subtotales y la fila de Musicología sin prorratear créditos.",
      ],
    },
    sources: source.sources.map((entry) => ({
      url: entry.url,
      authority: entry.authority,
      supports: entry.supports,
      contentHash: entry.rawContentHash ?? source.fingerprint.sourceHashes[entry.id],
    })),
    anomalies: source.conflicts,
    uiNotice: "Plan 2005 de ocho semestres y 360 créditos en Montevideo. Elegís Composición, Dirección de Coro, Dirección de Orquesta o Musicología; cada opción reproduce su grilla y conserva electivas y proyectos como mínimos flexibles.",
    remainingWork: "Las ediciones concretas de electivas, proyectos especiales y aliases técnicos ambiguos permanecen candidatas hasta que una fuente curricular vigente confirme su identidad y pertenencia.",
    sourceEvidence: {
      sourceDataPath,
      normalizedFingerprint: source.fingerprint.value,
      planContentHash: source.sources.find(({ id }) => id === "fartes-musica-plan-2005").rawContentHash,
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
      pathwayIds: expectedPathwayIds,
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
  if (auditIndex < 0) fail("No existe la auditoría previa de Licenciatura en Música.");
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
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  if (verified.length !== 103
    || candidates.length !== source.bedeliasComparison.candidateRetainedCount
    || projection.courses.length !== 666
    || projection.plan.courseCatalogAuditStatus !== "partial") {
    fail(`La frontera esperada es 103 verificadas y 563 candidatas; resultó ${verified.length}/${candidates.length}.`);
  }
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  for (const row of source.technicalMatches) {
    const course = courseById.get(row.progressId);
    if (!course
      || course.authorityStatus !== "verified"
      || course.bedeliasCode !== row.sourceCourseId
      || course.name !== row.officialLabel
      || course.credits !== row.credits) {
      fail(`La proyección alteró la identidad, nombre o carga de ${row.progressId}.`);
    }
  }
  for (const row of source.sourceOnlyBlocks) {
    const course = courseById.get(row.progressId);
    if (!course
      || course.authorityStatus !== "verified"
      || course.sourceCourseId !== row.sourceOnlyId
      || course.bedeliasCode
      || course.name !== row.officialLabel
      || course.credits !== row.credits) {
      fail(`La proyección alteró el bloque sólo-fuente ${row.sourceOnlyId}.`);
    }
  }
  const candidateIds = new Set(candidates.map(({ id }) => id));
  for (const id of [
    "fartes-iu24-2", "fartes-iu23-2", "fartes-eumus-iun",
    "fartes-eumus-arm1", "fartes-eumus-armo1", "fartes-eumus-rep1", "fartes-eumus-rpt1",
    "fartes-eumus-tvoc2", "fartes-eumus-tvo2", "fartes-eumus-tvoc3", "fartes-eumus-tvo3",
    "fartes-eumus-camp-2", "fartes-eumus-comp1-2",
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
    if (!projected
      || projected.credentialId !== trajectory.id
      || JSON.stringify(projected.periods) !== JSON.stringify(expectedPeriods)
      || projected.periods.length !== 8
      || projected.periods.flatMap(({ courseIds }) => courseIds).length !== expectedPlacementCounts[trajectory.id]
      || projected.catalogCourseIds) {
      fail(`La proyección no reproduce exactamente los ocho semestres de ${trajectory.id}.`);
    }
    for (const id of projected.periods.flatMap(({ courseIds }) => courseIds)) visibleIds.add(id);
    const periodCredits = projected.periods.map((period) => period.courseIds.reduce((sum, id) => sum + courseById.get(id).credits, 0));
    const expectedCredits = source.sourcePortions["fartes-musica-plan-2005"].facts.pathways[trajectory.id].periodCreditsFromRows;
    if (JSON.stringify(periodCredits) !== JSON.stringify(expectedCredits)) {
      fail(`La carga visible por semestre cambió para ${trajectory.id}.`);
    }
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
  if (projection.creditStructure.credentials.length !== 4) fail("Deben conservarse cuatro credenciales de opción.");
  for (const credential of projection.creditStructure.credentials) {
    const rootCredits = credential.nodeRequirements
      .filter(({ nodeId }) => nodesById.get(nodeId)?.parentId === "plan-total")
      .reduce((sum, requirement) => sum + requirement.minCredits, 0);
    if (credential.minTotalCredits !== 360 || rootCredits !== 360) {
      fail(`Los mínimos de ${credential.id} no cierran 360 créditos.`);
    }
  }
  if (projection.source?.careerPage !== careerUrl) fail("La proyección perdió la página vigente de Facultad de Artes.");
  if (!/electivas y proyectos como mínimos flexibles/i.test(projection.plan.notice)) {
    fail("La UI debe explicar la flexibilidad no acumulativa del Plan 2005.");
  }

  const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
  if (inventoryEntry?.state !== "official-trajectory-reproduced"
    || inventoryEntry.currentProjection?.primary !== "official-periods"
    || inventoryEntry.evidence?.expectedCoursePlacements !== 223
    || inventoryEntry.evidence?.matchedCoursePlacements !== 223) {
    fail("El inventario no confirmó las cuatro grillas y sus 223 ubicaciones oficiales.");
  }
  for (const separatedPlanId of source.authorityPolicy.separatedPlanIds) {
    if (!inventory.plans.some(({ planId }) => planId === separatedPlanId)) {
      fail(`La auditoría no puede absorber ni eliminar ${separatedPlanId}.`);
    }
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

console.log(`D03am regenerado: cuatro opciones, ocho semestres por opción, 360 créditos, 93 identidades técnicas preservadas, diez bloques sólo-fuente y 563 candidatas; ${report.counts.generatedPlans} planes e inventario actualizados.`);
