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
const sourcePath = path.join(projectRoot, "data", "fcien", "astronomia-2016-trajectory-review.json");
const snapshotPath = path.join(projectRoot, "data", "bedelias", "fcien-licenciatura-en-astronomia-2016.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", "bedelias-fcien-licenciatura-en-astronomia-2016.json");
const sourceDataPath = "data/fcien/astronomia-2016-trajectory-review.json";
const projectionDataPath = "app/data/bedelias-generated/bedelias-fcien-licenciatura-en-astronomia-2016.json";

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

function flatRequirements(source) {
  return source.requirements.flatMap((requirement) => [
    requirement,
    ...(requirement.children ?? []).map((child) => ({ ...child, parentId: requirement.id })),
  ]);
}

function sourceById(source, id) {
  const result = source.sources.find((candidate) => candidate.id === id);
  if (!result) fail(`Falta la fuente normalizada ${id}.`);
  return result;
}

function auditEntry(source) {
  const trajectory = source.trajectories[0];
  const curriculumUrl = sourceById(source, trajectory.sourceId).url;
  const requirements = flatRequirements(source);
  const courseOverrides = Object.fromEntries(source.catalogMatches.map((row) => [row.sourceCourseId, {
    name: row.officialLabel,
    preserveName: true,
    requirementId: row.requirementId,
    periodLabel: row.period,
    officialIdentity: true,
    officialCredits: false,
    authorityStatus: "verified",
  }]));
  return {
    identity: source.auditIdentity,
    career: "LICENCIATURA EN ASTRONOMÍA",
    planYear: source.publication.planYear,
    reviewedAt: source.reviewedAt,
    status: "official-evidence-complete",
    scope: "vigencia, título, sede, créditos, áreas, trayectoria sugerida 2023, ocho semestres, bloques flexibles y frontera de autoridad",
    publicationEligible: false,
    officialPlan: {
      approval: [
        "Plan de Estudios de la Licenciatura en Astronomía aprobado en 2016",
        "Reglamento publicado en el Diario Oficial el 30/03/2017",
        "Anexo 2 modificado con oferta estable 2023 por la Comisión de Carrera",
      ],
      planYear: source.publication.planYear,
      title: source.publication.title,
      careerName: "Licenciatura en Astronomía",
      facultyCode: "FCIEN",
      facultyName: "Facultad de Ciencias",
      durationMonths: source.publication.durationMonths,
      minimumCredits: source.publication.minimumCredits,
      current: source.publication.currentAtReview,
      pathwayLabel: "Trayectoria sugerida",
      degreeRule: "El título exige 360 créditos: 70 en Matemática, 100 en Física, 90 en Astronomía, 20 en Métodos Computacionales, 8 en Ciencias Sociales y Humanas, 22 en Experiencias de Formación y 50 combinados entre optativas y electivas.",
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
          "100": "mathematics",
          "101": "physics",
          "102": "astronomy",
          "103": "computational-methods",
          "104": "social-human-sciences",
          "105": "flexible",
          "106": "training-experiences",
          "110": "optional",
          "111": "elective",
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
          availabilityStatus: "trajectory-suggested-no-technical-code",
          sourceUrl: curriculumUrl,
        })),
        periodOrder: trajectory.periods.map(({ label }) => label),
        pathwayLabel: trajectory.label,
        pathwayDescription: trajectory.description,
        creditRequirements: requirements.map((requirement) => ({
          id: requirement.id,
          ...(requirement.parentId ? { parentId: requirement.parentId } : {}),
          name: requirement.name,
          shortName: requirement.shortName,
          minCredits: requirement.minCredits,
        })),
        manualCompletionValidation: "Aprobación de la Comisión de Carrera del currículo individual y del plan de asignaturas optativas",
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
      canonicalSnapshot: "data/bedelias/fcien-licenciatura-en-astronomia-2016.json",
      metadataCurrent: true,
      publishedDurationMonths: source.publication.durationMonths,
      publishedMinimumCredits: source.publication.minimumCredits,
      compositionMatterEntries: source.bedeliasComparison.compositionMatterEntries,
      distinctSnapshotCourseRecords: source.bedeliasComparison.distinctSnapshotCourseRecords,
      verifiedBedeliasCourseCount: source.bedeliasComparison.verifiedBedeliasCourseCount,
      sourceOnlyCourseCount: source.bedeliasComparison.verifiedSourceOnlyCourseCount,
      sourceOnlyBlockCount: source.bedeliasComparison.verifiedSourceOnlyBlockCount,
      candidateProjectionRecords: source.bedeliasComparison.candidateRetainedCount,
      interpretation: "El Anexo 2 acredita 32 ubicaciones en ocho semestres. Se cotejan 26 códigos técnicos activos; seis rótulos ambiguos o estructurales permanecen sólo-fuente y las otras 160 entradas de Bedelías siguen candidatas.",
    },
    conclusion: {
      canonicalModel: "one-degree-one-suggested-flexible-pathway",
      regionalCurriculumVariant: false,
      siteSpecificTrajectoryAvailability: false,
      trajectoryStatus: source.publication.trajectoryStatus,
      trajectorySourceDataPath: sourceDataPath,
      reason: source.trajectoryConclusion.reason,
      normalization: [
        "Reproducir los ocho semestres y las 32 ubicaciones nominales del Anexo 2 modificado en 2023.",
        "Conservar la trayectoria como sugerida y el currículo individual sujeto a tutoría y aprobación de la Comisión de Carrera.",
        "Mantener tres espacios Optativa/Electiva independientes sin convertir el catálogo flexible en obligaciones acumulativas.",
        "Publicar 26 identidades técnicas cotejadas y seis identidades sólo-fuente sin inventar códigos ni cargas.",
        "Mantener las otras 160 identidades de Bedelías como candidatas recuperables fuera de Currícula y del planificador normal.",
      ],
    },
    sources: source.sources.map((entry) => ({
      url: entry.url,
      authority: entry.authority,
      supports: entry.supports ?? entry.doesNotSupport ?? [],
      ...(entry.contentHash ? { contentHash: entry.contentHash } : {}),
    })),
    anomalies: source.conflicts,
    uiNotice: "Trayectoria sugerida de ocho semestres actualizada a la oferta estable 2023. Es una guía flexible: las optativas, electivas y el currículo individual se acuerdan con tutoría y aprobación de la Comisión de Carrera.",
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

