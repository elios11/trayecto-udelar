#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventoryDirectory = path.join(projectRoot, "data", "bedelias", "inventory");
const snapshotDirectory = path.join(projectRoot, "data", "bedelias");
const outputDirectory = path.join(projectRoot, "app", "data", "bedelias-generated");
const catalogPath = path.join(projectRoot, "app", "data", "extracted-academic-catalog.json");
const loadersPath = path.join(projectRoot, "app", "data", "extracted-academic-loaders.ts");
const reportPath = path.join(inventoryDirectory, "ui-extracted-plans.json");

export function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-UY").replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value) {
  return normalize(value).replace(/\s+/g, "-") || "sin-nombre";
}

function hash(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function titleCase(value) {
  const keepLower = new Set(["a", "al", "de", "del", "en", "la", "las", "los", "y"]);
  return String(value ?? "").toLocaleLowerCase("es-UY").replace(/(^|\s)(\S+)/g, (_match, space, word, offset) => {
    if (offset > 0 && keepLower.has(word)) return `${space}${word}`;
    return `${space}${word.charAt(0).toLocaleUpperCase("es-UY")}${word.slice(1)}`;
  });
}

function readableFacultyName(value) {
  return titleCase(value)
    .replace(/^Facultad De /, "Facultad de ")
    .replace(/^Centro Universitario Regional - /, "Cenur ")
    .replace(/^Instituto Superior De /, "Instituto Superior de ");
}

function snapshotKey(snapshot) {
  return `${normalize(snapshot.program?.name)}:${String(snapshot.plan?.year ?? "")}:${snapshot.service?.code ?? ""}`;
}

function canonicalSnapshotPath(audit) {
  if (audit.bedeliasComparison?.canonicalSnapshot) return audit.bedeliasComparison.canonicalSnapshot;
  const preferred = audit.bedeliasComparison?.bestCentralMatchForRegionalOffering;
  return preferred ? audit.bedeliasComparison?.snapshots?.[preferred] : null;
}

function activeFullOfferings(audit) {
  return (audit?.offerings ?? []).filter((offering) => offering.admissionStatus !== "historical-not-current"
    && !/vía regional de ingreso|no oferta completa/i.test(offering.role ?? ""));
}

function offeringPathwayIds(offering) {
  return offering.trajectoryIds ?? offering.sportOptionIds ?? [];
}

function auditCampuses(audit) {
  if (!audit) return [];
  const labels = new Map();
  for (const offering of activeFullOfferings(audit)) {
    for (const location of offering.locations ?? []) {
      const compact = location
        .replace(/^Facultad de Agronomía,\s*/i, "")
        .replace(/^Estación Experimental Mario A\. Cassinoni,\s*/i, "")
        .replace(/^Estación Experimental de Facultad de Agronomía de\s*/i, "")
        .replace(/^Sede\s+/i, "")
        .trim();
      const key = normalize(compact);
      if (!labels.has(key)) labels.set(key, { label: titleCase(compact), pathwayIds: [] });
      const entry = labels.get(key);
      entry.pathwayIds.push(...offeringPathwayIds(offering).filter((id) => !entry.pathwayIds.includes(id)));
    }
  }
  return [...labels].map(([id, entry]) => ({
    id: slug(id),
    label: entry.label,
    official: true,
    defaultPathwayId: audit.identity === "ingeniero agronomo:2020" && id === "salto"
      ? "salto-agricola-ganadera"
      : entry.pathwayIds[0] ?? "bedelias",
  }));
}

function courseId(serviceCode, course, index, usedIds) {
  const base = `${serviceCode.toLocaleLowerCase()}-${slug(course.id || course.code || course.name || `unidad-${index + 1}`)}`;
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) candidate = `${base}-${suffix++}`;
  usedIds.add(candidate);
  return candidate;
}

