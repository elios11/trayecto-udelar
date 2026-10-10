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
const sourceDataPath = "data/cucel/sistemas-integrados-produccion-agropecuaria-2022-trajectory-review.json";
const projectionDataPath = "app/data/bedelias-generated/bedelias-cucel-tecnologo-en-sistemas-integrados-de-produccion-agropecuaria-2022.json";
const sourcePath = path.join(projectRoot, sourceDataPath);
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, projectionDataPath);
const impoUrl = "https://impo.com.uy/diariooficial/2023/06/26/avisos.pdf";
const bedeliasUrl = "https://bedelias.udelar.edu.uy/views/public/desktop/consultarPlan/consultarPlan01.xhtml?cid=1";
const expectedPeriodLabels = ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5", "Semestre 6"];

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };
const sameMembers = (actual, expected) => actual.length === expected.length
  && new Set(actual).size === actual.length
  && actual.every((value) => expected.includes(value));

function validateSource(source) {
  if (source.planId !== "bedelias-cucel-tecnologo-en-sistemas-integrados-de-produccion-agropecuaria-2022"
    || source.publication.officialPlanYear !== "2022"
    || source.publication.durationMonths !== 36
    || source.publication.durationSemesters !== 6
    || source.publication.minimumCredits !== 270
    || source.publication.openEnrollmentAtReview !== null) {
    fail("La evidencia debe conservar Plan 2022, seis semestres, 270 créditos y ausencia de afirmación de inscripción abierta.");
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
  const impo = source.sources.find(({ id }) => id === "impo-plan-2023");
  if (impo?.visualInspection?.status !== "blocked"
    || (impo.visualInspection.visuallyInspectedPdfPages ?? []).length !== 0
    || !/Cache miss/i.test(impo.visualInspection.reason)) {
    fail("El límite visual del PDF IMPO debe quedar explícito y no puede declararse inspección visual.");
  }
  if (source.creditModel.totals.mandatoryCourses !== 167
    || source.creditModel.totals.flexible !== 79
    || source.creditModel.totals.finalProject !== 24
    || source.creditModel.totals.degree !== 270) {
    fail("La evidencia debe cerrar 167 + 79 + 24 = 270 créditos.");
  }
  const sourceCourseIds = source.courses.map(({ sourceCourseId }) => sourceCourseId);
  if (source.courses.length !== 40 || new Set(sourceCourseIds).size !== 40
    || sourceCourseIds.includes("O31T") || sourceCourseIds.includes("CUT-O31T")) {
    fail("La frontera curricular debe contener 40 identidades del Plan y excluir O31T/CUT-O31T.");
  }
  if (!sameMembers(source.projectionBaseline.verifiedBedeliasSourceCourseIds, ["SPS"])
    || !source.projectionBaseline.candidateBedeliasSourceCourseIds.includes("O31T")
    || !source.projectionBaseline.candidateBedeliasSourceCourseIds.includes("CUT-O31T")
    || !source.projectionBaseline.candidateBedeliasSourceCourseIds.includes("CUT-MITMR")
    || !source.projectionBaseline.candidateBedeliasSourceCourseIds.includes("CUT-O33T")) {
    fail("Sólo SPS puede promoverse desde Bedelías; O31T, MIMR/IERN técnicos y el resto deben seguir candidatos.");
  }
  let placements = 0;
  for (const trajectory of source.trajectories) {
    if (JSON.stringify(trajectory.periods.map(({ label }) => label)) !== JSON.stringify(expectedPeriodLabels)) {
      fail(`La trayectoria ${trajectory.id} no conserva los seis semestres oficiales.`);
    }
    placements += trajectory.periods.reduce((sum, period) => sum + period.courseIds.length, 0);
  }
  if (!sameMembers(source.trajectories.map(({ id }) => id), source.projectionBaseline.pathwayIds)
    || placements !== source.projectionBaseline.expectedCoursePlacements
    || placements !== 124) {
    fail("Las cuatro proyecciones deben conservar 124 ubicaciones oficiales cotejables.");
  }
  if (source.trajectories.find(({ id }) => id === "recursos-naturales")?.specificOptionalGridPublished !== false
    || source.trajectories.find(({ id }) => id === "personalizada")?.specificOptionalGridPublished !== false) {
    fail("No puede inventarse una grilla optativa para Recursos Naturales ni para la trayectoria personalizada.");
  }
}

function buildAudit(source) {
  const sourceOnlyBlocks = source.courses
    .filter(({ model }) => model === "source-only-block")
    .map((course) => ({
      id: course.sourceCourseId,
      sourceCourseId: course.sourceCourseId,
      name: course.officialName,
      requirementId: course.requirementId,
      periodLabel: "Estructura oficial sin carga individual publicada",
      sourceUrl: impoUrl,
      curricularBlock: true,
      ...(course.optional === true ? { elective: true, catalogRole: "official-plan-option" } : { catalogRole: "official-semester-block" }),
      creditsPublished: false,
      officialCredits: false,
      creditsProvenance: "official-source-no-load",
      availabilityStatus: "published-plan-identity-no-current-offering-asserted",
    }));
  const structuralBlocks = [
    {
      id: "sistemas-integrados-obligatorios-no-individualizados",
      name: "Créditos obligatorios de Sistemas Integrados no individualizados en Bedelías",
      credits: 5,
      requirementId: "integrated-production",
      periodLabel: "Ajustes estructurales del plan",
      curricularBlock: true,
      officialCredits: false,
      creditsProvenance: "derived-structural-balance",
    },
    {
      id: "flexibles-adicionales-validados",
      name: "Optativas o electivas adicionales validadas por la Comisión de Carrera",
      credits: 3,
      requirementId: "flexible-credits",
      periodLabel: "Ajustes estructurales del plan",
      curricularBlock: true,
      officialCredits: false,
      creditsProvenance: "derived-structural-balance",
    },
    {
      id: "trabajo-final",
      sourceCourseId: "TF",
      name: "Trabajo Final: pasantía académica o proyecto de conclusión de carrera",
      credits: 24,
      requirementId: "final-project",
      periodLabel: "Semestre 6",
      curricularBlock: true,
      sourceUrl: impoUrl,
    },
  ];
  const trajectories = source.trajectories.map((trajectory) => ({
    id: trajectory.id,
    label: trajectory.label,
    description: trajectory.description,
    useOnlyConfiguredPeriods: true,
    periods: trajectory.periods.map(({ label, courseIds }) => ({ label, courseIds })),
    catalogSourceCourseIds: source.catalogSourceCourseIds,
    sourceUrl: impoUrl,
  }));
  const sources = source.sources.map((entry) => ({
    url: entry.url,
    authority: entry.authority,
    supports: entry.supports,
    contentHash: entry.contentHash,
  }));
  const creditRequirements = [
    ["integrated-production", "Sistemas Integrados de Producción", "Sistemas integrados", 64],
    ["natural-resources", "Recursos Naturales y Sostenibilidad", "Recursos naturales", 37],
    ["economic-social", "Módulo Económico y Social", "Económico-social", 26],
    ["integrative-activities", "Actividades Integradoras", "Integradoras", 40],
    ["flexible-credits", "Optativas y electivas", "Flexibles", 79],
    ["final-project", "Trabajo Final", "Trabajo Final", 24],
  ].map(([id, name, shortName, minCredits]) => ({ id, name, shortName, minCredits }));
  return {
    identity: source.auditIdentity,
    career: "TECNÓLOGO EN SISTEMAS INTEGRADOS DE PRODUCCIÓN AGROPECUARIA",
    planYear: "2022",
    reviewedAt: source.reviewedAt,
    status: "official-evidence-complete",
    scope: "vigencia publicada, título, seis semestres, créditos, bloques comunes, ejemplos flexibles y sede",
    publicationEligible: false,
    officialPlan: {
      approval: ["Plan 2022 publicado por Facultad de Agronomía en el Diario Oficial de 26/06/2023"],
      planYear: "2022",
      title: source.publication.credential,
      durationMonths: 36,
      semesters: 6,
      minimumCredits: 270,
      current: true,
      sharedWith: ["Facultad de Agronomía", "Facultad de Veterinaria"],
      pathwayLabel: "Trayectoria orientativa",
      trajectories,
      degreeRule: "El título exige 270 créditos: 167 obligatorios, 79 optativos/electivos y 24 de Trabajo Final. Los enfoques son ejemplos flexibles del mismo título.",
      curriculum: {
        useBedeliasCompositionTree: true,
        usePublishedCredits: true,
        strictOfficialCourseIds: true,
        sourceUrl: impoUrl,
        sourceDataPath,
        periodOrder: expectedPeriodLabels,
        pathwayLabel: "Trayectoria orientativa",
        includeAllCoursesInPathwayCatalog: true,
        verifiedCourseIds: ["SPS"],
        courseOverrides: {
          SPS: {
            name: "Sistemas de producción simples",
            preserveName: true,
            officialIdentity: true,
            officialCredits: false,
            creditSourceUrl: bedeliasUrl,
            requirementId: "integrated-production"
          }
        },
        pathRequirementMap: {
          "100": "integrated-production",
          "200": "natural-resources",
          "300": "economic-social",
          "400": "integrative-activities",
          "500": "flexible-credits",
          "700": "flexible-credits"
        },
        creditRequirements,
        additionalCourses: [...structuralBlocks, ...sourceOnlyBlocks],
        projectionAnomalies: [
          { field: "visualInspection", resolution: "La extracción estructurada del PDF permite cotejar las tablas, pero no hubo renderizado visual: IMPO devolvió Cache miss y la descarga agotó el tiempo." },
          { field: "individualCourseCredits", resolution: "El Plan no publica cargas individuales para las abreviaturas de los cuadros; se modelan como bloques de 0 créditos con carga no publicada." },
          { field: "resourcesNaturalGrid", resolution: "El foco en Recursos Naturales está nombrado, pero no tiene grilla optativa propia; no se asignan optativas por inferencia." },
        ],
      },
    },
    offerings: [{
      serviceCode: "CUCEL",
      locations: ["Melo, Cerro Largo"],
      role: "oferta institucional de la carrera conjunta; la auditoría no afirma inscripción abierta en 2026",
      trajectoryIds: source.projectionBaseline.pathwayIds,
      curriculumVariant: false,
    }],
    bedeliasComparison: {
      canonicalSnapshot: "data/bedelias/cucel-tecnologo-en-sistemas-integrados-de-produccion-agropecuaria-2022.json",
      metadataCurrent: false,
      publishedDurationMonths: 36,
      publishedMinimumCredits: 270,
      compositionMatterEntries: 43,
      compositionCredits: 299,
      exactVerifiedEntries: 1,
      candidateEntriesPreserved: 42,
      interpretation: "Bedelías conserva 43 entradas y 299 créditos para contraste técnico. Sólo SPS coincide exactamente con código y nombre del Plan; las demás 42 permanecen candidatas y ninguna área se usa como semestre.",
    },
    conclusion: {
      canonicalModel: "one-plan-one-offering-with-flexible-pathways",
      regionalCurriculumVariant: false,
      siteSpecificTrajectoryAvailability: false,
      trajectoryStatus: "official-trajectory-reproduced",
      trajectorySourceDataPath: sourceDataPath,
      reason: source.trajectoryConclusion.justification,
      normalization: [
        "Conservar una única carrera, un único Plan 2022, una única sede y un único progreso.",
        "Proyectar seis semestres desde los cuadros oficiales, nunca desde las áreas de Bedelías.",
        "Publicar los dos ejemplos optativos con ubicación explícita y dejar Recursos Naturales y Personalizada sin asignaciones inventadas.",
        "Mantener un catálogo parcial: sólo SPS se vincula exactamente con Bedelías; O31T, CUT-O31T, CUT-MITMR, CUT-O33T y las demás entradas siguen candidatas.",
        "Conservar los bloques estructurales de 5 y 3 créditos como saldos acreditables derivados, no como unidades curriculares nominales.",
      ],
    },
    sources,
    anomalies: [
      { field: "compositionCredits", resolution: "Los 299 créditos de Bedelías son oferta disponible, no una obligación. El egreso conserva 167 + 79 + 24 = 270." },
      { field: "missingFinalProject", resolution: "El Trabajo Final de 24 créditos se conserva como bloque oficial porque el Plan lo exige y Bedelías no lo individualiza." },
      { field: "structuralCreditGaps", resolution: "Se preservan los IDs existentes de bloques de 5 créditos obligatorios y 3 flexibles. Son saldos derivados y acreditables, no materias inventadas." },
      { field: "suggestedPathways", resolution: "Los enfoques son ejemplos no certificados. Sólo Sistemas Integrados y Económico-Social publican grillas optativas; Recursos Naturales no." },
      { field: "individualCourseCredits", resolution: "Las abreviaturas del Plan no tienen carga individual publicada; las identidades de fuente se modelan como bloques de 0 créditos y no se enlazan por similitud con candidatas." },
      { field: "optionalSemesterTotals", resolution: "Los totales semestrales de los ejemplos suman 81 y 85, mientras el egreso exige 79 flexibles. Se conservan como valores impresos del ejemplo y no se convierten en cargas por materia ni mínimos acumulativos." },
      { field: "visualInspection", resolution: "No se declara QA visual del PDF: la captura web falló por Cache miss y la descarga directa agotó el tiempo. Se versionan líneas, páginas y tablas de la extracción estructurada." },
      { field: "auxiliaryCourseDocuments", resolution: "Las fichas EVA de IERN y O31T son auxiliares. No crean identidades canónicas, equivalencias, semestres ni vigencia de dictado." },
    ],
    uiNotice: "Plan 2022 de seis semestres y 270 créditos. La grilla común y dos ejemplos flexibles provienen del Plan oficial; los enfoques no cambian el título. Las abreviaturas sin carga individual publicada se muestran como bloques, y el resto de Bedelías permanece candidato.",
    remainingWork: "Repetir la inspección visual del PDF cuando IMPO permita renderizarlo y revisar sólo ante una nueva publicación curricular u oferta oficial. No inferir previaturas, cargas individuales, semestres de candidatas ni inscripción abierta.",
  };
}

function buildReview(source) {
  return {
    planId: source.planId,
    state: "official-trajectory-reproduced",
    reviewedAt: source.reviewedAt,
    effectiveAt: source.publication.publishedAt,
    projectionMechanism: "official-profiles",
    scope: {
      territories: ["Melo, Cerro Largo"],
      pathwayIds: source.projectionBaseline.pathwayIds,
    },
    sources: source.sources
      .filter(({ id }) => ["impo-plan-2023", "fagro-career-page", "fvet-career-page", "udelar-career-page"].includes(id))
      .map((entry) => ({
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
    conflictNotes: [
      "Los seis semestres comunes provienen de los cuadros 4 y 5; sólo los cuadros 6 y 7 publican ubicación de optativas para Sistemas Integrados y Económico-Social.",
      "Manejo sustentable de los Recursos Naturales está nombrado como foco posible, pero no tiene grilla optativa propia; se conserva sin asignaciones inferidas.",
      "Los totales flexibles impresos de los ejemplos suman 81 y 85, pero el egreso exige 79; no se distribuyen cargas individuales no publicadas.",
      "Sólo SPS coincide exactamente con una entrada de Bedelías. O31T, CUT-O31T, CUT-MITMR, CUT-O33T y las demás identidades técnicas siguen candidatas.",
      "No hubo inspección visual del PDF por Cache miss y timeout de descarga; la correspondencia se coteja contra la extracción estructurada versionada.",
    ],
  };
}

async function updateRegistries(source) {
  const audits = await readJson(auditsPath);
  const auditIndex = audits.audits.findIndex(({ identity }) => identity === source.auditIdentity);
  if (auditIndex < 0) fail("No existe la auditoría TESIPA a reconciliar.");
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
  if (verified.length !== source.projectionBaseline.expectedVerifiedCourses
    || candidates.length !== source.projectionBaseline.expectedCandidateCourses
    || projection.plan.courseCatalogAuditStatus !== "partial") {
    fail(`La frontera esperada es 42 verificadas y 42 candidatas; resultó ${verified.length}/${candidates.length}.`);
  }
  if (!sameMembers(candidates.map(({ bedeliasCode }) => bedeliasCode).filter(Boolean), source.projectionBaseline.candidateBedeliasSourceCourseIds)
    || projection.courses.find(({ bedeliasCode }) => bedeliasCode === "SPS")?.id !== "cucel-sps-2") {
    fail("La regeneración alteró IDs/progreso o promovió candidatas sin autoridad exacta.");
  }
  for (const id of source.projectionBaseline.preservedStructuralCourseIds) {
    if (!projection.courses.some((course) => course.id === id && course.curricularBlock === true)) {
      fail(`No se preservó el bloque estructural ${id}.`);
    }
  }
  let placements = 0;
  for (const trajectory of source.trajectories) {
    const pathway = projection.publishedPathways?.[trajectory.id];
    if (!pathway || JSON.stringify(pathway.periods.map(({ label }) => label)) !== JSON.stringify(expectedPeriodLabels)) {
      fail(`No se proyectaron los seis semestres de ${trajectory.id}.`);
    }
    placements += pathway.periods.reduce((sum, period) => sum + period.courseIds.length, 0);
  }
  if (placements !== 124
    || inventoryEntry?.state !== "official-trajectory-reproduced"
    || inventoryEntry.currentProjection?.primary !== "official-profiles"
    || inventoryEntry.evidence?.expectedCoursePlacements !== 124
    || inventoryEntry.evidence?.matchedCoursePlacements !== 124) {
    fail("El inventario no conservó las cuatro trayectorias, seis períodos y 124 ubicaciones cotejadas.");
  }
  for (const code of ["O31T", "CUT-O31T", "CUT-MITMR", "CUT-O33T"]) {
    if (projection.courses.find(({ bedeliasCode }) => bedeliasCode === code)?.authorityStatus !== "candidate") {
      fail(`${code} debe permanecer candidata.`);
    }
  }
}

const source = await readJson(sourcePath);
validateSource(source);
await updateRegistries(source);
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const projection = await readJson(projectionPath);
validateProjection(source, projection, inventory.plans.find(({ planId }) => planId === source.planId));

console.log(`D03af regenerado: Plan 2022, seis semestres, cuatro trayectorias flexibles, 42 identidades verificadas, 42 candidatas y 124 ubicaciones; ${report.counts.generatedPlans} planes e inventario actualizados.`);
