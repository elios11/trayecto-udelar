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
const sourcePath = path.join(projectRoot, "data", "fcien", "bioquimica-2017-trajectory-review.json");
const snapshotPath = path.join(projectRoot, "data", "bedelias", "fcien-licenciatura-en-bioquimica-2017.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", "bedelias-fcien-licenciatura-en-bioquimica-2017.json");
const sourceDataPath = "data/fcien/bioquimica-2017-trajectory-review.json";
const projectionDataPath = "app/data/bedelias-generated/bedelias-fcien-licenciatura-en-bioquimica-2017.json";

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

function compositionMatterCount(node) {
  if (!node) return 0;
  return (node.nodeType === "Materia" ? 1 : 0)
    + (node.children ?? []).reduce((sum, child) => sum + compositionMatterCount(child), 0);
}

function sourceById(source, id) {
  const result = source.sources.find((candidate) => candidate.id === id);
  if (!result) fail(`Falta la fuente normalizada ${id}.`);
  return result;
}

function auditEntry(source) {
  const trajectory = source.trajectories[0];
  const curriculumUrl = sourceById(source, "proposal-2025").url;
  const courseOverrides = Object.fromEntries(source.catalogMatches.map((row) => [row.sourceCourseId, {
    name: row.officialLabel,
    preserveName: true,
    requirementId: row.requirementId,
    periodLabel: row.period,
    officialIdentity: true,
    officialCredits: true,
    authorityStatus: "verified",
    ...(row.alternativeGroup ? {
      elective: true,
      catalogRole: row.catalogOnlyAlternative ? "official-catalog-alternative" : "official-semester-alternative",
    } : {}),
  }]));
  return {
    identity: source.auditIdentity,
    career: "LICENCIATURA EN BIOQUÍMICA",
    planYear: source.publication.planYear,
    reviewedAt: source.reviewedAt,
    status: "official-evidence-complete",
    scope: "vigencia, Plan 2017, título, sede, 360 créditos, mínimos, trayectoria sugerida 2025, ocho semestres, alternativas, cohorte y frontera de autoridad",
    publicationEligible: false,
    officialPlan: {
      approval: [
        "Claustro de Facultad de Ciencias, Resolución Nº 5 del 01/03/2016",
        "Consejo de Facultad de Ciencias, Resolución Nº 35 del 04/04/2016",
        "Consejo Directivo Central, Resolución Nº 13 del 02/08/2016",
      ],
      planYear: source.publication.planYear,
      title: source.publication.title,
      careerName: "Licenciatura en Bioquímica",
      facultyCode: "FCIEN",
      facultyName: "Facultad de Ciencias",
      durationMonths: source.publication.durationMonths,
      semesters: 8,
      minimumCredits: source.publication.minimumCredits,
      current: source.publication.currentAtReview,
      pathwayLabel: trajectory.label,
      degreeRule: "El título exige 360 créditos: 241 mínimos del tramo común, 33 optativos/electivos de orientación, una Tesina de 40 créditos y 10 créditos transversales incluidos en el total, con validación de la Comisión de Carrera.",
      trajectories: [{
        id: trajectory.id,
        label: trajectory.label,
        description: trajectory.description,
        useOnlyConfiguredPeriods: true,
        restrictGeneratedCatalogToPublished: true,
        periods: trajectory.periods,
      }],
      curriculum: {
        useBedeliasCompositionTree: true,
        usePublishedCredits: true,
        deduplicateSharedProfileCourses: true,
        strictOfficialCourseIds: true,
        verifiedCourseIds: source.authorityPolicy.verifiedSourceCourseIds,
        sourceUrl: curriculumUrl,
        sourceDataPath,
        includeAllCoursesInPathwayCatalog: true,
        pathRequirementMap: {
          "25": "physical-mathematics",
          "26": "chemistry",
          "27": "basic-biochemistry",
          "28": "biology",
          "29": "humanities",
          "50": "orientation",
          "51": "social-productive",
          "52": "thesis",
        },
        courseOverrides,
        additionalCourses: source.sourceOnlyRows.map((row) => ({
          id: row.identityKey,
          sourceCourseId: row.identityKey,
          name: row.officialLabel,
          credits: row.credits,
          creditsPublished: row.creditsPublished,
          requirementId: row.requirementId,
          additionalRequirementIds: row.additionalRequirementIds ?? [],
          periodLabel: row.period,
          curricularBlock: row.curricularBlock,
          catalogRole: row.catalogRole,
          availabilityStatus: row.curricularBlock
            ? "official-flexible-slot-no-fixed-load"
            : "official-trajectory-no-unambiguous-technical-code",
          sourceUrl: curriculumUrl,
        })),
        periodOrder: trajectory.periods.map(({ label }) => label),
        pathwayLabel: trajectory.label,
        pathwayDescription: trajectory.description,
        creditRequirements: source.requirements,
        manualCompletionValidation: "Validación académica del currículo individual y de los 10 créditos de formación social/productiva o cursos afines externos",
        projectionAnomalies: source.conflicts,
      },
    },
    offerings: [{
      serviceCode: "FCIEN",
      locations: ["Montevideo"],
      role: "oferta completa de Facultad de Ciencias",
      curriculumVariant: false,
      trajectoryIds: [trajectory.id],
    }],
    bedeliasComparison: {
      canonicalSnapshot: "data/bedelias/fcien-licenciatura-en-bioquimica-2017.json",
      metadataCurrent: true,
      publishedDurationMonths: source.publication.durationMonths,
      publishedMinimumCredits: source.publication.minimumCredits,
      compositionMatterEntries: source.bedeliasComparison.compositionMatterEntries,
      distinctSnapshotCourseRecords: source.bedeliasComparison.distinctSnapshotCourseRecords,
      verifiedBedeliasCourseCount: source.bedeliasComparison.verifiedBedeliasCourseCount,
      sourceOnlyCourseCount: source.bedeliasComparison.verifiedSourceOnlyCourseCount,
      sourceOnlyBlockCount: source.bedeliasComparison.verifiedSourceOnlyBlockCount,
      candidateProjectionRecords: source.bedeliasComparison.candidateRetainedCount,
      interpretation: "La propuesta 2025 acredita 36 ubicaciones en ocho semestres. Se cotejan 28 códigos técnicos, cuatro materias permanecen sólo-fuente por ambigüedad y seis bloques estructurales no reciben carga inventada; uno conserva la continuación temporal de la Tesina sin duplicar BQ200. Otros 400 registros de proyección siguen candidatos.",
    },
    conclusion: {
      canonicalModel: "one-degree-one-suggested-flexible-pathway",
      regionalCurriculumVariant: false,
      siteSpecificTrajectoryAvailability: false,
      trajectoryStatus: source.publication.trajectoryStatus,
      trajectorySourceDataPath: sourceDataPath,
      reason: source.trajectoryConclusion.reason,
      normalization: [
        "Reproducir ocho semestres de la propuesta educativa 2025 como trayectoria sugerida del Plan 2017.",
        "Preservar 360 créditos, los mínimos por área, 33 créditos de orientación, la Tesina BQ200 de 40 créditos y la validación transversal.",
        "Conservar las alternativas de microbiología, fisiología y virología como opciones no acumulativas.",
        "Publicar 28 códigos cotejados, cuatro materias sólo-fuente, cinco espacios flexibles y una continuación estructural de Tesina sin inventar códigos ni cargas.",
        "Mantener 400 registros de proyección correspondientes a las otras 331 identidades de Bedelías como candidatas recuperables fuera de Currícula y del planificador normal.",
      ],
    },
    sources: source.sources.map((entry) => ({
      url: entry.url,
      authority: entry.authority,
      supports: entry.supports ?? entry.doesNotSupport ?? [],
      ...(entry.contentHash ? { contentHash: entry.contentHash } : {}),
    })),
    anomalies: source.conflicts,
    uiNotice: "Trayectoria sugerida 2025 del Plan 2017. Las alternativas no son acumulativas y los espacios flexibles se completan con tutoría; la Comisión de Carrera valida el currículo, la cohorte y los 10 créditos transversales.",
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
    scope: { territories: ["Montevideo"], pathwayIds: [trajectory.id] },
    sources: source.sources.filter(({ id }) => id !== "bedelias-snapshot").map((entry) => ({
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

function upsertEntry(collection, predicate, entry) {
  const index = collection.findIndex(predicate);
  if (index < 0) collection.push(entry);
  else collection[index] = entry;
}

function validateSource(source, snapshot) {
  if (source.planId !== "bedelias-fcien-licenciatura-en-bioquimica-2017") fail("El artefacto normalizado no corresponde al plan D03ar.");
  if (source.fingerprint?.value !== digest(source.sourcePortions)) fail("La huella de sourcePortions no coincide.");
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    if (source.fingerprint.sourceHashes?.[sourceId] !== digest(portion)) fail(`La huella no coincide para ${sourceId}.`);
  }
  const trajectory = source.trajectories[0];
  if (source.publication.trajectoryStatus !== "official-trajectory-reproduced"
    || source.scope.officialTemporalPeriodsReproduced !== 8
    || trajectory.periods.length !== 8
    || trajectory.periods.flatMap(({ courseIds }) => courseIds).length !== source.projectionBaseline.coursePlacementCount) {
    fail("La evidencia debe reproducir ocho semestres y 36 ubicaciones.");
  }
  if (source.publication.minimumCredits !== 360
    || source.publication.commonMinimumCredits !== 241
    || source.publication.orientationMinimumCredits !== 33
    || source.publication.thesisCredits !== 40) {
    fail("La evidencia debe conservar la estructura 241+33+40 y 360 créditos totales.");
  }
  if (!trajectory.periods[6].courseIds.includes("BQ200")
    || trajectory.periods[7].courseIds.includes("BQ200")
    || !trajectory.periods[7].courseIds.includes("bioquimica-tesina-continuacion-s8")) {
    fail("La Tesina debe conservar BQ200 una sola vez y un bloque de continuación en octavo.");
  }
  const snapshotCourses = snapshot.plan?.courses ?? [];
  if (snapshot.contentHash !== source.bedeliasComparison.snapshotContentHash.replace("sha256:", "")
    || snapshotCourses.length !== source.bedeliasComparison.distinctSnapshotCourseRecords
    || compositionMatterCount(snapshot.plan?.composition) !== source.bedeliasComparison.compositionMatterEntries) {
    fail("El snapshot de Bedelías ya no coincide con los conteos auditados.");
  }
  for (const match of source.catalogMatches) {
    const candidates = snapshotCourses.filter(({ code }) => code === match.sourceCourseId);
    if (candidates.length !== 1) fail(`La identidad ${match.sourceCourseId} no es única en Bedelías.`);
    const [candidate] = candidates;
    if (normalize(candidate.name) !== normalize(match.bedeliasName) || Number(candidate.credits) !== Number(match.credits)) {
      fail(`Cambió la correspondencia técnica ${match.sourceCourseId}.`);
    }
  }
  if (!sameMembers(source.authorityPolicy.verifiedSourceCourseIds, source.catalogMatches.map(({ sourceCourseId }) => sourceCourseId))
    || !sameMembers(source.authorityPolicy.verifiedSourceOnlyIdentityKeys, source.sourceOnlyRows.map(({ identityKey }) => identityKey))) {
    fail("La frontera verified/source-only no coincide con la evidencia normalizada.");
  }
}

function validateRegistry(source, audits, reviews) {
  const audit = audits.audits.find(({ identity }) => identity === source.auditIdentity);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  if (!audit || audit.reviewedAt !== source.reviewedAt
    || audit.conclusion?.trajectoryStatus !== "official-trajectory-reproduced"
    || audit.conclusion?.trajectorySourceDataPath !== sourceDataPath) {
    fail("La auditoría no enlaza la trayectoria oficial normalizada.");
  }
  const trajectory = audit.officialPlan?.trajectories?.find(({ id }) => id === source.projectionBaseline.pathwayId);
  if (!trajectory || trajectory.generatedFallback === true || trajectory.periods.length !== 8) {
    fail("La auditoría no conserva los ocho períodos configurados.");
  }
  if (!review || review.state !== "official-trajectory-reproduced"
    || review.reviewedAt !== source.reviewedAt
    || review.evidence?.kind !== "audited-projection") {
    fail("La revisión D03 no conserva el cierre official-trajectory-reproduced.");
  }
}

function validateProjection(source, projection, inventoryEntry) {
  if (!inventoryEntry || inventoryEntry.state !== "official-trajectory-reproduced"
    || inventoryEntry.evidence?.kind !== "audited-projection"
    || inventoryEntry.evidence?.pathways?.[0]?.periodCount !== 8
    || inventoryEntry.evidence?.matchedCoursePlacements !== source.projectionBaseline.coursePlacementCount) {
    fail("El inventario no reproduce los ocho semestres y 36 ubicaciones.");
  }
  if (projection.plan.minCredits !== 360 || projection.plan.durationMonths !== 48
    || projection.source.reviewedAt !== source.reviewedAt
    || projection.courses.length !== source.bedeliasComparison.projectedCourseRecords) {
    fail("La proyección perdió metadatos o el conteo auditado.");
  }
  const matched = projection.courses.filter(({ authorityStatus, bedeliasCode }) => authorityStatus === "verified" && bedeliasCode);
  const sourceOnly = projection.courses.filter(({ authorityStatus, sourceCourseId }) => authorityStatus === "verified" && sourceCourseId);
  const validationBlocks = projection.courses.filter(({ authorityStatus, dataStatus }) => authorityStatus === "verified" && dataStatus === "manual-validation");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  if (!sameMembers(matched.map(({ bedeliasCode }) => bedeliasCode), source.authorityPolicy.verifiedSourceCourseIds)
    || !sameMembers(sourceOnly.map(({ sourceCourseId }) => sourceCourseId), source.authorityPolicy.verifiedSourceOnlyIdentityKeys)
    || validationBlocks.length !== source.bedeliasComparison.verifiedValidationBlockCount
    || candidates.length !== source.bedeliasComparison.candidateRetainedCount) {
    fail("La regeneración alteró la frontera de autoridad.");
  }
  const thesis = matched.find(({ bedeliasCode }) => bedeliasCode === "BQ200");
  if (thesis?.id !== "fcien-bq200-2" || thesis.credits !== 40
    || sourceOnly.filter(({ creditsPublished }) => creditsPublished === false).length !== 6
    || sourceOnly.some((course) => course.bedeliasCode)) {
    fail("La proyección inventó códigos/cargas o cambió el ID histórico de la Tesina.");
  }
  const pathway = projection.pathways[source.projectionBaseline.pathwayId];
  const presentation = buildRegisteredPlanPresentation(source.projectionBaseline.pathwayId, projection);
  if (pathway?.generatedFallback === true || presentation.generated || presentation.label !== "Trayectoria oficial"
    || pathway.periods.length !== 8
    || pathway.periods.flatMap(({ courseIds }) => courseIds).length !== source.projectionBaseline.coursePlacementCount) {
    fail("Currícula no reproduce la trayectoria sugerida de ocho semestres.");
  }
  const candidateIds = new Set(candidates.map(({ id }) => id));
  if (pathway.periods.some(({ courseIds }) => courseIds.some((id) => candidateIds.has(id)))
    || presentation.courses.some(({ id, provisional }) => provisional === true || candidateIds.has(id))) {
    fail("Una candidata ingresó en la trayectoria publicada.");
  }
}

const source = await readJson(sourcePath);
const snapshot = await readJson(snapshotPath);
const audits = await readJson(auditsPath);
const reviews = await readJson(reviewsPath);
validateSource(source, snapshot);
upsertEntry(audits.audits, ({ identity }) => identity === source.auditIdentity, auditEntry(source));
upsertEntry(reviews.reviews, ({ planId }) => planId === source.planId, reviewEntry(source));
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

console.log(`D03ar regenerado: 8 semestres, 36 ubicaciones, 28 códigos cotejados, 4 materias y 6 bloques sólo-fuente, 400 registros candidatos; ${report.counts.generatedPlans} planes e inventario actualizados.`);
