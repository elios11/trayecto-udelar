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
const sourceDataPath = "data/cur/recursos-naturales-rivera-trajectory-review.json";
const sourcePath = path.join(projectRoot, sourceDataPath);
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const digestSortedIds = (courses) => digest(courses.map(({ id }) => id).sort());
const fail = (message) => { throw new Error(message); };
const unique = (values) => [...new Set(values)];

const sourceIdsByPlanId = {
  "bedelias-cur-licenciatura-en-recursos-naturales-2010": [
    "impo-lic-plan-2010",
    "fcien-lic-current",
    "udelar-lic-current",
    "colibri-cohort-trajectory-2023",
    "planeamiento-lic-activity-2025",
    "cse-jornada-2017",
  ],
  "bedelias-cur-tecnicatura-en-gestion-de-recursos-naturales-2011": [
    "impo-tec-plan-2011",
    "fcien-tec-current",
    "cse-jornada-2017",
    "fcien-anuario-2014",
    "planeamiento-tec-basics-2024",
  ],
};

function validateSource(source) {
  if (source.reviewedAt !== "2026-10-18" || source.plans?.length !== 2) {
    fail("La revisión debe conservar fecha, alcance y exactamente los dos planes de Recursos Naturales en Rivera.");
  }
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella agregada de sourcePortions no coincide con la evidencia normalizada.");
  }
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    const expectedHash = digest(portion);
    if (source.fingerprint.sourceHashes?.[sourceId] !== expectedHash
      || source.sources.find(({ id }) => id === sourceId)?.contentHash !== expectedHash) {
      fail(`La huella normalizada no coincide para ${sourceId}.`);
    }
  }
  const [lic, tec] = source.plans;
  if (lic.planId !== "bedelias-cur-licenciatura-en-recursos-naturales-2010"
    || lic.auditIdentity !== "licenciatura en recursos naturales:2010"
    || lic.officialRequirements.minimumCredits !== 360
    || lic.officialRequirements.areaMinimums.thesis !== 40
    || lic.bedeliasBaseline.candidateEntryCount !== 377
    || tec.planId !== "bedelias-cur-tecnicatura-en-gestion-de-recursos-naturales-2011"
    || tec.auditIdentity !== "tecnicatura en gestion de recursos naturales:2011"
    || tec.officialRequirements.minimumCredits !== 195
    || tec.officialRequirements.maximumOptionalCredits !== 10
    || tec.bedeliasBaseline.candidateEntryCount !== 74) {
    fail("La evidencia alteró las identidades o los requisitos oficiales ya auditados.");
  }
  if (source.plans.some((plan) => plan.territory !== "Rivera"
    || plan.currentAtReview !== true
    || plan.progressSharedWithOtherPlan !== false
    || plan.trajectoryConclusion.state !== "official-trajectory-identified-pending"
    || plan.trajectoryConclusion.absenceExplicitlyDocumented !== false
    || plan.trajectoryConclusion.generatedFallback !== true)) {
    fail("Los planes deben permanecer separados y con trayectoria identificada, pendiente y no atribuida como ausencia.");
  }
  if (source.authorityPolicy.bedeliasCompositionAssignsTemporalPeriods !== false
    || source.authorityPolicy.technicalPlanExamplesBecomeObligations !== false
    || source.authorityPolicy.crossPlanArticulationSharesProgress !== false
    || source.authorityPolicy.candidateCoursesRemainAvailableToPlanner !== true
    || source.authorityPolicy.candidateCoursesCountTowardProgressWithoutValidation !== false) {
    fail("La política de autoridad no puede convertir catálogo, ejemplos o articulación en malla o progreso oficial.");
  }
}

function normalizedSources(source, sourcePlan) {
  const allowedIds = new Set(sourceIdsByPlanId[sourcePlan.planId]);
  return source.sources.filter(({ id }) => allowedIds.has(id)).map((entry) => ({
    url: entry.url,
    authority: entry.authority,
    supports: entry.supports,
    contentHash: entry.contentHash,
  }));
}

function auditSources(source, sourcePlan, existing) {
  const seenUrls = new Set();
  return [
    ...normalizedSources(source, sourcePlan),
    ...(existing.sources ?? []).filter(({ authority }) => /Planeamiento/i.test(authority)),
  ].filter(({ url }) => {
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });
}