function replaceEntry(collection, predicate, entry, label) {
  const index = collection.findIndex(predicate);
  if (index < 0) fail(`No se encontró ${label} para actualizar.`);
  collection[index] = entry;
}

function validateSource(source, snapshot) {
  if (source.planId !== "bedelias-fcien-licenciatura-en-astronomia-2016") fail("El artefacto normalizado no corresponde al plan D03aq.");
  if (source.fingerprint?.value !== digest(source.sourcePortions)) fail("La huella de sourcePortions no coincide.");
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    if (source.fingerprint.sourceHashes?.[sourceId] !== digest(portion)) fail(`La huella no coincide para ${sourceId}.`);
  }
  const trajectory = source.trajectories[0];
  if (source.publication.trajectoryStatus !== "official-trajectory-reproduced"
    || source.scope.officialTemporalPeriodsReproduced !== 8
    || source.trajectoryConclusion.durationIsNotPeriodEvidence !== true
    || trajectory.periods.length !== 8
    || trajectory.periods.some(({ courseIds }) => courseIds.length !== 4)) {
    fail("La evidencia debe reproducir ocho semestres nominales de cuatro ubicaciones.");
  }
  if (sourceById(source, "modified-plan-2023-indexed").accessStatus !== "http-404-search-index-complete"
    || sourceById(source, "department-plan-copy").accessStatus !== "server-no-response") {
    fail("Deben conservarse las reservas de acceso de las copias institucionales.");
  }
  const rootCredits = source.requirements.reduce((sum, requirement) => sum + requirement.minCredits, 0);
  if (rootCredits !== 360 || source.publication.minimumCredits !== 360 || source.publication.durationMonths !== 48) {
    fail("La evidencia debe conservar 360 créditos y 48 meses.");
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
    || review.evidence?.kind !== "audited-projection"
    || review.evidence?.sourceDataPath !== sourceDataPath) {
    fail("La revisión D03 no conserva el cierre official-trajectory-reproduced.");
  }
}

function validateProjection(source, projection, inventoryEntry) {
  if (!inventoryEntry || inventoryEntry.state !== "official-trajectory-reproduced"
    || inventoryEntry.evidence?.kind !== "audited-projection"
    || inventoryEntry.evidence?.pathways?.[0]?.periodCount !== 8
    || inventoryEntry.evidence?.matchedCoursePlacements !== source.projectionBaseline.coursePlacementCount) {
    fail("El inventario no reproduce los ocho semestres y 32 ubicaciones.");
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
  if (sourceOnly.some((course) => course.bedeliasCode || course.creditsPublished !== false)
    || matched.find(({ bedeliasCode }) => bedeliasCode === "AS20")?.id !== "fcien-as20-2"
    || matched.find(({ bedeliasCode }) => bedeliasCode === "AS28")?.id !== "fcien-as28-2") {
    fail("La proyección inventó códigos/cargas o cambió IDs históricos.");
  }
  const pathway = projection.pathways[source.projectionBaseline.pathwayId];
  const presentation = buildRegisteredPlanPresentation(source.projectionBaseline.pathwayId, projection);
  if (pathway?.generatedFallback === true || presentation.generated || presentation.label !== "Trayectoria oficial"
    || presentation.periods.length !== 8
    || presentation.periods.flatMap(({ courseIds }) => courseIds).length !== source.projectionBaseline.coursePlacementCount) {
    fail("Currícula no reproduce la trayectoria sugerida de ocho semestres.");
  }
  const candidateIds = new Set(candidates.map(({ id }) => id));
  if (pathway.periods.some(({ courseIds }) => courseIds.some((id) => candidateIds.has(id)))) {
    fail("Una candidata ingresó en la trayectoria publicada.");
  }
  if (presentation.courses.some(({ provisional }) => provisional === true)
    || presentation.courses.some(({ id }) => candidateIds.has(id))) {
    fail("Una candidata ingresó en la presentación oficial.");
  }
}

const source = await readJson(sourcePath);
const snapshot = await readJson(snapshotPath);
const audits = await readJson(auditsPath);
const reviews = await readJson(reviewsPath);
validateSource(source, snapshot);
replaceEntry(audits.audits, ({ identity }) => identity === source.auditIdentity, auditEntry(source), "la auditoría de Astronomía");
replaceEntry(reviews.reviews, ({ planId }) => planId === source.planId, reviewEntry(source), "la revisión de Astronomía");
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

console.log(`D03aq regenerado: 8 semestres, 32 ubicaciones, 26 códigos cotejados, 6 identidades sólo-fuente, 160 candidatas y trayectoria oficial reproducida; ${report.counts.generatedPlans} planes e inventario actualizados.`);
