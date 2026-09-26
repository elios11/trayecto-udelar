#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const curatedCatalogPath = path.join(projectRoot, "app", "data", "curated-academic-catalog.json");
const extractedCatalogPath = path.join(projectRoot, "app", "data", "extracted-academic-catalog.json");
const extractedReportPath = path.join(projectRoot, "data", "bedelias", "inventory", "ui-extracted-plans.json");
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const inventoryPath = path.join(projectRoot, "data", "official-trajectories", "inventory.json");

export const TRAJECTORY_STATES = [
  "official-trajectory-reproduced",
  "official-trajectory-identified-pending",
  "no-official-trajectory-documented",
  "research-pending",
];

export const PROJECTION_MECHANISMS = [
  "official-periods",
  "official-profiles",
  "official-flexible-structure",
  "areas",
  "administrative-composition",
];

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const relativePath = (filePath) => path.relative(projectRoot, filePath).replaceAll("\\", "/");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es-UY")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

function catalogPlacements(curatedCatalog, extractedCatalog) {
  const curatedFacultyIds = new Set(curatedCatalog.map(({ id }) => id));
  const normalizeFacultyId = (id) => {
    const candidate = id.startsWith("bedelias-") ? id.slice("bedelias-".length) : id;
    return curatedFacultyIds.has(candidate) ? candidate : id;
  };
  const facultyLabels = new Map(curatedCatalog.map(({ id, label }) => [id, label]));
  const placements = [];
  for (const faculty of [...curatedCatalog, ...extractedCatalog]) {
    const facultyId = normalizeFacultyId(faculty.id);
    const facultyLabel = facultyLabels.get(facultyId) ?? faculty.label;
    for (const career of faculty.careers) {
      for (const plan of career.plans) {
        placements.push({
          serviceId: facultyId,
          serviceLabel: facultyLabel,
          careerId: career.id,
          careerLabel: career.label,
          planId: plan.id,
          planLabel: plan.label,
          defaultTrajectoryId: plan.defaultTrajectoryId,
          defaultCredentialId: plan.defaultCredentialId,
        });
      }
    }
  }
  return placements.sort((left, right) => left.serviceLabel.localeCompare(right.serviceLabel, "es-UY")
    || left.careerLabel.localeCompare(right.careerLabel, "es-UY")
    || left.planLabel.localeCompare(right.planLabel, "es-UY")
    || left.planId.localeCompare(right.planId, "es-UY"));
}

function toCollectionMap(value) {
  if (Array.isArray(value)) return new Map(value.map((item) => [item.id, item]));
  return new Map(Object.entries(value ?? {}));
}

