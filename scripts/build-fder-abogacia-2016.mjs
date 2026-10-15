#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "data", "fder", "abogacia-2016-trajectory-review.json");
const canonicalSnapshotPath = path.join(projectRoot, "data", "bedelias", "fder-abogacia-2016.json");
const regionalSnapshotPath = path.join(projectRoot, "data", "bedelias", "cenurln-abogacia-2016.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", "bedelias-fder-abogacia-2016.json");
const sourceDataPath = "data/fder/abogacia-2016-trajectory-review.json";
const projectionDataPath = "app/data/bedelias-generated/bedelias-fder-abogacia-2016.json";

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

function sourceById(source, id) {
  const result = source.sources.find((candidate) => candidate.id === id);
  if (!result) fail(`Falta la fuente normalizada ${id}.`);
  return result;
}

function auditEntry(source) {
  const trajectory = source.trajectories[0];
  const curriculumUrl = sourceById(source, trajectory.sourceId).url;
  const procuradorUrl = sourceById(source, "fder-procurador-2021").url;
  const courseOverrides = Object.fromEntries(source.catalogMatches.map((row) => [row.sourceCourseId, {
    name: row.officialLabel,
    preserveName: true,
    credits: row.credits,
    requirementId: row.requirementId,
    periodLabel: row.period,
    officialIdentity: true,
    officialCredits: true,
    authorityStatus: "verified",
    ...(row.creditConflict ? { creditConflict: row.creditConflict, creditSourceUrl: curriculumUrl } : {}),
  }]));
  return {
    identity: source.auditIdentity,
    career: "ABOGACÍA",
    planYear: source.publication.planYear,
    reviewedAt: source.reviewedAt,
    status: "official-evidence-complete",
    scope: "vigencia, título, sedes, diez semestres, catálogo curricular exacto, mínimos de área, flexibilidad y título intermedio",
    publicationEligible: false,
    officialPlan: {
      approval: [
        "Consejo de Facultad de Derecho, 18/06/2015 y 26/05/2016",
        "Consejo Directivo Central, 19/07/2016",
        "Grilla modificada por Consejo de Facultad el 20/11/2019 y 20/12/2023",
      ],
      planYear: source.publication.planYear,
      title: source.publication.title,
      careerName: "Abogacía",
      facultyCode: "FDER",
      facultyName: "Facultad de Derecho",
      durationMonths: source.publication.durationMonths,
      minimumCredits: source.publication.minimumCredits,
      minimumCreditsByArea: Object.fromEntries(source.requirements.map(({ id, minCredits }) => [id, minCredits])),
      current: source.publication.currentAtReview,
      pathwayLabel: trajectory.label,
      degreeRule: "El título exige 450 créditos: 66 socio-jurídicos, 114 de Derecho público, 90 de Derecho privado, 54 de Derecho social específico, 78 de práctica profesional y 48 optativos o electivos.",
      trajectoryRule: source.trajectoryConclusion.flexiblePlacementRule,
      intermediateTitle: {
        title: source.procurador.title,
        minimumCredits: source.procurador.minimumCredits,
        sourceUrl: procuradorUrl,
      },
      trajectories: [{
        id: trajectory.id,
        label: trajectory.label,
        description: trajectory.description,
        campusIds: trajectory.campusIds,
        useOnlyConfiguredPeriods: true,
        restrictGeneratedCatalogToPublished: true,
        periods: trajectory.periods,
      }],
      curriculum: {
        useBedeliasCompositionTree: true,
        preserveBedeliasCourseIds: true,
        usePublishedCredits: true,
        deduplicateSharedProfileCourses: true,
        strictOfficialCourseIds: true,
        verifiedCourseIds: source.authorityPolicy.verifiedSourceCourseIds,
        sourceUrl: curriculumUrl,
        sourceDataPath,
        includeAllCoursesInPathwayCatalog: true,
        courseOverrides,
        additionalCourses: source.sourceOnlyRows.map((row) => ({
          id: row.identityKey,
          sourceCourseId: row.identityKey,
          name: row.officialLabel,
          credits: row.credits,
          creditsPublished: row.creditsPublished,
          requirementId: row.requirementId,
          periodLabel: row.period,
          curricularBlock: row.curricularBlock,
          catalogRole: row.catalogRole,
          availabilityStatus: "official-flexible-slot-no-permanent-catalog",
          sourceUrl: curriculumUrl,
        })),
        periodOrder: trajectory.periods.map(({ label }) => label),
        pathwayLabel: trajectory.label,
        pathwayDescription: trajectory.description,
        creditRequirements: source.requirements.map((requirement) => ({
          id: requirement.id,
          name: requirement.name,
          shortName: requirement.shortName,
          minCredits: requirement.minCredits,
        })),
        requiredCourseGroups: [{
          id: "procurador-obligatorias",
          label: "Unidades obligatorias del título intermedio Procurador",
          minCompleted: source.procurador.requiredSourceCourseIds.length,
          sourceCourseIds: source.procurador.requiredSourceCourseIds,
          verifiedSourceCourseIds: source.procurador.requiredSourceCourseIds,
          sourceUrl: procuradorUrl,
        }],
        credentials: [
          {
            id: "bedelias-degree",
            title: source.publication.title,
            minTotalCredits: source.publication.minimumCredits,
            nodeRequirements: source.requirements.map(({ id, minCredits }) => ({ nodeId: id, minCredits })),
            requiredCourseGroupIds: ["validacion-final-plan"],
            sourceUrl: sourceById(source, "fder-plan-2016").url,
          },
          {
            id: source.procurador.credentialId,
            title: source.procurador.title,
            minTotalCredits: source.procurador.minimumCredits,
            nodeRequirements: [{ nodeId: "flexibles", minCredits: source.procurador.flexibleCreditsWithAbogaciaPractice }],
            requiredCourseGroupIds: ["procurador-obligatorias"],
            sourceUrl: procuradorUrl,
          },
        ],
        manualCompletionValidation: "Validación final de la distribución por áreas y de las optativas/electivas por la Comisión de Carrera",
        projectionAnomalies: source.conflicts,
      },
    },
    offerings: [
      {
        serviceCode: "FDER",
        locations: ["Montevideo"],
        role: "servicio responsable del Plan 2016",
        curriculumVariant: false,
        trajectoryIds: [trajectory.id],
      },
      {
        serviceCode: "CENURLN",
        locations: ["Salto"],
        role: "oferta regional completa del mismo Plan 2016",
        curriculumVariant: false,
        trajectoryIds: [trajectory.id],
      },
    ],
    bedeliasComparison: {
      canonicalSnapshot: "data/bedelias/fder-abogacia-2016.json",
      regionalSnapshot: "data/bedelias/cenurln-abogacia-2016.json",
      canonicalCourses: source.bedeliasComparison.canonicalCourseRecords,
      regionalCourses: source.bedeliasComparison.regionalCourseRecords,
      mandatoryCoreCoursesCanonical: source.bedeliasComparison.canonicalMandatoryCoreCourses,
      mandatoryCoreCoursesRegional: source.bedeliasComparison.regionalMandatoryCoreCourses,
      mandatoryCoreOnlyCanonical: 0,
      mandatoryCoreOnlyRegional: 0,
      onlyCanonical: 0,
      onlyRegional: source.bedeliasComparison.regionalOnlyFlexibleCourses,
      regionalOnlyCoursesUnderFlexibleBranches: source.bedeliasComparison.regionalOnlyFlexibleCourses,
      changedCredits: source.bedeliasComparison.changedFlexibleCredits,
      changedCreditsUnderFlexibleBranches: source.bedeliasComparison.changedFlexibleCredits,
      changedCreditCourse: "3206B - Garantías Particulares",
      canonicalPrerequisiteEntries: source.bedeliasComparison.canonicalPrerequisiteEntries,
      regionalPrerequisiteEntries: source.bedeliasComparison.regionalPrerequisiteEntries,
      verifiedBedeliasCourseCount: source.bedeliasComparison.verifiedBedeliasCourseCount,
      verifiedSourceOnlyBlockCount: source.bedeliasComparison.verifiedSourceOnlyBlockCount,
      candidateProjectionRecords: source.bedeliasComparison.candidateRetainedCount,
      interpretation: "La grilla acredita 70 ubicaciones en diez semestres: 65 códigos técnicos inequívocos y cinco cupos flexibles sólo-fuente. Las otras entradas de Bedelías siguen candidatas.",
    },
    conclusion: {
      canonicalModel: "one-plan-multiple-offerings",
      regionalCurriculumVariant: false,
      siteSpecificTrajectoryAvailability: false,
      trajectoryStatus: source.publication.trajectoryStatus,
      trajectorySourceDataPath: sourceDataPath,
      reason: source.trajectoryConclusion.reason,
      normalization: [
        "Reproducir los diez semestres y las 70 ubicaciones de la grilla vigente.",
        "Conservar 65 identidades técnicas exactas y cinco cupos flexibles sólo-fuente; las demás entradas quedan candidatas.",
        "Mantener un solo plan, trayectoria y progreso compartido entre Montevideo y Salto.",
        "Mantener Procurador como título intermedio del mismo plan, no como carrera independiente.",
        "Conservar las contradicciones de 450/452 y 160/162 sin fusionar ni prorratear materias.",
      ],
    },
    sources: source.sources.map((entry) => ({
      url: entry.url,
      authority: entry.authority,
      supports: entry.supports ?? entry.doesNotSupport ?? [],
      ...(entry.contentHash ? { contentHash: entry.contentHash } : {}),
      ...(entry.documentSha256 ? { contentHash: entry.documentSha256 } : {}),
    })),
    anomalies: source.conflicts,
    uiNotice: "Grilla oficial de diez semestres del Plan 2016. Las optativas y electivas son cupos flexibles: la oferta concreta y su asignación por área deben validarse con Facultad de Derecho.",
    remainingWork: source.trajectoryConclusion.nextReviewCondition,
  };
}