function buildAudit(source, sourcePlan, existing) {
  const isLicenciatura = sourcePlan.planYear === "2010";
  const conclusion = sourcePlan.trajectoryConclusion;
  const canonicalScope = isLicenciatura
    ? "vigencia, título, duración, créditos, áreas, currículo flexible, tesina, sede, articulación y brecha de publicación de la trayectoria por cohorte"
    : "vigencia, título, duración, créditos, mínimos por eje, trabajo final, optativas, articulación, sede y brecha de publicación de calendarios por cohorte";
  const canonicalReason = isLicenciatura
    ? "El Plan 2010 define una única licenciatura de Facultad de Ciencias, dictada íntegramente en Rivera. Su flexibilidad por áreas y su articulación con la tecnicatura no crean menciones, títulos ni sedes adicionales."
    : "El Plan 2011 define una tecnicatura propia de Facultad de Ciencias, radicada en Rivera y flexible por ejes. Su articulación académica con la Licenciatura en Recursos Naturales no la convierte en una credencial intermedia de esa licenciatura.";
  const trajectoryResolution = isLicenciatura
    ? "Colibrí documenta que cada generación recibe una trayectoria sugerida, pero ninguna fuente consultada publica sus cursos por año o semestre. Se identifica la trayectoria sin atribuirle el catálogo de Bedelías."
    : "La presentación institucional registra calendarios organizados por años, pero no publica la correspondencia entre cursos y períodos. El Plan 2011 sólo enumera asignaturas como ejemplos ilustrativos.";
  const normalizationLine = isLicenciatura
    ? "La trayectoria sugerida por generación está identificada, pero permanece pendiente hasta obtener su asignación oficial de cursos y períodos; el orden de Bedelías no la sustituye."
    : "Los calendarios por años están identificados como práctica de implementación, pero permanecen pendientes hasta obtener una asignación oficial de cursos y períodos; los ejemplos del Plan no la sustituyen.";
  const anomalies = new Map((existing.anomalies ?? []).map((anomaly) => [anomaly.field, anomaly]));
  anomalies.set("trajectoryPublication", {
    field: "trajectoryPublication",
    resolution: trajectoryResolution,
  });
  return {
    ...existing,
    reviewedAt: source.reviewedAt,
    scope: canonicalScope,
    officialPlan: {
      ...existing.officialPlan,
      curriculum: {
        ...existing.officialPlan.curriculum,
        sourceDataPath,
        generatedFallback: true,
      },
    },
    conclusion: {
      ...existing.conclusion,
      siteSpecificTrajectoryAvailability: false,
      siteSpecificTrajectoryIdentified: true,
      trajectoryStatus: conclusion.state,
      trajectorySourceDataPath: sourceDataPath,
      reason: `${canonicalReason} ${conclusion.identifiedScope} ${conclusion.gap}`,
      normalization: unique([
        ...existing.conclusion.normalization,
        normalizationLine,
        "La Licenciatura y la Tecnicatura conservan planes, títulos y progreso separados; su articulación no autoriza compartir avance.",
      ]),
    },
    sources: auditSources(source, sourcePlan, existing),
    anomalies: [...anomalies.values()],
    uiNotice: isLicenciatura
      ? "Plan 2010 flexible: completá los mínimos de cada área, la Tesina y 360 créditos totales. El catálogo disponible no es obligatorio completo. La institución documenta una trayectoria sugerida por generación, pero no publicó su asignación curso-período; Trayecto muestra un recorrido orientativo generado, no institucional, y la Comisión de Carrera valida el currículo individual."
      : "Plan 2011 flexible: completá 50 créditos en cada eje, el Trabajo Final de 35 créditos y 195 totales. La institución documenta calendarios por años, pero no publicó su asignación curso-período; Trayecto muestra un recorrido orientativo generado, no institucional, y la Comisión valida la pertinencia y el máximo de 10 créditos optativos.",
    remainingWork: isLicenciatura
      ? "Obtener de la Comisión de Carrera, FCIEN o CENUR Noreste la trayectoria vigente de una cohorte con cursos y períodos; reconciliarla sin inferir desde el catálogo por áreas."
      : "Obtener de la Comisión de Carrera, FCIEN o CENUR Noreste el calendario vigente con cursos y años o semestres; reconciliarlo sin convertir los ejemplos ilustrativos del Plan en obligaciones.",
  };
}

function buildReview(source, sourcePlan) {
  const conclusion = sourcePlan.trajectoryConclusion;
  return {
    planId: sourcePlan.planId,
    state: conclusion.state,
    reviewedAt: source.reviewedAt,
    effectiveAt: sourcePlan.planYear === "2010" ? "2023" : "2017",
    projectionMechanism: "official-flexible-structure",
    scope: {
      territories: ["Rivera"],
      pathwayIds: ["bedelias"],
    },
    sources: normalizedSources(source, sourcePlan).map((entry) => ({
      authority: entry.authority,
      url: entry.url,
      reviewedAt: source.reviewedAt,
      role: entry.supports.join("; "),
      contentHash: entry.contentHash,
    })),
    evidence: {
      kind: "identified-source-pending-reconciliation",
      sourceDataPath,
      sourcePlanId: sourcePlan.planId,
      identifiedScope: conclusion.identifiedScope,
      missingFields: ["etiquetas temporales", "ubicaciones curso-período"],
      reason: conclusion.gap,
    },
    conflictNotes: [
      conclusion.gap,
      "La búsqueda fallida de una grilla pública no demuestra ausencia de trayectoria oficial.",
      "La composición de Bedelías preserva candidatas, pero no acredita períodos ni obligaciones.",
    ],
  };
}