async function reviewedEvidence(review) {
  if (review.evidence.kind !== "audited-projection") return review.evidence;
  let source = await readJson(path.join(projectRoot, review.evidence.sourceDataPath));
  if (review.evidence.sourcePlanId) {
    source = source.plans?.find(({ id }) => id === review.evidence.sourcePlanId);
    if (!source) throw new Error(`No existe ${review.evidence.sourcePlanId} en ${review.evidence.sourceDataPath}.`);
  }
  const projection = await readJson(path.join(projectRoot, review.evidence.projectionDataPath));
  const sourcePathways = toCollectionMap(source[review.evidence.sourceCollection]);
  const projectedPathways = toCollectionMap(projection[review.evidence.projectionCollection]);
  const projectedCourseBySourceIdentity = new Map();
  if (review.evidence.compareCoursePlacements === true) {
    for (const course of projection.courses ?? []) {
      for (const identity of [
        course.id,
        course.bedeliasCode,
        course.sourceCourseId,
        ...(course.equivalentCourseIds ?? []),
        ...(course.equivalentBedeliasCodes ?? []),
      ].filter(Boolean)) projectedCourseBySourceIdentity.set(String(identity), course.id);
    }
    for (const record of projection.courseAuthority?.records ?? []) {
      if (record.sourceCourseId && record.canonicalCourseId) {
        projectedCourseBySourceIdentity.set(String(record.sourceCourseId), record.canonicalCourseId);
      }
    }
  }
  const pathways = [];
  let expectedCoursePlacements = 0;
  let matchedCoursePlacements = 0;
  for (const pathwayId of review.scope.pathwayIds) {
    const sourcePathway = sourcePathways.get(pathwayId);
    const projectedPathway = projectedPathways.get(pathwayId);
    if (!sourcePathway || !projectedPathway) throw new Error(`Falta la trayectoria ${pathwayId} en la evidencia de ${review.planId}.`);
    const sourcePeriods = sourcePathway[review.evidence.periodField];
    const projectedPeriods = projectedPathway[review.evidence.periodField];
    if (!Array.isArray(sourcePeriods) || sourcePeriods.length === 0 || sourcePeriods.length !== projectedPeriods?.length) {
      throw new Error(`Los períodos auditados y proyectados no coinciden para ${review.planId}/${pathwayId}.`);
    }
    if (review.evidence.compareCoursePlacements === true) {
      const sourceLabels = sourcePeriods.map(({ label }) => label);
      const projectedLabels = projectedPeriods.map(({ label }) => label);
      if (JSON.stringify(sourceLabels) !== JSON.stringify(projectedLabels)) {
        throw new Error(`Las etiquetas de períodos no coinciden para ${review.planId}/${pathwayId}.`);
      }
      for (const [periodIndex, sourcePeriod] of sourcePeriods.entries()) {
        const projectedIds = new Set(projectedPeriods[periodIndex].courseIds ?? []);
        for (const sourceCourseId of sourcePeriod.courseIds ?? []) {
          expectedCoursePlacements += 1;
          const normalizedSuffix = normalize(sourceCourseId).replaceAll(" ", "-");
          const projectedCourseId = projectedCourseBySourceIdentity.get(String(sourceCourseId))
            ?? (projection.courses ?? []).find(({ id }) => id.endsWith(`-${normalizedSuffix}`))?.id;
          if (projectedCourseId && projectedIds.has(projectedCourseId)) matchedCoursePlacements += 1;
        }
      }
    }
    pathways.push({ id: pathwayId, periodCount: sourcePeriods.length });
  }
  if (review.evidence.compareCoursePlacements === true && expectedCoursePlacements !== matchedCoursePlacements) {
    throw new Error(`La correspondencia de materias no coincide para ${review.planId}: ${matchedCoursePlacements}/${expectedCoursePlacements}.`);
  }
  return {
    ...review.evidence,
    sourceContentHash: digest(source),
    projectionContentHash: digest(projection),
    pathways,
    ...(review.evidence.compareCoursePlacements === true ? {
      expectedCoursePlacements,
      matchedCoursePlacements,
    } : {}),
  };
}

function officialSources(audit, trajectoryEvidenceUrls) {
  const sources = (audit?.sources ?? []).map((source) => ({
    authority: source.authority,
    url: source.url,
    role: (source.supports ?? []).join("; "),
    trajectoryEvidence: trajectoryEvidenceUrls.has(source.url),
    ...(source.contentHash ? { contentHash: source.contentHash } : {}),
  }));
  const curriculumUrl = audit?.officialPlan?.curriculum?.sourceUrl;
  if (curriculumUrl && !sources.some(({ url }) => url === curriculumUrl)) {
    sources.unshift({
      authority: audit.officialPlan?.facultyName ?? "Servicio u órgano oficial consignado en la auditoría",
      url: curriculumUrl,
      role: trajectoryEvidenceUrls.has(curriculumUrl) ? "estructura oficial de períodos normalizada por la auditoría" : "estructura curricular auditada",
      trajectoryEvidence: trajectoryEvidenceUrls.has(curriculumUrl),
    });
  }
  return sources;
}