function periodLabel(course, selectedPath) {
  const pathSegments = selectedPath ?? course.curriculumPaths?.[0] ?? [];
  const groupsIndex = pathSegments.findIndex((segment) => normalize(segment) === "grupos");
  const candidate = groupsIndex >= 0 ? pathSegments[groupsIndex + 1] : pathSegments.at(-2) ?? pathSegments.at(-1);
  return candidate?.replace(/\s+-\s+min:\s*\d+\s+cr[eé]ditos?\s*$/i, "").trim() || "Composición del plan";
}

function periodsForProfile(courseRecords, profileLabel) {
  const periodMap = new Map();
  for (const { id, rawCourse } of courseRecords) {
    const selectedPath = (rawCourse.curriculumPaths ?? []).find((pathSegments) => {
      const profileIndex = pathSegments.findIndex((segment) => normalize(segment) === "perfiles");
      return profileIndex >= 0 && normalize(pathSegments[profileIndex + 1]) === normalize(profileLabel);
    });
    if (!selectedPath) continue;
    const label = periodLabel(rawCourse, selectedPath);
    if (!periodMap.has(label)) periodMap.set(label, []);
    if (!periodMap.get(label).includes(id)) periodMap.get(label).push(id);
  }
  return [...periodMap].map(([label, courseIds]) => ({ label, courseIds }));
}

