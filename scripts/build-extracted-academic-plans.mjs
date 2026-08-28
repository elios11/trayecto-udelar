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
  const defaultAuditedPathwayId = audit.officialPlan?.trajectories?.[0]?.id
    ?? audit.officialPlan?.documentedSportOptions?.[0]?.id
    ?? "bedelias";
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
      if (!labels.has(key)) labels.set(key, { label: titleCase(compact).replace(/\bCiclo Iv\b/, "Ciclo IV"), pathwayIds: [] });
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
      : entry.pathwayIds[0] ?? defaultAuditedPathwayId,
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

function buildPathways(audit, periods, courseRecords, campuses, officialCurriculum) {
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
  if (Array.isArray(audit?.officialPlan?.trajectories) && audit.officialPlan.trajectories.length > 0) {
    return Object.fromEntries(audit.officialPlan.trajectories.map((trajectory) => {
      const compositionPeriods = officialCurriculum?.pathwayPeriods?.[trajectory.id];
      if (compositionPeriods) {
        const selectedCourseIds = new Set(compositionPeriods.flatMap((period) => period.courseIds));
        const catalogCourseIds = audit.officialPlan.curriculum.includeAllCoursesInPathwayCatalog
          ? officialCurriculum.courses.map((course) => course.id).filter((id) => !selectedCourseIds.has(id))
          : [];
        return [trajectory.id, {
          label: trajectory.label,
          description: trajectory.description ?? `${trajectory.label} es una trayectoria publicada por el servicio universitario.`,
          ...(trajectory.credentialId ? { credentialId: trajectory.credentialId } : {}),
          campusIds: trajectory.campusIds ?? campuses.map((campus) => campus.id),
          periods: compositionPeriods,
          ...(catalogCourseIds.length > 0 ? { catalogCourseIds } : {}),
        }];
      }
      const excludedIds = new Set((trajectory.excludedCourseIds ?? []).map((id) => officialCurriculum?.courseIdBySourceId.get(id) ?? id));
      const includedIds = Array.isArray(trajectory.courseIds)
        ? new Set([...(audit.officialPlan.curriculum.commonCourseIds ?? []), ...trajectory.courseIds]
          .map((id) => officialCurriculum?.courseIdBySourceId.get(id) ?? id))
        : null;
      const trajectoryPeriods = (trajectory.periods ?? periods).map((period) => ({
        label: period.label,
        courseIds: (period.courseIds ?? [])
          .map((id) => officialCurriculum?.courseIdBySourceId.get(id) ?? id)
          .filter((id) => id && !excludedIds.has(id) && (!includedIds || includedIds.has(id))),
      })).filter((period) => period.courseIds.length > 0);
      const catalogCourseIds = includedIds
        ? audit.officialPlan.curriculum.includeAllCoursesInPathwayCatalog
          ? officialCurriculum.courses.map((course) => course.id)
            .filter((id) => !excludedIds.has(id) && !includedIds.has(id))
          : [...new Set((trajectory.periods ?? periods).flatMap((period) => period.courseIds ?? []))]
            .map((id) => officialCurriculum?.courseIdBySourceId.get(id) ?? id)
            .filter((id) => id && !excludedIds.has(id) && !includedIds.has(id))
        : [];
      return [trajectory.id, {
        label: trajectory.label,
        description: trajectory.description ?? `${trajectory.label} es una trayectoria publicada por el servicio universitario.`,
        ...(trajectory.credentialId ? { credentialId: trajectory.credentialId } : {}),
        campusIds: trajectory.campusIds ?? campuses.map((campus) => campus.id),
        periods: trajectoryPeriods,
        ...(catalogCourseIds.length > 0 ? { catalogCourseIds } : {}),
      }];
    }));
  }
  const hasOfficialCourses = audit?.officialPlan?.curriculum?.periods?.some((period) => (period.courses ?? []).length > 0) === true;
  const catalogCourseIds = periods.filter((period) => period.catalog).flatMap((period) => period.courseIds);
  const pathways = {
    bedelias: {
      label: audit?.officialPlan?.curriculum?.pathwayLabel
        ?? (hasOfficialCourses ? "Malla oficial" : audit?.officialPlan?.curriculum ? "Estructura oficial" : "Composición Bedelías"),
      description: audit?.officialPlan?.curriculum?.pathwayDescription
        ?? (audit?.officialPlan?.curriculum
          ? hasOfficialCourses
            ? "Unidades, créditos y períodos publicados por el servicio universitario; no equivale a una trayectoria territorial."
            : "Mínimos y requisitos publicados por el servicio universitario; la composición por unidades curriculares sigue pendiente."
          : "Agrupación publicada por Bedelías; no equivale a una trayectoria sugerida auditada."),
      campusIds: campuses.map((campus) => campus.id),
      periods: periods.filter((period) => !period.catalog),
      ...(catalogCourseIds.length > 0 ? { catalogCourseIds } : {}),
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
  if (audit?.officialPlan?.pathwayLabel) return audit.officialPlan.pathwayLabel;
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
      const hours = Number(rawCourse.hours);
      const nodeId = rawCourse.requirementId ?? "plan-total";
      const courseSourceUrl = rawCourse.sourceUrl ?? period.sourceUrl ?? sourceUrl;
      courses.push({
        id,
        name: rawCourse.name,
        credits: Number.isFinite(credits) && credits >= 0 ? credits : 0,
        ...(Number.isFinite(hours) && hours > 0 ? { hours } : {}),
        eligibleRequirementIds: [nodeId],
        creditAllocations: [{ nodeId, credits, status: "official", sourceUrl: courseSourceUrl }],
        dataStatus: "official-curriculum",
        ruleCoverage: "not-published",
        curricularBlock: rawCourse.curricularBlock === true,
      });
      if (rawCourse.id) courseIdBySourceId.set(rawCourse.id, id);
      courseIds.push(id);
    }
    periods.push({ label: period.label, courseIds, ...(period.catalog === true ? { catalog: true } : {}) });
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
      sourceUrl: requirement.sourceUrl ?? sourceUrl,
    });
  }

  const requiredCourseGroups = (curriculum.requiredCourseGroups ?? []).map((group) => ({
    id: group.id,
    label: group.label,
    minCompleted: Number(group.minCompleted),
    courseIds: group.courseIds.map((id) => courseIdBySourceId.get(id)).filter(Boolean),
    sourceUrl: group.sourceUrl ?? sourceUrl,
  }));

  const requirementCourseGroups = Object.fromEntries((curriculum.creditGroups ?? []).map((group) => [
    group.id,
    group.courseIds.map((id) => courseIdBySourceId.get(id)).filter(Boolean),
  ]));

  const credentials = (curriculum.credentials ?? []).map((credential) => ({
    id: credential.id,
    title: credential.title,
    minTotalCredits: Number(credential.minTotalCredits),
    nodeRequirements: (credential.nodeRequirements ?? []).map((requirement) => ({
      nodeId: requirement.nodeId,
      minCredits: Number(requirement.minCredits),
    })),
    requiredCourseGroups: (credential.requiredCourseGroupIds ?? [])
      .map((id) => requiredCourseGroups.find((group) => group.id === id))
      .filter(Boolean),
    requiredActivities: [],
    sourceUrl: credential.sourceUrl ?? sourceUrl,
  }));

  return { courses, periods, nodes, requiredCourseGroups, requirementCourseGroups, credentials, sourceUrl, courseIdBySourceId };
}