function extractedMechanism(audit, projection) {
  const curriculum = audit?.officialPlan?.curriculum ?? {};
  const officialTrajectories = (audit?.officialPlan?.trajectories ?? []).filter(({ periods }) => periods?.length);
  const pathwayIds = Object.keys(projection.pathways ?? {});
  if (curriculum.periods?.length) {
    return {
      primary: pathwayIds.length > 1 ? "official-profiles" : "official-periods",
      features: [...new Set(["official-periods", ...(pathwayIds.length > 1 ? ["official-profiles"] : [])])],
    };
  }
  if (officialTrajectories.length) {
    return {
      primary: officialTrajectories.length > 1 ? "official-profiles" : "official-periods",
      features: [...new Set(["official-periods", ...(officialTrajectories.length > 1 ? ["official-profiles"] : [])])],
    };
  }
  const description = normalize(curriculum.pathwayDescription);
  if (/flexible|personalizad|itinerario propio/.test(description)) {
    return { primary: "official-flexible-structure", features: ["official-flexible-structure"] };
  }
  if (curriculum.periodOrder?.length) {
    const temporal = curriculum.periodOrder.some((label) => /semestre|ano|ciclo|trayectoria sugerida/i.test(normalize(label)));
    return { primary: temporal ? "official-periods" : "areas", features: [temporal ? "official-periods" : "areas"] };
  }
  if (pathwayIds.length > 1 && audit?.officialPlan?.trajectories?.length) {
    return { primary: "official-profiles", features: ["official-profiles"] };
  }
  return { primary: "administrative-composition", features: ["administrative-composition"] };
}

function compareOfficialPeriods(audit, projection) {
  const curriculum = audit.officialPlan.curriculum;
  const officialPeriods = curriculum.periods;
  const projectedPathways = Object.entries(projection.pathways ?? {});
  const expectedLabels = officialPeriods.map(({ label }) => label);
  const periodLabelsMatch = projectedPathways.length > 0 && projectedPathways.every(([, pathway]) =>
    JSON.stringify((pathway.periods ?? []).map(({ label }) => label)) === JSON.stringify(expectedLabels));
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  const officialCourseNames = new Map([
    ...(curriculum.courseGroups ?? []).flatMap((group) => (group.courses ?? []).map((course) => [course.id, course.name])),
    ...(curriculum.catalogCourses ?? []).map((course) => [course.id, course.name]),
  ]);
  let expectedCoursePlacements = 0;
  let matchedCoursePlacements = 0;
  for (const [periodIndex, officialPeriod] of officialPeriods.entries()) {
    const projectedNames = new Set(projectedPathways.flatMap(([, pathway]) =>
      (pathway.periods?.[periodIndex]?.courseIds ?? []).map((courseId) => normalize(courseById.get(courseId)?.name))).filter(Boolean));
    const periodCourses = officialPeriod.courses
      ?? (officialPeriod.courseIds ?? []).map((id) => ({ id, name: officialCourseNames.get(id) }));
    for (const course of periodCourses) {
      expectedCoursePlacements += 1;
      if (projectedNames.has(normalize(course.name))) matchedCoursePlacements += 1;
    }
  }
  const projectedCatalogNames = new Set(projectedPathways.flatMap(([, pathway]) =>
    (pathway.catalogCourseIds ?? []).map((courseId) => normalize(courseById.get(courseId)?.name))).filter(Boolean));
  const catalogCourses = [
    ...(curriculum.catalogCourses ?? []),
    ...(curriculum.catalogCourseIds ?? []).map((id) => ({ id, name: officialCourseNames.get(id) })),
  ];
  for (const course of catalogCourses) {
    expectedCoursePlacements += 1;
    if (projectedCatalogNames.has(normalize(course.name))) matchedCoursePlacements += 1;
  }
  return {
    periodLabelsMatch,
    coursePlacementsMatch: expectedCoursePlacements === matchedCoursePlacements,
    expectedCoursePlacements,
    matchedCoursePlacements,
    officialPeriodCount: officialPeriods.length,
    projectedPathways: projectedPathways.map(([id, pathway]) => ({ id, periodCount: pathway.periods?.length ?? 0 })),
    projectionContentHash: digest(projection),
  };
}