function campusIdsForPathway(audit, pathwayId) {
  const ids = [];
  for (const offering of activeFullOfferings(audit)) {
    if (!offeringPathwayIds(offering).includes(pathwayId)) continue;
    for (const location of offering.locations ?? []) {
      const compact = location
        .replace(/^Sede\s+/i, "")
        .trim();
      const id = slug(normalize(compact));
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

function buildPathways(audit, periods, courseRecords, campuses) {
  if (audit?.identity === "licenciatura en educacion fisica:2017") {
    return Object.fromEntries(audit.officialPlan.trajectories.map((trajectory) => [trajectory.id, {
      label: trajectory.label,
      description: `${trajectory.label} es una opción certificada del Plan 2017. Su disponibilidad se filtra según la sede elegida.`,
      campusIds: campusIdsForPathway(audit, trajectory.id),
      periods: periodsForProfile(courseRecords, trajectory.label),
    }]));
  }
  if (audit?.identity === "tecnicatura en deportes:2007") {
    return Object.fromEntries(audit.officialPlan.documentedSportOptions.map((option) => [option.id, {
      label: option.label,
      description: `${option.label} es una opción deportiva del Plan 2007 vinculada a las sedes y cohortes documentadas. La selección no implica que exista ingreso abierto en 2026.`,
      campusIds: campusIdsForPathway(audit, option.id),
      periods: periodsForProfile(courseRecords, option.label),
    }]));
  }
  const hasOfficialCourses = audit?.officialPlan?.curriculum?.periods?.some((period) => (period.courses ?? []).length > 0) === true;
  const pathways = {
    bedelias: {
      label: hasOfficialCourses ? "Malla oficial" : audit?.officialPlan?.curriculum ? "Estructura oficial" : "Composición Bedelías",
      description: audit?.officialPlan?.curriculum
        ? hasOfficialCourses
          ? "Unidades, créditos y períodos publicados por el servicio universitario; no equivale a una trayectoria territorial."
          : "Mínimos y requisitos publicados por el servicio universitario; la composición por unidades curriculares sigue pendiente."
        : "Agrupación publicada por Bedelías; no equivale a una trayectoria sugerida auditada.",
      campusIds: campuses.map((campus) => campus.id),
      periods,
    },
  };
  if (audit?.identity === "ingeniero agronomo:2020") {
    pathways["salto-agricola-ganadera"] = {
      label: "Agrícola-ganadera",
      description: "Opción territorial oficialmente publicada para Salto. La selección flexible de unidades todavía requiere curaduría documental.",
      campusIds: ["salto"],
      periods,
    };
  }
  return pathways;
}

function pathwayLabelForAudit(audit) {
  return audit?.identity === "tecnicatura en deportes:2007" ? "Opción" : "Trayectoria";
}

function normalizeExpressionCourseIds(expression, codeToId, localServiceCode) {
  if (!expression) return expression;
  return {
    ...expression,
    options: (expression.options ?? []).map((option) => ({
      ...option,
      code: (!option.serviceCode || option.serviceCode === localServiceCode) ? (codeToId.get(option.code) ?? option.code) : option.code,
    })),
    children: (expression.children ?? []).map((child) => normalizeExpressionCourseIds(child, codeToId, localServiceCode)),
  };
}

function buildOfficialCurriculum(audit, serviceCode, usedIds) {
  const curriculum = audit?.officialPlan?.curriculum;
  const hasPeriods = Array.isArray(curriculum?.periods) && curriculum.periods.length > 0;
  const hasRequirements = Array.isArray(curriculum?.creditRequirements) && curriculum.creditRequirements.length > 0;
  if (!hasPeriods && !hasRequirements) return null;

  const sourceUrl = curriculum.sourceUrl ?? audit.sources?.[0]?.url;
  const courses = [];
  const periods = [];
  const courseIdBySourceId = new Map();
  for (const period of curriculum.periods ?? []) {
    const courseIds = [];
    for (const [index, rawCourse] of (period.courses ?? []).entries()) {
      const id = courseId(serviceCode, rawCourse, courses.length + index, usedIds);
      const credits = Number(rawCourse.credits);
      const nodeId = rawCourse.requirementId ?? "plan-total";
      courses.push({
        id,
        name: rawCourse.name,
        credits: Number.isFinite(credits) && credits >= 0 ? credits : 0,
        eligibleRequirementIds: [nodeId],
        creditAllocations: [{ nodeId, credits, status: "official", sourceUrl }],
        dataStatus: "official-curriculum",
        ruleCoverage: "not-published",
        curricularBlock: rawCourse.curricularBlock === true,
      });
      if (rawCourse.id) courseIdBySourceId.set(rawCourse.id, id);
      courseIds.push(id);
    }
    periods.push({ label: period.label, courseIds });
  }

  const nodes = [{ id: "plan-total", parentId: null, kind: "group", name: "Total del plan", shortName: "Total", minCredits: Number(audit.officialPlan.minimumCredits), sourceStatus: "official", sourceUrl }];
  for (const requirement of curriculum.creditRequirements ?? []) {
    nodes.push({
      id: requirement.id,
      parentId: requirement.parentId ?? "plan-total",
      kind: requirement.kind ?? "module",
      name: requirement.name,
      shortName: requirement.shortName,
      minCredits: Number(requirement.minCredits),
      sourceStatus: "official",
      sourceUrl,
    });
  }

  const requiredCourseGroups = (curriculum.requiredCourseGroups ?? []).map((group) => ({
    id: group.id,
    label: group.label,
    minCompleted: Number(group.minCompleted),
    courseIds: group.courseIds.map((id) => courseIdBySourceId.get(id)).filter(Boolean),
    sourceUrl,
  }));

  return { courses, periods, nodes, requiredCourseGroups, sourceUrl, courseIdBySourceId };
}

function emptyRequirementExpression(overrides = {}) {
  return {
    kind: "requirement",
    label: "",
    minimum: null,
    options: [],
    children: [],
    creditRequirement: null,
    groupCreditRequirement: null,
    ...overrides,
  };
}

function buildOfficialPrerequisiteRules(audit, officialCurriculum, serviceCode) {
  const prerequisites = audit?.officialPlan?.curriculum?.prerequisites ?? [];
  if (!officialCurriculum || prerequisites.length === 0) return [];
  const courseById = new Map(officialCurriculum.courses.map((course) => [course.id, course]));
  const sourceUrl = audit.officialPlan.curriculum.prerequisitesSourceUrl ?? officialCurriculum.sourceUrl;
  return prerequisites.flatMap((prerequisite) => {
    const targetId = officialCurriculum.courseIdBySourceId.get(prerequisite.targetId);
    const target = courseById.get(targetId);
    if (!target) return [];
    const children = (prerequisite.courseIds ?? []).flatMap((sourceId) => {
      const courseId = officialCurriculum.courseIdBySourceId.get(sourceId);
      const course = courseById.get(courseId);
      if (!course) return [];
      const label = `Curso aprobado de ${course.name}`;
      return [emptyRequirementExpression({
        label,
        minimum: 1,
        options: [{ assessment: "course", serviceCode, code: course.id, name: course.name, raw: label }],
      })];
    });
    if (Number(prerequisite.minCredits) > 0) {
      children.push(emptyRequirementExpression({
        label: `${Number(prerequisite.minCredits)} créditos obtenidos`,
        creditRequirement: { minimum: Number(prerequisite.minCredits), planYear: String(audit.planYear), planName: audit.career },
      }));
    }
    if (children.length === 0) return [];
    return [{
      target: { code: target.id, name: target.name, assessment: "course" },
      expression: {
        kind: "all",
        label: "Debe cumplir todas las condiciones",
        minimum: null,
        options: [],
        children,
        creditRequirement: null,
        groupCreditRequirement: null,
      },
      heading: `Condiciones oficiales para cursar ${target.name}`,
      sourceUrl,
    }];
  });
}

function buildProjection(entry, snapshot, audit) {
  const planId = `bedelias-${entry.canonicalSource.serviceCode.toLocaleLowerCase()}-${slug(entry.career.name)}-${entry.plan.year}`;
  const usedIds = new Set();
  let courses = [];
  const courseRecords = [];
  const periodMap = new Map();
  const codeToId = new Map();
  for (const [index, rawCourse] of (snapshot.plan?.courses ?? []).entries()) {
    const id = courseId(snapshot.service.code, rawCourse, index, usedIds);
    const credits = Number(rawCourse.credits);
    const label = periodLabel(rawCourse);
    if (!periodMap.has(label)) periodMap.set(label, []);
    periodMap.get(label).push(id);
    if (rawCourse.code && !codeToId.has(rawCourse.code)) codeToId.set(rawCourse.code, id);
    courses.push({
      id,
      bedeliasCode: rawCourse.code || undefined,
      name: titleCase(rawCourse.name || rawCourse.code || `Unidad ${index + 1}`),
      credits: Number.isFinite(credits) && credits >= 0 ? credits : 0,
      eligibleRequirementIds: ["plan-total"],
      creditAllocations: [{ nodeId: "plan-total", credits: Number.isFinite(credits) && credits >= 0 ? credits : 0, status: "official", sourceUrl: snapshot.plan.sourceUrl }],
      dataStatus: "bedelias-composition",
      ruleCoverage: "not-scraped",
    });
    courseRecords.push({ id, rawCourse });
  }

  const officialCurriculum = buildOfficialCurriculum(audit, snapshot.service.code, usedIds);
  if (officialCurriculum && courses.length === 0) {
    courses = officialCurriculum.courses;
  }

  const publishedCodes = new Set();
  const noPublishedCodes = new Set();
  const rules = [];
  for (const rule of snapshot.prerequisites ?? []) {
    if (rule.expression && ["course", "exam"].includes(rule.target?.assessment) && rule.target?.code) {
      publishedCodes.add(rule.target.code);
      rules.push({ target: { code: rule.target.code, name: rule.target.name, assessment: rule.target.assessment }, expression: normalizeExpressionCourseIds(rule.expression, codeToId, snapshot.service.code), heading: rule.heading, sourceUrl: rule.sourceUrl });
    } else if (rule.noPublishedRule && rule.target?.code) noPublishedCodes.add(rule.target.code);
  }
  for (const rule of buildOfficialPrerequisiteRules(audit, officialCurriculum, snapshot.service.code)) {
    publishedCodes.add(rule.target.code);
    rules.push(rule);
  }
  for (const course of courses) {
    if (!course.bedeliasCode) {
      if (publishedCodes.has(course.id)) course.ruleCoverage = "published";
      continue;
    }
    course.ruleCoverage = publishedCodes.has(course.bedeliasCode) ? "published" : noPublishedCodes.has(course.bedeliasCode) ? "not-published" : "not-scraped";
  }

  const publishedMinCredits = Number(snapshot.plan?.metadata?.minCredits);
  const auditedMinCredits = Number(audit?.officialPlan?.minimumCredits);
  const safeMinCredits = Number.isFinite(auditedMinCredits) && auditedMinCredits > 0
    ? auditedMinCredits
    : Number.isFinite(publishedMinCredits) && publishedMinCredits > 0 ? publishedMinCredits : 0;
  const compositionAvailable = courses.length > 0;
  const periods = officialCurriculum
    ? officialCurriculum.periods
    : compositionAvailable ? [...periodMap].map(([label, courseIds]) => ({ label, courseIds })) : [];
  const campuses = auditCampuses(audit);
  const pathways = buildPathways(audit, periods, courseRecords, campuses);
  const auditStatus = audit ? "official-evidence-complete" : entry.canonicalSource.state === "structurally-valid" ? "structurally-valid" : "extracted";
  const planDocument = audit?.sources?.[0]?.url ?? snapshot.plan?.metadata?.colibriUrl ?? snapshot.plan?.sourceUrl;
  const notice = audit?.uiNotice
    ?? (audit?.identity === "tecnicatura en deportes:2007"
    ? "El Plan 2007 continúa para cohortes existentes, pero no tiene ingreso abierto en Montevideo ni Rocha durante 2026; Paysandú no publica una nueva apertura y Rivera se conserva sólo como antecedente histórico."
    : officialCurriculum?.courses.length
      ? "Malla curricular vigente publicada por el servicio. Las previaturas no se muestran cuando la fuente oficial no las documenta."
    : officialCurriculum
      ? "La estructura de créditos y requisitos fue auditada en fuentes oficiales, pero el servicio no publica su composición por unidades curriculares. No se inventan materias ni trayectorias."
    : compositionAvailable
    ? audit
      ? "La identidad, el plan y sus sedes fueron contrastados con fuentes oficiales. La composición mostrada sigue siendo la extracción de Bedelías y no una trayectoria curricular curada."
      : "Composición extraída de Bedelías. La auditoría oficial de títulos, mínimos, obligatoriedad y trayectoria está pendiente."
    : "Bedelías identifica este plan vigente, pero no publica su composición. No se inventan materias ni una trayectoria provisional.");

  return {
    planId,
    projection: {
      schemaVersion: 1,
      source: {
        reviewedAt: audit?.reviewedAt ?? null,
        planDocument,
        careerPage: audit?.sources?.[1]?.url ?? planDocument,
        bedeliasExtractedAt: snapshot.source?.extractedAt,
        bedeliasContentHash: snapshot.contentHash,
        bedeliasPlanUrl: snapshot.plan?.sourceUrl,
      },
      plan: {
        year: String(entry.plan.year),
        current: entry.plan.current !== false,
        degreeTitle: titleCase(audit?.officialPlan?.title ?? snapshot.plan?.titleLabels?.[0] ?? entry.career.name),
        minCredits: safeMinCredits,
        publishedMinCredits: Number.isFinite(publishedMinCredits) && publishedMinCredits > 0 ? publishedMinCredits : null,
        durationMonths: Number(audit?.officialPlan?.durationMonths) || Number.parseInt(snapshot.plan?.metadata?.duration, 10) || null,
        campuses,
        sharedWith: (entry.sourceOffers ?? []).map((offer) => offer.serviceName).filter((name) => name !== entry.canonicalSource.serviceName),
        auditStatus,
        compositionAvailable,
        notice,
        publishedRules: rules.length,
        partialRules: 0,
        noPublishedRule: noPublishedCodes.size,
      },
      creditStructure: {
        countingMode: "allocated",
        nodes: officialCurriculum?.nodes ?? [{ id: "plan-total", parentId: null, kind: "group", name: "Total del plan", shortName: "Total", minCredits: safeMinCredits, sourceStatus: "official", sourceUrl: snapshot.plan?.sourceUrl }],
        credentials: [{ id: "bedelias-degree", title: titleCase(audit?.officialPlan?.title ?? snapshot.plan?.titleLabels?.[0] ?? entry.career.name), minTotalCredits: safeMinCredits, nodeRequirements: officialCurriculum ? (audit.officialPlan.curriculum.creditRequirements ?? []).filter((requirement) => requirement.credentialRequired !== false).map((requirement) => ({ nodeId: requirement.id, minCredits: Number(requirement.minCredits) })) : [{ nodeId: "plan-total", minCredits: safeMinCredits }], requiredCourseGroups: officialCurriculum?.requiredCourseGroups ?? [], requiredActivities: [], sourceUrl: planDocument }],
      },
      courses,
      pathways,
      campuses,
      rules,
      requirementGroupMap: {},
      audit: { anomalies: snapshot.validation?.issues ?? [], priority: entry.priority ?? "official-evidence-complete", publicationEligible: false },
    },
  };
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function buildExtractedAcademicPlans() {
  const queue = await loadJson(path.join(inventoryDirectory, "audit-queue.json"));
  const auditsRegistry = await loadJson(path.join(snapshotDirectory, "audits", "official-source-audits.json"));
  const global = await loadJson(path.join(inventoryDirectory, "global-current.json"));
  const audits = new Map(auditsRegistry.audits.map((audit) => [audit.identity, audit]));
  const globalPlans = global.services.flatMap((service) => service.plans.map((plan) => ({ ...plan, serviceName: service.name })));
  const globalByIdentity = new Map();
  for (const plan of globalPlans) {
    const identity = `${normalize(plan.career.name)}:${plan.plan.year}`;
    if (!globalByIdentity.has(identity) || plan.state === "structurally-valid") globalByIdentity.set(identity, plan);
  }
  const completedEntries = queue.completedAudits.map((completed) => {
    const audit = audits.get(completed.identity);
    if (audit?.conclusion?.excludeFromCurrentUi) return null;
    const plan = globalByIdentity.get(completed.identity);
    const preferredSnapshot = canonicalSnapshotPath(audit);
    const preferredServiceCode = preferredSnapshot?.split(/[\\/]/).at(-1)?.split("-")[0]?.toLocaleUpperCase() ?? plan.serviceCode;
    return {
      identity: completed.identity,
      career: { name: plan.career.name, type: plan.career.type },
      plan: { ...plan.plan },
      canonicalSource: { serviceCode: preferredServiceCode, serviceName: global.services.find((service) => service.code === preferredServiceCode)?.name ?? plan.serviceName, state: plan.state, planKey: plan.key },
      sourceOffers: audit.offerings?.map((offering) => ({ serviceCode: offering.serviceCode, serviceName: global.services.find((service) => service.code === offering.serviceCode)?.name ?? offering.serviceCode })) ?? [],
      priority: "official-evidence-complete",
      explicitSnapshotPath: preferredSnapshot,
    };
  }).filter(Boolean);
  const entries = [...queue.queue, ...completedEntries].sort((a, b) => a.canonicalSource.serviceName.localeCompare(b.canonicalSource.serviceName, "es") || a.career.name.localeCompare(b.career.name, "es") || String(a.plan.year).localeCompare(String(b.plan.year), "es"));

  const snapshotFiles = (await readdir(snapshotDirectory)).filter((name) => name.endsWith(".json"));
  const snapshots = [];
  for (const file of snapshotFiles) {
    const absolutePath = path.join(snapshotDirectory, file);
    const candidate = await loadJson(absolutePath);
    if (candidate.service?.code && candidate.program?.name && candidate.plan?.year) snapshots.push({ file, absolutePath, snapshot: candidate });
  }
  const snapshotsByKey = new Map(snapshots.map((item) => [snapshotKey(item.snapshot), item]));

  const projections = [];
  for (const entry of entries) {
    const audit = audits.get(entry.identity);
    const explicitPath = entry.explicitSnapshotPath ? path.join(projectRoot, entry.explicitSnapshotPath) : null;
    const item = explicitPath
      ? snapshots.find((candidate) => candidate.absolutePath === explicitPath)
      : snapshotsByKey.get(`${normalize(entry.career.name)}:${entry.plan.year}:${entry.canonicalSource.serviceCode}`);
    if (!item) throw new Error(`No se encontró snapshot canónico para ${entry.identity} (${entry.canonicalSource.serviceCode}).`);
    projections.push({ entry, item, audit, ...buildProjection(entry, item.snapshot, audit) });
  }

  await mkdir(outputDirectory, { recursive: true });
  for (const { planId, projection } of projections) await writeFile(path.join(outputDirectory, `${planId}.json`), `${JSON.stringify(projection)}\n`, "utf8");

  const facultyMap = new Map();
  for (const { entry, planId, projection } of projections) {
    const facultyId = `bedelias-${entry.canonicalSource.serviceCode.toLocaleLowerCase()}`;
    if (!facultyMap.has(facultyId)) facultyMap.set(facultyId, { id: facultyId, label: readableFacultyName(entry.canonicalSource.serviceName), careers: new Map() });
    const faculty = facultyMap.get(facultyId);
    const careerId = `${facultyId}-${slug(entry.career.name)}`;
    if (!faculty.careers.has(careerId)) faculty.careers.set(careerId, { id: careerId, label: titleCase(entry.career.name), plans: [] });
    faculty.careers.get(careerId).plans.push({
      id: planId,
      label: `Plan ${entry.plan.year}${entry.plan.current === false ? " · histórico" : " · vigente"}${projection.plan.compositionAvailable ? "" : " · sin composición"}`,
      defaultTrajectoryId: Object.keys(projection.pathways)[0],
      defaultCredentialId: "bedelias-degree",
    });
  }
  const catalog = [...facultyMap.values()].map((faculty) => ({ ...faculty, careers: [...faculty.careers.values()].map((career) => ({ ...career, plans: career.plans.sort((a, b) => b.label.localeCompare(a.label, "es")) })) }));
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  const loaderLines = projections.map(({ planId, projection, audit }) => `  ${JSON.stringify(planId)}: {\n    load: () => import(${JSON.stringify(`./bedelias-generated/${planId}.json`)}),\n    pathwayIds: ${JSON.stringify(Object.keys(projection.pathways))},\n    pathwayLabel: ${JSON.stringify(pathwayLabelForAudit(audit))},\n    minCredits: ${projection.plan.minCredits},\n  },`);
  await writeFile(loadersPath, `// Archivo generado por scripts/build-extracted-academic-plans.mjs.\nexport const extractedAcademicPlanRegistrations = {\n${loaderLines.join("\n")}\n} as const;\n`, "utf8");

  const reportCore = {
    schemaVersion: 1,
    generatedFrom: { auditQueueHash: queue.contentHash, officialAuditHash: auditsRegistry.contentHash, globalManifestHash: global.contentHash },
    counts: {
      canonicalCurrentIdentities: queue.counts.canonicalIdentities,
      generatedPlans: projections.length,
      compositionAvailable: projections.filter(({ projection }) => projection.plan.compositionAvailable).length,
      compositionUnavailable: projections.filter(({ projection }) => !projection.plan.compositionAvailable).length,
      plansWithOfficialCampuses: projections.filter(({ projection }) => projection.campuses.length > 1).length,
      excludedFromCurrentUi: auditsRegistry.audits.filter((audit) => audit.conclusion?.excludeFromCurrentUi).length,
    },
    plans: projections.map(({ entry, planId, item, projection }) => ({ identity: entry.identity, planId, facultyCode: entry.canonicalSource.serviceCode, snapshotPath: path.relative(projectRoot, item.absolutePath).replaceAll("\\", "/"), auditStatus: projection.plan.auditStatus, compositionAvailable: projection.plan.compositionAvailable, campusIds: projection.campuses.map((campus) => campus.id) })),
  };
  const report = { ...reportCore, contentHash: hash(reportCore) };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const report = await buildExtractedAcademicPlans();
  console.log(`${report.counts.generatedPlans} planes generados: ${report.counts.compositionAvailable} con composición y ${report.counts.compositionUnavailable} sin composición.`);
}