function compositionGroupLabel(value) {
  return String(value ?? "")
    .replace(/\s+-\s+min:\s*\d+\s+U\.C\.B\s*$/i, "")
    .replace(/^[^-]+\s+-\s+/, "")
    .trim();
}

function compositionCreditGroupLabel(value) {
  return String(value ?? "")
    .replace(/\s+-\s+min:\s*\d+\s+(?:U\.C\.B|cr[eé]ditos?)\s*$/i, "")
    .replace(/^[^-]+\s+-\s+/, "")
    .trim();
}

function compositionMatter(value) {
  const label = String(value ?? "").trim();
  const serviceMatch = label.match(/^([^-]+?)\s+-\s+([^-]+?)\s+-\s+(.+)$/);
  if (serviceMatch) return { code: `${serviceMatch[1].trim()}-${serviceMatch[2].trim()}`, name: serviceMatch[3].trim() };
  const localMatch = label.match(/^([^-]+?)\s+-\s+(.+)$/);
  return localMatch
    ? { code: localMatch[1].trim(), name: localMatch[2].trim() }
    : { code: null, name: label };
}

function compositionMatterFromNode(node) {
  const course = node?.course;
  if (!course?.code || !course?.name) {
    return compositionMatter(String(node?.label ?? "")
      .replace(/\s+-\s+cr[eé]ditos?:\s*\d+(?:[.,]\d+)?(?:\s+programa)?\s*$/i, ""));
  }

  const rawCode = String(course.code).trim();
  const rawName = String(course.name).trim();
  if (course.serviceCode) {
    return { code: `${course.serviceCode}-${rawCode}`, name: rawName };
  }

  const externalCourse = rawName.match(/^([A-Z0-9]+)\s+-\s+(.+)$/i);
  if (/^[A-Z]{2,}$/i.test(rawCode) && externalCourse) {
    return { code: `${rawCode}-${externalCourse[1]}`, name: externalCourse[2] };
  }
  return { code: rawCode, name: rawName };
}