function compareOfficialTrajectories(audit, projection) {
  const officialTrajectories = audit.officialPlan.trajectories.filter(({ periods }) => periods?.length);
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  const curriculum = audit.officialPlan.curriculum ?? {};
  const sourceCourseNames = new Map([
    ...Object.entries(curriculum.courseOverrides ?? {}).map(([id, course]) => [id, course.name]),
    ...(curriculum.additionalCourses ?? []).map((course) => [course.id, course.name]),
  ]);
  let expectedCoursePlacements = 0;
  let matchedCoursePlacements = 0;
  let periodLabelsMatch = true;
  const projectedPathways = [];
  for (const officialTrajectory of officialTrajectories) {
    const projectedPathway = projection.pathways?.[officialTrajectory.id];
    projectedPathways.push({ id: officialTrajectory.id, periodCount: projectedPathway?.periods?.length ?? 0 });
    if (!projectedPathway || JSON.stringify(projectedPathway.periods.map(({ label }) => label)) !== JSON.stringify(officialTrajectory.periods.map(({ label }) => label))) {
      periodLabelsMatch = false;
    }
    for (const [periodIndex, officialPeriod] of officialTrajectory.periods.entries()) {
      const actualCourses = (projectedPathway?.periods?.[periodIndex]?.courseIds ?? []).map((courseId) => courseById.get(courseId)).filter(Boolean);
      for (const sourceCourseId of officialPeriod.courseIds ?? []) {
        expectedCoursePlacements += 1;
        const sourceName = sourceCourseNames.get(sourceCourseId);
        if (actualCourses.some((course) => course.id === sourceCourseId
          || course.bedeliasCode === sourceCourseId
          || (sourceName && normalize(course.name) === normalize(sourceName)))) {
          matchedCoursePlacements += 1;
        }
      }
    }
  }
  return {
    periodLabelsMatch,
    coursePlacementsMatch: expectedCoursePlacements === matchedCoursePlacements,
    expectedCoursePlacements,
    matchedCoursePlacements,
    officialPeriodCount: officialTrajectories.reduce((sum, trajectory) => sum + trajectory.periods.length, 0),
    projectedPathways,
    projectionContentHash: digest(projection),
  };
}

function conflictNotes(audit) {
  return (audit?.anomalies ?? []).map((anomaly) => `${anomaly.field}: ${anomaly.resolution}`);
}

async function extractedEntry(planId, reportItem, audit) {
  const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", `${planId}.json`);
  const projection = await readJson(projectionPath);
  const curriculumHasPeriods = Boolean(audit?.officialPlan?.curriculum?.periods?.length);
  const trajectoriesHavePeriods = Boolean(audit?.officialPlan?.trajectories?.some(({ periods }) => periods?.length));
  const comparison = curriculumHasPeriods
    ? compareOfficialPeriods(audit, projection)
    : trajectoriesHavePeriods
      ? compareOfficialTrajectories(audit, projection)
      : null;
  const correspondenceConfirmed = comparison?.periodLabelsMatch && comparison?.coursePlacementsMatch;
  const state = correspondenceConfirmed
    ? "official-trajectory-reproduced"
    : curriculumHasPeriods || trajectoriesHavePeriods
      ? "official-trajectory-identified-pending"
      : "research-pending";
  const trajectoryEvidenceUrls = new Set([
    ...(curriculumHasPeriods || trajectoriesHavePeriods ? [audit?.officialPlan?.curriculum?.sourceUrl] : []),
    ...(audit?.officialPlan?.trajectories ?? []).filter(({ periods }) => periods?.length).map(({ sourceUrl }) => sourceUrl),
  ].filter(Boolean));
  const sources = officialSources(audit, trajectoryEvidenceUrls);
  return {
    state,
    reviewedAt: audit?.reviewedAt ?? null,
    effectiveAt: audit?.officialPlan?.effectiveFrom ?? audit?.officialPlan?.planYear ?? audit?.planYear ?? null,
    officialSources: sources,
    scope: {
      territories: (projection.campuses ?? []).map(({ label }) => label),
      pathwayIds: Object.keys(projection.pathways ?? {}),
    },
    currentProjection: extractedMechanism(audit, projection),
    evidence: correspondenceConfirmed || curriculumHasPeriods || trajectoriesHavePeriods
      ? {
        kind: "exact-period-course-placement",
        auditIdentity: reportItem.identity,
        auditPath: relativePath(auditsPath),
        projectionPath: relativePath(projectionPath),
        ...comparison,
      }
      : {
        kind: "insufficient-trajectory-evidence",
        auditIdentity: reportItem.identity,
        auditPath: relativePath(auditsPath),
        projectionPath: relativePath(projectionPath),
        reason: "La auditoría existente no demuestra una trayectoria sugerida oficial ni su ausencia.",
      },
    conflictNotes: [
      ...conflictNotes(audit),
      ...((curriculumHasPeriods || trajectoriesHavePeriods) && !correspondenceConfirmed
        ? ["La fuente contiene períodos explícitos, pero la proyección actual no conserva una correspondencia exacta de etiquetas y materias por período."]
        : []),
    ],
  };
}