async function updateRegistries(source) {
  const audits = await readJson(auditsPath);
  for (const sourcePlan of source.plans) {
    const auditIndex = audits.audits.findIndex(({ identity }) => identity === sourcePlan.auditIdentity);
    if (auditIndex < 0) fail(`No existe la auditoría ${sourcePlan.auditIdentity}.`);
    audits.audits[auditIndex] = buildAudit(source, sourcePlan, audits.audits[auditIndex]);
  }
  audits.contentHash = officialAuditRegistryHash(audits);
  await writeJson(auditsPath, audits);

  const reviews = await readJson(reviewsPath);
  for (const sourcePlan of source.plans) {
    const review = buildReview(source, sourcePlan);
    const reviewIndex = reviews.reviews.findIndex(({ planId }) => planId === sourcePlan.planId);
    if (reviewIndex >= 0) reviews.reviews[reviewIndex] = review;
    else reviews.reviews.push(review);
  }
  await writeJson(reviewsPath, reviews);
}

function validateProjection(sourcePlan, projection, inventoryEntry) {
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const realCurricularCourses = projection.courses.filter(({ dataStatus }) => dataStatus !== "manual-validation");
  const baseline = sourcePlan.bedeliasBaseline;
  if (candidates.length !== baseline.candidateEntryCount
    || digestSortedIds(candidates) !== baseline.candidateCourseIdsHash
    || realCurricularCourses.length !== baseline.realCurricularEntryCount
    || digestSortedIds(realCurricularCourses) !== baseline.realCurricularCourseIdsHash) {
    fail(`La regeneración alteró la frontera o los IDs preservados de ${sourcePlan.planId}.`);
  }
  if (projection.plan.degreeTitle !== sourcePlan.degreeTitle
    || projection.plan.minCredits !== sourcePlan.officialRequirements.minimumCredits
    || projection.campuses.map(({ label }) => label).join(",") !== "Rivera") {
    fail(`La regeneración alteró título, créditos o sede de ${sourcePlan.planId}.`);
  }
  const requiredCodes = sourcePlan.officialRequirements.requiredSourceCourseIds;
  if (requiredCodes.some((code) => !projection.courses.some(({ bedeliasCode }) => bedeliasCode === code))) {
    fail(`La regeneración eliminó Tesina o Trabajo Final de ${sourcePlan.planId}.`);
  }
  const pathway = projection.pathways?.bedelias;
  if (pathway?.generatedFallback !== true) {
    fail(`La proyección ${sourcePlan.planId} debe forzar el recorrido orientativo generado.`);
  }
  const presentation = buildRegisteredPlanPresentation("bedelias", projection);
  if (!presentation.generated || presentation.label !== GENERATED_PATHWAY_LABEL
    || presentation.courses.length !== baseline.realCurricularEntryCount
    || presentation.periods.some(({ label }) => /semestre|año/i.test(label))) {
    fail(`La presentación de ${sourcePlan.planId} atribuye una secuencia temporal no demostrada.`);
  }
  const provisionalCourses = presentation.courses.filter(({ provisional }) => provisional);
  if (provisionalCourses.length !== baseline.candidateEntryCount
    || provisionalCourses.some(({ eligibleRequirementIds, creditAllocations }) => eligibleRequirementIds.length > 0 || creditAllocations.length > 0)) {
    fail(`Las candidatas de ${sourcePlan.planId} deben seguir disponibles sin computar progreso.`);
  }
  if (inventoryEntry?.state !== "official-trajectory-identified-pending"
    || inventoryEntry.currentProjection?.primary !== "official-flexible-structure"
    || inventoryEntry.evidence?.kind !== "identified-source-pending-reconciliation"
    || !inventoryEntry.evidence?.reason) {
    fail(`El inventario no conserva la brecha demostrada de ${sourcePlan.planId}.`);
  }
}

const source = await readJson(sourcePath);
validateSource(source);
await updateRegistries(source);
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();

for (const sourcePlan of source.plans) {
  const projection = await readJson(path.join(projectRoot, "app", "data", "bedelias-generated", `${sourcePlan.planId}.json`));
  validateProjection(sourcePlan, projection, inventory.plans.find(({ planId }) => planId === sourcePlan.planId));
}

console.log(`D03au regenerado: dos títulos y progresos separados; trayectorias institucionales identificadas sin filas curso-período, ${report.counts.generatedPlans} planes e inventario actualizados.`);