function buildBedeliasCompositionCurriculum(audit, snapshot, serviceCode, usedIds) {
  const curriculum = audit?.officialPlan?.curriculum;
  if (curriculum?.useBedeliasCompositionTree !== true) return null;

  const sourceUrl = curriculum.sourceUrl ?? snapshot.plan?.sourceUrl ?? audit.sources?.[0]?.url;
  const matterNodes = [];
  const groupNodes = [];
  const visit = (node) => {
    if (node?.nodeType === "Materia") matterNodes.push(node);
    if (node?.nodeType === "Grupo") groupNodes.push(node);
    for (const child of node?.children ?? []) visit(child);
  };
  visit(snapshot.plan?.composition);
  if (matterNodes.length === 0) return null;

  const courses = [];
  const periodsByLabel = new Map();
  const commonPeriodsByLabel = new Map();
  const profilePeriodsById = new Map();
  const courseIdByNode = new Map();
  const courseIdBySourceId = new Map();
  const useProfileComposition = curriculum.usePublishedCredits === true
    || (audit?.officialPlan?.trajectories ?? []).length > 0;
  const pathRequirementMap = curriculum.pathRequirementMap ?? {};
  const pathwayGroupMap = curriculum.pathwayGroupMap ?? {};
  const periodLabelMap = curriculum.periodLabelMap ?? {};
  const courseOverrides = curriculum.courseOverrides ?? {};
  const additionalRequirementIdsForAllCourses = curriculum.additionalRequirementIdsForAllCourses ?? [];
  const excludedSourceCourseIds = new Set(curriculum.excludedSourceCourseIds ?? []);
  const sharedProfileCourses = new Map();
  const requirementIdForPath = (nodePath) => {
    for (const segment of [...(nodePath ?? [])].reverse()) {
      const code = String(segment).match(/^([A-Z0-9.]+(?:-[A-Z0-9.]+)*)\s+-\s+/i)?.[1];
      const name = normalize(compositionCreditGroupLabel(segment));
      if (code && pathRequirementMap[code]) return pathRequirementMap[code];
      if (pathRequirementMap[name]) return pathRequirementMap[name];
    }
    return "plan-total";
  };
  const addToPeriod = (periodMap, label, id) => {
    if (!periodMap.has(label)) periodMap.set(label, []);
    if (!periodMap.get(label).includes(id)) periodMap.get(label).push(id);
  };
  for (const [index, node] of matterNodes.entries()) {
    const legacyParsed = compositionMatter(useProfileComposition
      ? String(node.label).replace(/\s+-\s+cr[eé]ditos?:\s*\d+(?:[.,]\d+)?\s*$/i, "")
      : node.label);
    const parsed = compositionMatterFromNode(node);
    if ((parsed.code && excludedSourceCourseIds.has(parsed.code))
      || (legacyParsed.code && excludedSourceCourseIds.has(legacyParsed.code))) continue;
    const courseOverride = courseOverrides[parsed.code]
      ?? courseOverrides[legacyParsed.code]
      ?? courseOverrides[normalize(parsed.name)]
      ?? courseOverrides[normalize(legacyParsed.name)]
      ?? {};
    const sourceCourseId = courseOverride.sourceId ?? parsed.code;
    const profileIndex = (node.path ?? []).findIndex((segment) => normalize(segment) === "perfiles");
    const configuredPathwayId = [...(node.path ?? [])].reverse().map((segment) => (
      String(segment).match(/^([A-Z0-9.]+(?:-[A-Z0-9.]+)*)\s+-\s+/i)?.[1]
    )).find((code) => code && pathwayGroupMap[code]);
    const profileId = configuredPathwayId
      ? pathwayGroupMap[configuredPathwayId]
      : profileIndex >= 0 ? slug(node.path[profileIndex + 1]) : null;
    const groupIndex = (node.path ?? []).findIndex((segment) => normalize(segment) === "grupos");
    const rawPeriod = useProfileComposition
      ? [...(node.path ?? [])].reverse().find((segment) => /min:\s*\d+\s+cr[eé]ditos?/i.test(segment))
      : groupIndex >= 0 ? node.path[groupIndex + 1] : null;
    const rawPeriodCode = String(rawPeriod ?? "").match(/^([A-Z0-9.]+(?:-[A-Z0-9.]+)*)\s+-\s+/i)?.[1];
    const period = courseOverride.periodLabel
      ?? periodLabelMap[rawPeriodCode]
      ?? periodLabelMap[normalize(compositionCreditGroupLabel(rawPeriod))]
      ?? ((useProfileComposition ? compositionCreditGroupLabel(rawPeriod) : compositionGroupLabel(rawPeriod))
        || "Composición del plan");
    const nodeId = courseOverride.requirementId ?? requirementIdForPath(node.path);
    const publishedCredits = Number(node.course?.credits) || 0;
    const credits = Number.isFinite(Number(courseOverride.credits))
      ? Number(courseOverride.credits)
      : curriculum.usePublishedCredits === true ? publishedCredits : 0;
    const titleCasedName = titleCase((courseOverride.name ?? parsed.name) || `Unidad ${index + 1}`);
    const displayName = useProfileComposition
      ? titleCasedName.replace(/\b(?:Iii|Ii|Iv|Viii|Vii|Vi|Ix|Xi|Xii)\b/g, (roman) => roman.toLocaleUpperCase("es-UY"))
      : titleCasedName;
    const sharedKey = curriculum.deduplicateSharedProfileCourses === true
      ? `${sourceCourseId ? `code:${normalize(sourceCourseId)}:` : ""}name:${normalize(courseOverride.name ?? parsed.name)}:credits:${credits}`
      : null;
    let course = sharedKey ? sharedProfileCourses.get(sharedKey) : null;
    if (!course) {
      const id = courseId(serviceCode, { code: sourceCourseId, name: courseOverride.name ?? parsed.name }, index, usedIds);
      const eligibleRequirementIds = [...new Set([nodeId, ...additionalRequirementIdsForAllCourses])];
      course = {
        id,
        ...(sourceCourseId ? { bedeliasCode: sourceCourseId } : {}),
        name: displayName,
        credits,
        eligibleRequirementIds,
        creditAllocations: eligibleRequirementIds.map((eligibleNodeId) => ({ nodeId: eligibleNodeId, credits, status: "official", sourceUrl })),
        dataStatus: Object.keys(courseOverride).length > 0
          ? "official-curriculum"
          : curriculum.usePublishedCredits === true ? "bedelias-composition" : "bedelias-composition-creditless",
        ruleCoverage: "not-scraped",
      };
      courses.push(course);
      if (sharedKey) sharedProfileCourses.set(sharedKey, course);
    } else {
      if (!course.eligibleRequirementIds.includes(nodeId)) course.eligibleRequirementIds.push(nodeId);
      if (!course.creditAllocations.some((allocation) => allocation.nodeId === nodeId)) {
        course.creditAllocations.push({ nodeId, credits, status: "official", sourceUrl });
      }
      for (const eligibleNodeId of additionalRequirementIdsForAllCourses) {
        if (!course.eligibleRequirementIds.includes(eligibleNodeId)) course.eligibleRequirementIds.push(eligibleNodeId);
        if (!course.creditAllocations.some((allocation) => allocation.nodeId === eligibleNodeId)) {
          course.creditAllocations.push({ nodeId: eligibleNodeId, credits, status: "official", sourceUrl });
        }
      }
    }
    const id = course.id;
    addToPeriod(periodsByLabel, period, id);
    if (profileId) {
      if (!profilePeriodsById.has(profileId)) profilePeriodsById.set(profileId, new Map());
      addToPeriod(profilePeriodsById.get(profileId), period, id);
    } else {
      addToPeriod(commonPeriodsByLabel, period, id);
    }
    courseIdByNode.set(node, id);
    if (sourceCourseId && !courseIdBySourceId.has(sourceCourseId)) courseIdBySourceId.set(sourceCourseId, id);
    if (legacyParsed.code && !courseIdBySourceId.has(legacyParsed.code)) courseIdBySourceId.set(legacyParsed.code, id);
  }

  for (const [index, rawCourse] of (curriculum.additionalCourses ?? []).entries()) {
    const id = courseId(serviceCode, rawCourse, matterNodes.length + index, usedIds);
    const nodeId = rawCourse.requirementId ?? "plan-total";
    courses.push({
      id,
      name: rawCourse.name,
      credits: Number(rawCourse.credits) || 0,
      eligibleRequirementIds: [nodeId],
      creditAllocations: [{ nodeId, credits: Number(rawCourse.credits) || 0, status: "official", sourceUrl: rawCourse.sourceUrl ?? sourceUrl }],
      dataStatus: "official-curriculum",
      ruleCoverage: "not-published",
      curricularBlock: rawCourse.curricularBlock === true,
    });
    if (rawCourse.id) courseIdBySourceId.set(rawCourse.id, id);
    const period = rawCourse.periodLabel ?? "Estructura oficial";
    addToPeriod(periodsByLabel, period, id);
    if ((rawCourse.pathwayIds ?? []).length > 0) {
      for (const profileId of rawCourse.pathwayIds) {
        if (!profilePeriodsById.has(profileId)) profilePeriodsById.set(profileId, new Map());
        addToPeriod(profilePeriodsById.get(profileId), period, id);
      }
    } else {
      addToPeriod(commonPeriodsByLabel, period, id);
    }
  }

  const descendantCourseIds = (node) => {
    const ids = [];
    const descend = (candidate) => {
      const id = courseIdByNode.get(candidate);
      if (id) ids.push(id);
      for (const child of candidate?.children ?? []) descend(child);
    };
    descend(node);
    return [...new Set(ids)];
  };
  const requiredCourseGroups = groupNodes.flatMap((group, index) => {
    const match = String(group.label ?? "").match(/min:\s*(\d+)\s+U\.C\.B/i);
    const minimum = Number(match?.[1]);
    const courseIds = descendantCourseIds(group);
    if (!Number.isFinite(minimum) || minimum <= 0 || courseIds.length === 0) return [];
    return [{
      id: `bedelias-ucb-${index + 1}`,
      label: compositionGroupLabel(group.label),
      minCompleted: Math.min(minimum, courseIds.length),
      courseIds,
      sourceUrl,
    }];
  });
  for (const configuredGroup of curriculum.requiredCourseGroups ?? []) {
    const courseIds = (configuredGroup.sourceCourseIds ?? [])
      .map((sourceId) => courseIdBySourceId.get(sourceId))
      .filter(Boolean);
    if (courseIds.length === 0) continue;
    requiredCourseGroups.push({
      id: configuredGroup.id,
      label: configuredGroup.label,
      minCompleted: Math.min(Number(configuredGroup.minCompleted) || courseIds.length, courseIds.length),
      courseIds,
      sourceUrl: configuredGroup.sourceUrl ?? sourceUrl,
    });
  }

  if (curriculum.manualCompletionValidation) {
    const manualCourse = {
      id: courseId(serviceCode, { id: "validacion-final-plan" }, courses.length, usedIds),
      name: curriculum.manualCompletionValidation,
      credits: 0,
      eligibleRequirementIds: ["plan-total"],
      creditAllocations: [{ nodeId: "plan-total", credits: 0, status: "official", sourceUrl }],
      dataStatus: "manual-validation",
      ruleCoverage: "not-published",
      curricularBlock: true,
    };
    courses.push(manualCourse);
    periodsByLabel.set("Validación de egreso", [manualCourse.id]);
    requiredCourseGroups.push({
      id: "validacion-final-plan",
      label: curriculum.manualCompletionValidation,
      minCompleted: 1,
      courseIds: [manualCourse.id],
      sourceUrl,
    });
  }

  const minimumCredits = Number(audit.officialPlan?.minimumCredits) || 0;
  const nodes = [{ id: "plan-total", parentId: null, kind: "group", name: "Total del plan", shortName: "Total", minCredits: minimumCredits, sourceStatus: "official", sourceUrl }];
  for (const requirement of curriculum.creditRequirements ?? []) {
    nodes.push({
      id: requirement.id,
      parentId: requirement.parentId ?? "plan-total",
      kind: requirement.kind ?? "module",
      name: requirement.name,
      shortName: requirement.shortName,
      minCredits: Number(requirement.minCredits),
      sourceStatus: "official",
      sourceUrl: requirement.sourceUrl ?? sourceUrl,
    });
  }
  const configuredCredentials = (curriculum.credentials ?? []).map((credential) => ({
    id: credential.id,
    title: credential.title,
    minTotalCredits: Number(credential.minTotalCredits),
    nodeRequirements: (credential.nodeRequirements ?? []).map((requirement) => ({
      nodeId: requirement.nodeId,
      minCredits: Number(requirement.minCredits),
    })),
    requiredCourseGroups: (credential.requiredCourseGroupIds ?? [])
      .map((id) => requiredCourseGroups.find((group) => group.id === id))
      .filter(Boolean),
    requiredActivities: [],
    sourceUrl: credential.sourceUrl ?? sourceUrl,
  }));
  const credentials = configuredCredentials.length > 0 ? configuredCredentials : [{
    id: "bedelias-degree",
    title: titleCase(audit.officialPlan?.title ?? snapshot.plan?.titleLabels?.[0] ?? audit.career),
    minTotalCredits: minimumCredits,
    nodeRequirements: (curriculum.creditRequirements ?? [])
      .filter((requirement) => requirement.credentialRequired !== false)
      .map((requirement) => ({ nodeId: requirement.id, minCredits: Number(requirement.minCredits) })),
    requiredCourseGroups,
    requiredActivities: [],
    sourceUrl,
  }];
  const periodOrder = curriculum.periodOrder ?? [];
  const orderedPeriods = (periodMap) => [...periodMap]
    .map(([label, courseIds]) => ({ label, courseIds }))
    .sort((left, right) => {
      const leftIndex = periodOrder.indexOf(left.label);
      const rightIndex = periodOrder.indexOf(right.label);
      if (leftIndex < 0 && rightIndex < 0) return 0;
      if (leftIndex < 0) return 1;
      if (rightIndex < 0) return -1;
      return leftIndex - rightIndex;
    });
  const commonPeriods = orderedPeriods(commonPeriodsByLabel);
  const pathwayPeriods = Object.fromEntries([...profilePeriodsById].map(([profileId, profilePeriods]) => [
    profileId,
    [...commonPeriods, ...orderedPeriods(profilePeriods)],
  ]));
  return {
    courses,
    periods: orderedPeriods(periodsByLabel),
    pathwayPeriods,
    nodes,
    requiredCourseGroups,
    requirementCourseGroups: {},
    credentials,
    sourceUrl,
    courseIdBySourceId,
  };
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
    groupApprovalRequirement: null,
    ...overrides,
  };
}