export function validateInventoryEntry(entry, audit) {
  if (!TRAJECTORY_STATES.includes(entry.state)) throw new Error(`Estado inválido para ${entry.planId}: ${entry.state}.`);
  if (!PROJECTION_MECHANISMS.includes(entry.currentProjection.primary)) throw new Error(`Mecanismo inválido para ${entry.planId}.`);
  if (entry.state === "official-trajectory-reproduced") {
    if (entry.officialSources.length === 0 || !["audited-projection", "exact-period-course-placement"].includes(entry.evidence?.kind)) {
      throw new Error(`${entry.planId} no puede marcarse reproducido sin fuente y correspondencia estructurada.`);
    }
  }
  if (entry.state === "no-official-trajectory-documented") {
    if (entry.officialSources.length === 0 || !entry.reviewedAt || entry.evidence?.kind !== "documented-absence" || !entry.evidence.justification) {
      throw new Error(`${entry.planId} no puede documentar ausencia sin fuente, fecha y justificación.`);
    }
    if (audit?.officialPlan?.curriculum?.periods?.length || audit?.officialPlan?.trajectories?.some(({ periods }) => periods?.length)) {
      throw new Error(`${entry.planId} tiene períodos oficiales auditados y no puede figurar como ausencia documentada.`);
    }
  }
}

function stateCounts(entries) {
  return Object.fromEntries(TRAJECTORY_STATES.map((state) => [state, entries.filter((entry) => entry.state === state).length]));
}

function serviceCounts(entries) {
  const services = new Map();
  for (const entry of entries) {
    for (const placement of entry.catalogPlacements) {
      if (!services.has(placement.serviceId)) services.set(placement.serviceId, { serviceId: placement.serviceId, serviceLabel: placement.serviceLabel, plans: new Map() });
      services.get(placement.serviceId).plans.set(entry.planId, entry);
    }
  }
  return [...services.values()].map((service) => {
    const plans = [...service.plans.values()];
    return { serviceId: service.serviceId, serviceLabel: service.serviceLabel, selectablePlanIds: plans.length, states: stateCounts(plans) };
  }).sort((left, right) => left.serviceLabel.localeCompare(right.serviceLabel, "es-UY"));
}

function pendingQueue(entries) {
  const pendingStates = new Set(["official-trajectory-identified-pending", "research-pending"]);
  const plans = entries.filter(({ state }) => pendingStates.has(state)).map((entry) => ({
    priority: entry.state === "official-trajectory-identified-pending" ? 1 : 2,
    planId: entry.planId,
    state: entry.state,
    serviceIds: entry.catalogPlacements.map(({ serviceId }) => serviceId),
    reason: entry.evidence.reason ?? (entry.state === "official-trajectory-identified-pending"
      ? "Existe una fuente de trayectoria, pero falta reconciliarla exactamente con la proyección."
      : "Falta evidencia suficiente para confirmar trayectoria oficial o ausencia documentada."),
  })).sort((left, right) => left.priority - right.priority || left.serviceIds[0].localeCompare(right.serviceIds[0], "es-UY") || left.planId.localeCompare(right.planId, "es-UY"));
  const byService = serviceCounts(entries).map(({ serviceId, serviceLabel }) => ({
    serviceId,
    serviceLabel,
    identifiedPending: plans.filter((plan) => plan.state === "official-trajectory-identified-pending" && plan.serviceIds.includes(serviceId)).map(({ planId }) => planId),
    researchPending: plans.filter((plan) => plan.state === "research-pending" && plan.serviceIds.includes(serviceId)).map(({ planId }) => planId),
  })).filter((service) => service.identifiedPending.length + service.researchPending.length > 0);
  return { total: plans.length, plans, byService };
}