function reviewEntry(source) {
  const trajectory = source.trajectories[0];
  return {
    planId: source.planId,
    state: "official-trajectory-reproduced",
    reviewedAt: source.reviewedAt,
    effectiveAt: source.publication.trajectoryEffectiveAt,
    projectionMechanism: "official-periods",
    scope: { territories: source.scope.campuses, pathwayIds: [trajectory.id] },
    sources: source.sources
      .filter(({ id }) => !id.startsWith("bedelias-"))
      .map((entry) => ({
        authority: entry.authority,
        url: entry.url,
        reviewedAt: entry.consultedAt,
        role: [...(entry.supports ?? []), ...(entry.doesNotSupport ?? [])].join("; "),
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

function replaceEntry(collection, predicate, entry, label) {
  const index = collection.findIndex(predicate);
  if (index < 0) fail(`No se encontró ${label} para actualizar.`);
  collection[index] = entry;
}

function validateSource(source, canonical, regional) {
  if (source.planId !== "bedelias-fder-abogacia-2016") fail("El artefacto normalizado no corresponde al plan D03ap.");
  if (source.fingerprint?.value !== digest(source.sourcePortions)) fail("La huella de sourcePortions no coincide.");
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    if (source.fingerprint.sourceHashes?.[sourceId] !== digest(portion)) fail(`La huella no coincide para ${sourceId}.`);
  }
  const trajectory = source.trajectories[0];
  const placements = trajectory.periods.flatMap(({ courseIds }) => courseIds);
  if (source.publication.trajectoryStatus !== "official-trajectory-reproduced"
    || source.scope.officialTemporalPeriodsReproduced !== 10
    || trajectory.periods.length !== 10
    || placements.length !== 70
    || new Set(placements).size !== 70) {
    fail("La evidencia debe reproducir diez períodos y 70 ubicaciones únicas.");
  }
  const minimumCredits = source.requirements.reduce((sum, requirement) => sum + requirement.minCredits, 0);
  const fixedCredits = source.catalogMatches.reduce((sum, row) => sum + row.credits, 0);
  const flexibleCredits = source.sourceOnlyRows.reduce((sum, row) => sum + row.credits, 0);
  if (minimumCredits !== 450 || source.publication.minimumCredits !== 450
    || source.publication.durationMonths !== 60 || fixedCredits !== 404 || flexibleCredits !== 48) {
    fail("La evidencia perdió los mínimos normativos o la contradicción 450/452 de la grilla.");
  }
  if (source.procurador.minimumCredits !== 160
    || source.procurador.requiredSourceCourseIds.length !== 19
    || source.procurador.publishedNamedCreditsWithAbogaciaPractice !== 162) {
    fail("La evidencia perdió el título intermedio Procurador o la contradicción 160/162.");
  }
  if (canonical.contentHash !== source.bedeliasComparison.canonicalSnapshotContentHash.replace("sha256:", "")
    || regional.contentHash !== source.bedeliasComparison.regionalSnapshotContentHash.replace("sha256:", "")
    || canonical.plan.courses.length !== source.bedeliasComparison.canonicalCourseRecords
    || regional.plan.courses.length !== source.bedeliasComparison.regionalCourseRecords
    || canonical.prerequisites.length !== source.bedeliasComparison.canonicalPrerequisiteEntries
    || regional.prerequisites.length !== source.bedeliasComparison.regionalPrerequisiteEntries) {
    fail("Los snapshots de Bedelías ya no coinciden con la evidencia auditada.");
  }
  const canonicalByCode = new Map(canonical.plan.courses.map((course) => [course.code, course]));
  const regionalByCode = new Map(regional.plan.courses.map((course) => [course.code, course]));
  for (const match of source.catalogMatches) {
    const canonicalCourse = canonicalByCode.get(match.sourceCourseId);
    const regionalCourse = regionalByCode.get(match.sourceCourseId);
    if (!canonicalCourse || !regionalCourse
      || normalize(canonicalCourse.name) !== normalize(match.bedeliasName)
      || normalize(regionalCourse.name) !== normalize(match.bedeliasName)
      || Number(canonicalCourse.credits) !== Number(match.bedeliasCredits)
      || Number(regionalCourse.credits) !== Number(match.bedeliasCredits)) {
      fail(`Cambió la correspondencia técnica ${match.sourceCourseId}.`);
    }
  }
  if (!sameMembers(source.authorityPolicy.verifiedSourceCourseIds, source.catalogMatches.map(({ sourceCourseId }) => sourceCourseId))
    || !sameMembers(source.authorityPolicy.verifiedSourceOnlyIdentityKeys, source.sourceOnlyRows.map(({ identityKey }) => identityKey))) {
    fail("La frontera verified/source-only no coincide con la evidencia normalizada.");
  }
  if (source.authorityPolicy.aggregateTechnicalRowsRemainCandidates.some((id) => source.authorityPolicy.verifiedSourceCourseIds.includes(id))) {
    fail("Una variante técnica agregada fue publicada como materia exacta.");
  }
}

function validateRegistry(source, audits, reviews) {
  const audit = audits.audits.find(({ identity }) => identity === source.auditIdentity);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  if (!audit || audit.reviewedAt !== source.reviewedAt
    || audit.conclusion?.trajectoryStatus !== "official-trajectory-reproduced"
    || audit.conclusion?.trajectorySourceDataPath !== sourceDataPath
    || audit.officialPlan?.intermediateTitle?.title !== "Procurador") {
    fail("La auditoría no enlaza la trayectoria oficial ni Procurador.");
  }
  const trajectory = audit.officialPlan?.trajectories?.find(({ id }) => id === source.projectionBaseline.pathwayId);
  if (!trajectory || trajectory.generatedFallback === true || trajectory.periods.length !== 10) {
    fail("La auditoría no conserva los diez períodos configurados.");
  }
  if (!review || review.state !== "official-trajectory-reproduced"
    || review.reviewedAt !== source.reviewedAt
    || review.evidence?.kind !== "audited-projection"
    || review.evidence?.sourceDataPath !== sourceDataPath) {
    fail("La revisión D03 no conserva el cierre official-trajectory-reproduced.");
  }
}

function validateProjection(source, projection, inventoryEntry) {
  if (!inventoryEntry || inventoryEntry.state !== "official-trajectory-reproduced"
    || inventoryEntry.evidence?.kind !== "audited-projection"
    || inventoryEntry.evidence?.pathways?.[0]?.periodCount !== 10
    || inventoryEntry.evidence?.matchedCoursePlacements !== source.projectionBaseline.coursePlacementCount) {
    fail("El inventario no reproduce los diez semestres y 70 ubicaciones.");
  }
  if (projection.plan.minCredits !== 450 || projection.plan.durationMonths !== 60
    || projection.source.reviewedAt !== source.reviewedAt
    || projection.courses.length !== source.projectionBaseline.projectedCourseCount) {
    fail("La proyección perdió metadatos o el conteo auditado.");
  }
  const matched = projection.courses.filter(({ authorityStatus, bedeliasCode }) => authorityStatus === "verified" && bedeliasCode);
  const sourceOnly = projection.courses.filter(({ authorityStatus, sourceCourseId }) => authorityStatus === "verified" && sourceCourseId);
  const validationBlocks = projection.courses.filter(({ authorityStatus, dataStatus }) => authorityStatus === "verified" && dataStatus === "manual-validation");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  if (!sameMembers(matched.map(({ bedeliasCode }) => bedeliasCode), source.authorityPolicy.verifiedSourceCourseIds)
    || !sameMembers(sourceOnly.map(({ sourceCourseId }) => sourceCourseId), source.authorityPolicy.verifiedSourceOnlyIdentityKeys)
    || validationBlocks.length !== 1
    || candidates.length !== source.projectionBaseline.candidateCourseCount) {
    fail("La regeneración alteró la frontera de autoridad.");
  }
  const byCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));
  for (const [code, expectedId] of [["11.1", "fder-11-1"], ["12.10", "fder-12-10"], ["51.8", "fder-51-8"], ["52.9", "fder-52-9"]]) {
    if (byCode.get(code)?.id !== expectedId) fail(`Cambió el ID histórico ${expectedId}.`);
  }
  if (source.authorityPolicy.aggregateTechnicalRowsRemainCandidates.some((code) => byCode.get(code)?.authorityStatus !== "candidate")) {
    fail("Una variante agregada dejó de permanecer candidata.");
  }
  const pathway = projection.pathways[source.projectionBaseline.pathwayId];
  const presentation = buildRegisteredPlanPresentation(source.projectionBaseline.pathwayId, projection);
  if (pathway?.generatedFallback === true || presentation.generated || presentation.label !== "Trayectoria oficial"
    || presentation.periods.length !== 10
    || presentation.periods.flatMap(({ courseIds }) => courseIds).length !== source.projectionBaseline.coursePlacementCount
    || !sameMembers(pathway.campusIds, ["montevideo", "salto"])) {
    fail("Currícula no reproduce la grilla oficial compartida por ambas sedes.");
  }
  const candidateIds = new Set(candidates.map(({ id }) => id));
  if (pathway.periods.some(({ courseIds }) => courseIds.some((id) => candidateIds.has(id)))
    || presentation.courses.some(({ id, provisional }) => provisional === true || candidateIds.has(id))) {
    fail("Una candidata ingresó en la trayectoria o el catálogo oficial.");
  }
  const credentials = new Map(projection.creditStructure.credentials.map((credential) => [credential.id, credential]));
  const abogado = credentials.get("bedelias-degree");
  const procurador = credentials.get("procurador");
  if (!abogado || abogado.minTotalCredits !== 450 || abogado.nodeRequirements.length !== 6
    || !procurador || procurador.minTotalCredits !== 160
    || procurador.requiredCourseGroups[0]?.courseIds.length !== source.procurador.requiredSourceCourseIds.length) {
    fail("La proyección perdió el título Abogado, los seis mínimos o Procurador.");
  }
  if (projection.campuses.map(({ id }) => id).join(",") !== "montevideo,salto"
    || projection.campuses.some(({ defaultPathwayId }) => defaultPathwayId !== source.projectionBaseline.pathwayId)) {
    fail("Las sedes dejaron de compartir la misma trayectoria y progreso canónico.");
  }
}

const source = await readJson(sourcePath);
const canonicalSnapshot = await readJson(canonicalSnapshotPath);
const regionalSnapshot = await readJson(regionalSnapshotPath);
const audits = await readJson(auditsPath);
const reviews = await readJson(reviewsPath);
validateSource(source, canonicalSnapshot, regionalSnapshot);
replaceEntry(audits.audits, ({ identity }) => identity === source.auditIdentity, auditEntry(source), "la auditoría de Abogacía");
const review = reviewEntry(source);
const reviewIndex = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
if (reviewIndex >= 0) reviews.reviews[reviewIndex] = review;
else reviews.reviews.push(review);
validateRegistry(source, audits, reviews);
audits.contentHash = officialAuditRegistryHash(audits);
await writeJson(auditsPath, audits);
await writeJson(reviewsPath, reviews);
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const projection = await readJson(projectionPath);
validateProjection(source, projection, inventory.plans.find(({ planId }) => planId === source.planId));

console.log(`D03ap regenerado: 10 semestres, 70 ubicaciones, 65 códigos cotejados, 5 cupos flexibles sólo-fuente, Procurador y ${source.projectionBaseline.candidateCourseCount} candidatas; ${report.counts.generatedPlans} planes e inventario actualizados.`);