function buildOfficialPrerequisiteRules(audit, officialCurriculum, serviceCode) {
  const prerequisites = audit?.officialPlan?.curriculum?.prerequisites ?? [];
  if (!officialCurriculum || prerequisites.length === 0) return [];
  const courseById = new Map(officialCurriculum.courses.map((course) => [course.id, course]));
  const sourceUrl = audit.officialPlan.curriculum.prerequisitesSourceUrl ?? officialCurriculum.sourceUrl;
  return prerequisites.flatMap((prerequisite) => {
    const targetSourceIds = prerequisite.targetIds ?? [prerequisite.targetId];
    return targetSourceIds.flatMap((targetSourceId) => {
      const targetId = officialCurriculum.courseIdBySourceId.get(targetSourceId);
      const target = courseById.get(targetId);
      if (!target) return [];
      const children = [
        ...((prerequisite.courseIds ?? []).map((sourceId) => ({ sourceId, assessment: "course", evidence: "Curso aprobado" }))),
        ...((prerequisite.examIds ?? []).map((sourceId) => ({ sourceId, assessment: "exam", evidence: "Evaluación final/examen aprobado" }))),
      ].flatMap(({ sourceId, assessment, evidence }) => {
        const courseId = officialCurriculum.courseIdBySourceId.get(sourceId);
        const course = courseById.get(courseId);
        if (!course) return [];
        const label = `${evidence} de ${course.name}`;
        return [emptyRequirementExpression({
          label,
          minimum: 1,
          options: [{ assessment, serviceCode, code: course.id, name: course.name, raw: label }],
        })];
      });
      if (Number(prerequisite.minCredits) > 0) {
        const minimum = Number(prerequisite.minCredits);
        children.push(prerequisite.minCreditsGroupId
          ? emptyRequirementExpression({
            label: `${minimum} créditos en ${prerequisite.minCreditsGroupName ?? prerequisite.minCreditsGroupId}`,
            groupCreditRequirement: {
              minimum,
              groupCode: prerequisite.minCreditsGroupId,
              groupName: prerequisite.minCreditsGroupName ?? prerequisite.minCreditsGroupId,
            },
          })
          : emptyRequirementExpression({
            label: `${minimum} créditos obtenidos`,
            creditRequirement: { minimum, planYear: String(audit.planYear), planName: audit.career },
          }));
      }
      if (Number(prerequisite.minApprovals) > 0 && prerequisite.minApprovalsGroupId) {
        const minimum = Number(prerequisite.minApprovals);
        children.push(emptyRequirementExpression({
          label: `${minimum} unidades aprobadas en ${prerequisite.minApprovalsGroupName ?? prerequisite.minApprovalsGroupId}`,
          groupApprovalRequirement: {
            minimum,
            groupCode: prerequisite.minApprovalsGroupId,
            groupName: prerequisite.minApprovalsGroupName ?? prerequisite.minApprovalsGroupId,
          },
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
          groupApprovalRequirement: null,
        },
        heading: `Condiciones oficiales para cursar ${target.name}`,
        sourceUrl,
      }];
    });
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

  const officialCurriculum = buildBedeliasCompositionCurriculum(audit, snapshot, snapshot.service.code, usedIds)
    ?? buildOfficialCurriculum(audit, snapshot.service.code, usedIds);
  const replaceBedeliasCourses = audit?.officialPlan?.curriculum?.replaceBedeliasCourses === true;
  if (officialCurriculum && (
    courses.length === 0
    || audit?.officialPlan?.curriculum?.useBedeliasCompositionTree === true
    || replaceBedeliasCourses
  )) {
    courses = officialCurriculum.courses;
    if (replaceBedeliasCourses) codeToId.clear();
    for (const course of courses) {
      if (course.bedeliasCode && !codeToId.has(course.bedeliasCode)) codeToId.set(course.bedeliasCode, course.id);
    }
  }

  const publishedCodes = new Set();
  const noPublishedCodes = new Set();
  const rules = [];
  for (const rule of replaceBedeliasCourses ? [] : (snapshot.prerequisites ?? [])) {
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
  const pathways = buildPathways(audit, periods, courseRecords, campuses, officialCurriculum);
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
        year: String(audit?.officialPlan?.planYear ?? entry.plan.year),
        current: audit?.officialPlan?.current ?? entry.plan.current !== false,
        degreeTitle: titleCase(audit?.officialPlan?.title ?? snapshot.plan?.titleLabels?.[0] ?? entry.career.name),
        minCredits: safeMinCredits,
        publishedMinCredits: Number.isFinite(publishedMinCredits) && publishedMinCredits > 0 ? publishedMinCredits : null,
        durationMonths: Number(audit?.officialPlan?.durationMonths) || Number.parseInt(snapshot.plan?.metadata?.duration, 10) || null,
        ...(Number(audit?.officialPlan?.totalHours) > 0 ? { totalHours: Number(audit.officialPlan.totalHours) } : {}),
        campuses,
        sharedWith: [...new Set([
          ...(audit?.officialPlan?.sharedWith ?? []),
          ...(entry.sourceOffers ?? []).map((offer) => offer.serviceName)
            .filter((name) => Boolean(name) && name !== entry.canonicalSource.serviceName),
        ])],
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
        credentials: officialCurriculum?.credentials.length
          ? officialCurriculum.credentials
          : [{ id: "bedelias-degree", title: titleCase(audit?.officialPlan?.title ?? snapshot.plan?.titleLabels?.[0] ?? entry.career.name), minTotalCredits: safeMinCredits, nodeRequirements: officialCurriculum ? (audit.officialPlan.curriculum.creditRequirements ?? []).filter((requirement) => requirement.credentialRequired !== false).map((requirement) => ({ nodeId: requirement.id, minCredits: Number(requirement.minCredits) })) : [{ nodeId: "plan-total", minCredits: safeMinCredits }], requiredCourseGroups: officialCurriculum?.requiredCourseGroups ?? [], requiredActivities: [], sourceUrl: planDocument }],
      },
      courses,
      pathways,
      campuses,
      rules,
      requirementGroupMap: {},
      ...(officialCurriculum && Object.keys(officialCurriculum.requirementCourseGroups).length > 0
        ? { requirementCourseGroups: officialCurriculum.requirementCourseGroups }
        : {}),
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
  for (const { entry, planId, projection, audit } of projections) {
    const facultyCode = audit?.officialPlan?.facultyCode ?? entry.canonicalSource.serviceCode;
    const facultyName = audit?.officialPlan?.facultyName ?? entry.canonicalSource.serviceName;
    const facultyId = `bedelias-${facultyCode.toLocaleLowerCase()}`;
    if (!facultyMap.has(facultyId)) facultyMap.set(facultyId, { id: facultyId, label: readableFacultyName(facultyName), careers: new Map() });
    const faculty = facultyMap.get(facultyId);
    const careerName = audit?.officialPlan?.careerName ?? entry.career.name;
    const planYear = audit?.officialPlan?.planYear ?? entry.plan.year;
    const careerId = `${facultyId}-${slug(careerName)}`;
    if (!faculty.careers.has(careerId)) faculty.careers.set(careerId, { id: careerId, label: titleCase(careerName), plans: [] });
    faculty.careers.get(careerId).plans.push({
      id: planId,
      label: `Plan ${planYear}${projection.plan.current === false ? " · histórico" : " · vigente"}${projection.plan.compositionAvailable ? "" : " · sin composición"}`,
      defaultTrajectoryId: Object.keys(projection.pathways)[0],
      defaultCredentialId: projection.pathways[Object.keys(projection.pathways)[0]]?.credentialId
        ?? projection.creditStructure.credentials.find((credential) => credential.id === "bedelias-degree")?.id
        ?? projection.creditStructure.credentials.at(-1)?.id
        ?? "bedelias-degree",
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