export async function buildOfficialTrajectoryInventory({ write = true } = {}) {
  const [curatedCatalog, extractedCatalog, report, auditRegistry, reviewRegistry] = await Promise.all([
    readJson(curatedCatalogPath),
    readJson(extractedCatalogPath),
    readJson(extractedReportPath),
    readJson(auditsPath),
    readJson(reviewsPath),
  ]);
  const placements = catalogPlacements(curatedCatalog, extractedCatalog);
  const placementsByPlanId = Map.groupBy(placements, ({ planId }) => planId);
  const reportByPlanId = new Map(report.plans.map((item) => [item.planId, item]));
  const auditsByIdentity = new Map(auditRegistry.audits.map((audit) => [audit.identity, audit]));
  const reviewsByPlanId = new Map();
  for (const review of reviewRegistry.reviews) {
    if (reviewsByPlanId.has(review.planId)) throw new Error(`Revisión duplicada para ${review.planId}.`);
    if (!placementsByPlanId.has(review.planId)) throw new Error(`Revisión huérfana para ${review.planId}.`);
    reviewsByPlanId.set(review.planId, review);
  }

  const entries = [];
  for (const [planId, planPlacements] of [...placementsByPlanId].sort(([left], [right]) => left.localeCompare(right, "es-UY"))) {
    const review = reviewsByPlanId.get(planId);
    const reportItem = reportByPlanId.get(planId);
    const audit = reportItem ? auditsByIdentity.get(reportItem.identity) : null;
    let classification;
    if (review) {
      classification = {
        state: review.state,
        reviewedAt: review.reviewedAt ?? null,
        effectiveAt: review.effectiveAt ?? null,
        officialSources: review.sources,
        scope: review.scope,
        currentProjection: { primary: review.projectionMechanism, features: [review.projectionMechanism] },
        evidence: await reviewedEvidence(review),
        conflictNotes: review.conflictNotes ?? [],
      };
    } else if (reportItem && audit) {
      classification = await extractedEntry(planId, reportItem, audit);
    } else {
      classification = {
        state: "research-pending",
        reviewedAt: null,
        effectiveAt: null,
        officialSources: [],
        scope: { territories: [], pathwayIds: [...new Set(planPlacements.map(({ defaultTrajectoryId }) => defaultTrajectoryId))] },
        currentProjection: { primary: "administrative-composition", features: ["administrative-composition"] },
        evidence: { kind: "insufficient-trajectory-evidence", reason: "El catálogo no tiene una auditoría de trayectoria enlazada." },
        conflictNotes: [],
      };
    }
    const entry = {
      planId,
      catalogPlacements: planPlacements.map((placement) => ({
        serviceId: placement.serviceId,
        serviceLabel: placement.serviceLabel,
        careerId: placement.careerId,
        careerLabel: placement.careerLabel,
        planLabel: placement.planLabel,
        defaultTrajectoryId: placement.defaultTrajectoryId,
        defaultCredentialId: placement.defaultCredentialId,
      })),
      ...classification,
    };
    validateInventoryEntry(entry, audit);
    entries.push(entry);
  }

  const selectablePlanIds = [...placementsByPlanId.keys()];
  if (entries.length !== selectablePlanIds.length || new Set(entries.map(({ planId }) => planId)).size !== entries.length) {
    throw new Error("El inventario no cubre exactamente los IDs de plan seleccionables.");
  }
  const core = {
    schemaVersion: 1,
    generatedFrom: {
      curatedCatalogHash: digest(curatedCatalog),
      extractedCatalogHash: digest(extractedCatalog),
      extractedReportHash: report.contentHash,
      officialAuditHash: auditRegistry.contentHash,
      reviewedTrajectoriesHash: digest(reviewRegistry),
    },
    counts: {
      selectablePlanIds: entries.length,
      catalogPlacements: placements.length,
      states: stateCounts(entries),
      pending: entries.filter(({ state }) => state.endsWith("pending")).length,
      byService: serviceCounts(entries),
    },
    pendingQueue: pendingQueue(entries),
    plans: entries,
  };
  const inventory = { ...core, contentHash: digest(core) };
  if (write) await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  return inventory;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const inventory = await buildOfficialTrajectoryInventory();
  console.log(`${inventory.counts.selectablePlanIds} planes inventariados: ${inventory.counts.states["official-trajectory-reproduced"]} reproducidos, ${inventory.counts.states["official-trajectory-identified-pending"]} con fuente pendiente, ${inventory.counts.states["no-official-trajectory-documented"]} sin trayectoria documentada y ${inventory.counts.states["research-pending"]} por investigar.`);
}
