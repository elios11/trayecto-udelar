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
const sourceDataPath = "data/fagro/ingenieria-agronomica-2020-trajectory-review.json";
const projectionDataPath = "app/data/bedelias-generated/bedelias-fagro-ingeniero-agronomo-2020.json";
const sourcePath = path.join(projectRoot, sourceDataPath);
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const canonicalSnapshotPath = path.join(projectRoot, "data", "bedelias", "fagro-ingeniero-agronomo-2020.json");
const regionalSnapshotPath = path.join(projectRoot, "data", "bedelias", "cenurln-ingeniero-agronomo-2020.json");
const projectionPath = path.join(projectRoot, projectionDataPath);

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };
const sameMembers = (actual, expected) => actual.length === expected.length
  && new Set(actual).size === actual.length
  && actual.every((value) => expected.includes(value));

function periodCredits(source, period) {
  const blockById = new Map(source.blocks.map((block) => [block.id, block]));
  return period.courseIds.reduce((total, courseId) => total + Number(blockById.get(courseId)?.credits ?? 0), 0);
}

function validateSource(source) {
  if (source.planId !== "bedelias-fagro-ingeniero-agronomo-2020"
    || source.auditIdentity !== "ingeniero agronomo:2020"
    || source.publication.officialPlanYear !== "2020"
    || source.publication.durationMonths !== 60
    || source.publication.durationSemesters !== 10
    || source.publication.minimumCredits !== 450
    || source.publication.trajectoryKind !== "indicative-tentative-semester-grids"
    || source.publication.mandatorySequence !== false) {
    fail("La evidencia normalizada debe conservar el Plan 2020, diez semestres, 450 créditos y el carácter tentativo de sus grillas.");
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
  const planSource = source.sources.find(({ id }) => id === "plan-2020");
  const implementationSource = source.sources.find(({ id }) => id === "arcusur-implementation-2022");
  if (planSource?.rawPdfContentHash !== "sha256:6013c05243034b6894fb7e53def80225b7c0a5f8d0fba4c7da60314c61c1f308"
    || !sameMembers(planSource.visuallyInspectedPdfPages ?? [], [4, 5, 6, 7, 8, 9, 10, 11])
    || implementationSource?.rawPdfContentHash !== "sha256:42a01f916ff96e2a0e42d3ee5556ebec9337dceead7615f838411f50fea63bf7"
    || !sameMembers(implementationSource.visuallyInspectedPdfPages ?? [], [51, 52])) {
    fail("La evidencia PDF debe conservar las huellas crudas y páginas inspeccionadas visualmente.");
  }
  if (!/Plan 1989/.test(source.sourcePortions["career-page"]?.boundary ?? "")
    || source.currentOffer2026?.projectionAuthority !== false
    || !/oferta año 2026/i.test(source.sourcePortions["year-pages-2026"]?.firstToThird ?? "")) {
    fail("La evidencia debe excluir la tabla Plan 1989 y separar la oferta periódica 2026.");
  }
  if (source.blocks.length !== 61
    || new Set(source.blocks.map(({ id }) => id)).size !== source.blocks.length
    || source.projectionBaseline.snapshotCourseCount !== 717
    || source.projectionBaseline.candidateSourceCourseCount !== 717
    || source.projectionBaseline.sourceBlockCount !== 61) {
    fail("La frontera de evidencia debe conservar 61 bloques oficiales y 717 entradas candidatas de Bedelías.");
  }
  const expectedLabels = Array.from({ length: 10 }, (_, index) => `Semestre ${index + 1}`);
  const expectedPlacements = new Map([["maximo-afo-iii", 45], ["minimo-afo-iii", 49]]);
  if (!sameMembers(source.trajectories.map(({ id }) => id), [...expectedPlacements.keys()])) {
    fail("Deben conservarse exactamente los ejemplos oficiales máximo y mínimo de AFO III.");
  }
  for (const trajectory of source.trajectories) {
    const labels = trajectory.periods.map(({ label }) => label);
    const placements = trajectory.periods.reduce((total, period) => total + period.courseIds.length, 0);
    if (JSON.stringify(labels) !== JSON.stringify(expectedLabels)
      || placements !== expectedPlacements.get(trajectory.id)
      || trajectory.periods.some((period) => periodCredits(source, period) !== 45)
      || trajectory.periods.reduce((total, period) => total + periodCredits(source, period), 0) !== 450) {
      fail(`La trayectoria ${trajectory.id} debe conservar diez semestres de 45 créditos y 450 créditos totales.`);
    }
  }
  const cycleMinimums = source.creditRequirements
    .filter(({ parentId }) => !parentId)
    .map(({ minCredits }) => minCredits);
  if (JSON.stringify(cycleMinimums) !== JSON.stringify([90, 180, 180])) {
    fail("Los mínimos oficiales de los tres ciclos deben permanecer en 90, 180 y 180 créditos.");
  }
}

function validateSnapshots(source, canonical, regional) {
  const canonicalIds = canonical.plan.courses.map(({ code }) => code);
  const regionalIds = regional.plan.courses.map(({ code }) => code);
  if (canonicalIds.length !== source.projectionBaseline.snapshotCourseCount
    || regionalIds.length !== source.projectionBaseline.snapshotCourseCount
    || JSON.stringify([...canonicalIds].sort()) !== JSON.stringify([...regionalIds].sort())) {
    fail("Los snapshots existentes deben conservar 717 identidades equivalentes sin repetir la extracción.");
  }
}

function auditFromSource(source) {
  const planSource = source.sources.find(({ id }) => id === "plan-2020");
  const pathwayIds = source.trajectories.map(({ id }) => id);
  return {
    identity: source.auditIdentity,
    career: "INGENIERO AGRÓNOMO",
    planYear: "2020",
    reviewedAt: source.reviewedAt,
    status: "official-evidence-complete",
    scope: "plan aprobado, ciclos, créditos, dos grillas tentativas de diez semestres y separación de la oferta periódica 2026",
    publicationEligible: false,
    officialPlan: {
      approval: source.sourcePortions["plan-2020"].approval,
      planYear: "2020",
      title: source.publication.title,
      durationMonths: source.publication.durationMonths,
      semesters: source.publication.durationSemesters,
      minimumCredits: source.publication.minimumCredits,
      current: true,
      degreeRule: "El título exige 450 créditos: 90 del Ciclo Básico General, 180 del Ciclo Básico Agronómico y 180 del Ciclo de Análisis y Consolidación, incluido un Trabajo Final de Grado de 45 créditos.",
      cycles: [
        {
          name: "Ciclo Básico General",
          years: "1",
          minimumCredits: 90,
          requirements: { mandatoryCourses: 80, mandatoryTrainingArea: 6, optionalOrElective: 4 },
        },
        {
          name: "Ciclo Básico Agronómico",
          years: "2-3",
          minimumCredits: 180,
          requirements: { mandatoryCourses: 135, mandatoryTrainingArea: 18, optionalOrElective: 27 },
        },
        {
          name: "Ciclo de Análisis y Consolidación",
          years: "4-5",
          minimumCredits: 180,
          requirements: {
            mandatoryTrainingAreaMinimum: 27,
            mandatoryTrainingAreaMaximum: 63,
            optionalOrElectiveMinimum: 72,
            optionalOrElectiveMaximum: 108,
            finalProject: 45,
          },
        },
      ],
      trajectoryRule: "Las grillas del Plan 2020 son tentativas e indicativas. Los ejemplos máximo y mínimo de AFO III muestran distribuciones posibles del mismo título y no perfiles certificados ni secuencias obligatorias.",
      trajectories: source.trajectories.map((trajectory) => ({
        id: trajectory.id,
        label: trajectory.label,
        description: trajectory.description,
        sourceUrl: planSource.url,
        useOnlyConfiguredPeriods: true,
        periods: trajectory.periods,
      })),
      curriculum: {
        useBedeliasCompositionTree: true,
        preserveBedeliasCourseIds: true,
        deduplicateSharedProfileCourses: true,
        sourceUrl: planSource.url,
        sourceDataPath,
        pathwayLabel: "Ejemplo oficial de distribución",
        pathwayDescription: "Grilla tentativa e indicativa del Plan 2020; orienta una trayectoria flexible y no impone cursar todos los bloques como materias.",
        strictOfficialCourseIds: true,
        verifiedCourseIds: [],
        additionalCourses: source.blocks.map((block) => ({
          id: block.id,
          sourceCourseId: block.id,
          name: block.name,
          credits: block.credits,
          requirementId: block.requirementId,
          periodLabel: block.periodLabel,
          sourceUrl: planSource.url,
          curricularBlock: true,
          ...(block.pathwayIds ? { pathwayIds: block.pathwayIds } : {}),
        })),
        creditRequirements: source.creditRequirements,
        credentials: [{
          id: "bedelias-degree",
          title: source.publication.title,
          minTotalCredits: source.publication.minimumCredits,
          nodeRequirements: source.creditRequirements.map(({ id, minCredits }) => ({ nodeId: id, minCredits })),
          sourceUrl: planSource.url,
        }],
        includeAllCoursesInPathwayCatalog: false,
        periodOrder: Array.from({ length: 10 }, (_, index) => `Semestre ${index + 1}`),
      },
    },
    offerings: [
      {
        serviceCode: "FAGRO",
        locations: [
          "Facultad de Agronomía, Montevideo",
          "Estación Experimental Mario A. Cassinoni, Paysandú",
          "Estación Experimental de Facultad de Agronomía de Salto",
        ],
        role: "servicio responsable del único Plan 2020; la grilla estable no asigna un ejemplo por sede",
        trajectoryIds: pathwayIds,
        curriculumVariant: false,
      },
      {
        serviceCode: "CENURLN",
        locations: ["Sede Salto", "Sede Paysandú"],
        role: "oferta regional del mismo plan; las planillas 2026 se conservan como oferta periódica separada",
        trajectoryIds: pathwayIds,
        curriculumVariant: false,
      },
    ],
    bedeliasComparison: {
      canonicalSnapshot: "data/bedelias/fagro-ingeniero-agronomo-2020.json",
      regionalSnapshot: "data/bedelias/cenurln-ingeniero-agronomo-2020.json",
      canonicalCourses: 717,
      regionalCourses: 717,
      onlyCanonical: 0,
      onlyRegional: 0,
      interpretation: "Los dos snapshots contienen las mismas 717 identidades. Se mantienen como candidatas recuperables; los 61 bloques de las grillas del Plan son la única capa curricular verificada de esta reconciliación.",
    },
    conclusion: {
      canonicalModel: "one-plan-multiple-offerings",
      regionalCurriculumVariant: false,
      siteSpecificTrajectoryAvailability: false,
      trajectorySourceDataPath: sourceDataPath,
      trajectoryStatus: "official-trajectory-reproduced",
      reason: "El Plan 2020 publica dos grillas tentativas e indicativas de diez semestres para el mismo título. La tabla nominal de portada pertenece al Plan 1989 y la oferta 2026 varía por período y sede, por lo que ninguna de las dos se importa como trayectoria estable.",
      normalization: [
        "Conservar una sola identidad canónica para el Plan 2020 en Montevideo, Paysandú y Salto.",
        "Reproducir los dos ejemplos tentativos máximo y mínimo de AFO III como guías flexibles del mismo título.",
        "No convertir los bloques de área ni las opciones de los anexos en una secuencia obligatoria de materias.",
        "Mantener las 717 entradas de los snapshots como candidatas y fuera de los períodos publicados hasta contar con autoridad curricular inequívoca.",
        "Excluir expresamente la currícula Plan 1989 y separar la oferta 2026 de la trayectoria estable.",
      ],
    },
    sources: source.sources.map((item) => ({
      url: item.url,
      authority: item.authority,
      contentHash: item.contentHash,
      supports: [item.role],
    })),
    anomalies: source.conflicts.map((resolution, index) => ({ field: `fagro-plan-2020-${index + 1}`, resolution })),
    uiNotice: "Plan 2020 de 450 créditos. Los dos recorridos son ejemplos tentativos e indicativos: orientan una distribución flexible y no obligan a cursar todos los bloques como materias. La oferta 2026 y la tabla Plan 1989 no forman parte de esta grilla estable.",
    remainingWork: "Las 717 entradas históricas de Bedelías siguen como candidatas sin aportar a períodos ni requisitos. La distribución estable por sede o sistema de producción debe revisarse cuando Fagro publique una malla permanente que sustituya la oferta anual.",
  };
}

function reviewFromSource(source) {
  return {
    planId: source.planId,
    state: "official-trajectory-reproduced",
    reviewedAt: source.reviewedAt,
    effectiveAt: source.effectiveAt,
    projectionMechanism: "official-profiles",
    scope: {
      territories: ["Montevideo", "Paysandú", "Salto"],
      pathwayIds: source.trajectories.map(({ id }) => id),
    },
    sources: source.sources.map(({ authority, url, reviewedAt, role, contentHash }) => ({ authority, url, reviewedAt, role, contentHash })),
    evidence: {
      kind: "audited-projection",
      sourceDataPath,
      projectionDataPath,
      sourceCollection: "trajectories",
      projectionCollection: "publishedPathways",
      periodField: "periods",
      compareCoursePlacements: true,
    },
    conflictNotes: source.conflicts,
  };
}

function upsertBy(items, predicate, value) {
  const index = items.findIndex(predicate);
  if (index >= 0) items[index] = value;
  else items.push(value);
}

async function updateRegistries(source) {
  const [audits, reviews] = await Promise.all([readJson(auditsPath), readJson(reviewsPath)]);
  upsertBy(audits.audits, (audit) => audit.identity === source.auditIdentity, auditFromSource(source));
  upsertBy(reviews.reviews, (review) => review.planId === source.planId, reviewFromSource(source));
  audits.contentHash = officialAuditRegistryHash(audits);
  await Promise.all([writeJson(auditsPath, audits), writeJson(reviewsPath, reviews)]);
}

function validateProjection(source, projection, inventoryEntry) {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  if (verified.length !== source.projectionBaseline.sourceBlockCount
    || candidates.length !== source.projectionBaseline.candidateSourceCourseCount
    || projection.courses.length !== 778
    || projection.plan.minCredits !== 450
    || projection.plan.durationMonths !== 60
    || projection.plan.courseCatalogAuditStatus !== "partial"
    || projection.publishedRules.length !== 0) {
    fail("La proyección debe conservar 61 bloques verificados, 717 candidatas, 450 créditos y ninguna regla candidata publicada.");
  }
  if (!sameMembers(projection.campuses.map(({ id }) => id), source.projectionBaseline.campusIds)
    || projection.campuses.some(({ defaultPathwayId }) => defaultPathwayId !== "maximo-afo-iii")
    || !sameMembers(Object.keys(projection.publishedPathways), source.trajectories.map(({ id }) => id))) {
    fail("La proyección perdió una sede o uno de los dos ejemplos oficiales del mismo Plan 2020.");
  }
  const candidateIds = new Set(candidates.map(({ id }) => id));
  for (const trajectory of source.trajectories) {
    const pathway = projection.publishedPathways[trajectory.id];
    if (!pathway || pathway.periods.length !== 10
      || pathway.periods.some(({ courseIds }) => courseIds.some((id) => candidateIds.has(id)))) {
      fail(`La trayectoria ${trajectory.id} debe tener diez períodos y excluir las 717 candidatas.`);
    }
    for (const [index, sourcePeriod] of trajectory.periods.entries()) {
      const projectedPeriod = pathway.periods[index];
      if (projectedPeriod.label !== sourcePeriod.label || projectedPeriod.courseIds.length !== sourcePeriod.courseIds.length) {
        fail(`La trayectoria ${trajectory.id} perdió la correspondencia del ${sourcePeriod.label}.`);
      }
    }
  }
  if (!inventoryEntry || inventoryEntry.state !== "official-trajectory-reproduced"
    || inventoryEntry.currentProjection?.primary !== "official-profiles"
    || inventoryEntry.evidence?.expectedCoursePlacements !== 94
    || inventoryEntry.evidence?.matchedCoursePlacements !== 94) {
    fail("El inventario no confirmó las 94 colocaciones de los dos ejemplos oficiales.");
  }
}

const source = await readJson(sourcePath);
validateSource(source);
validateSnapshots(source, await readJson(canonicalSnapshotPath), await readJson(regionalSnapshotPath));
await updateRegistries(source);
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
validateProjection(source, await readJson(projectionPath), inventory.plans.find(({ planId }) => planId === source.planId));

console.log(`D03ai regenerado: Plan 2020, dos grillas tentativas de diez semestres, 61 bloques verificados y 717 entradas candidatas; ${report.counts.generatedPlans} planes e inventario actualizados.`);
