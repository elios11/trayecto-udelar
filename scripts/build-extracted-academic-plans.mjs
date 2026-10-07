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
const fhceReconciliationsPath = path.join(projectRoot, "data", "fhce", "official-trajectories-2014.json");
const iq2021ReconciliationPath = path.join(projectRoot, "data", "fing", "ingenieria-quimica-2021-trayectorias.json");
const tim2016ReconciliationPath = path.join(projectRoot, "data", "fing", "tecnologo-industrial-mecanico-2016-trayectorias.json");
const telecom2009ReconciliationPath = path.join(projectRoot, "data", "fing", "tecnologo-telecomunicaciones-2009-trayectorias.json");
const naval1997ReconciliationPath = path.join(projectRoot, "data", "fing", "ingenieria-naval-1997-trayectorias.json");
const industrialMecanica1997ReconciliationPath = path.join(projectRoot, "data", "fing", "ingenieria-industrial-mecanica-1997-trayectorias.json");
const produccion2010ReconciliationPath = path.join(projectRoot, "data", "fing", "ingenieria-produccion-2010-trayectorias.json");
const sistemasComunicacion2018ReconciliationPath = path.join(projectRoot, "data", "fing", "ingenieria-sistemas-comunicacion-2018-trayectorias.json");
const fceaEconomia2012Path = path.join(projectRoot, "data", "fcea", "economia-2012-trayectoria.json");
const fceaEstadistica2014Path = path.join(projectRoot, "data", "fcea", "estadistica-2014-trayectorias.json");
const fceaEconomiaAgricola2022Path = path.join(projectRoot, "data", "fcea", "economia-agricola-2022-trayectorias.json");
const cenurlnBiologiaBioquimica2016Path = path.join(projectRoot, "data", "cenurln", "ciclo-biologia-bioquimica-2016.json");
const cenurlnCicloInicialMatematica2012Path = path.join(projectRoot, "data", "cenurln", "ciclo-inicial-matematica-2012.json");

export function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-UY").replace(/[^a-z0-9]+/g, " ").trim();
}

export function isAdministrativeCreditEntry(value) {
  return normalize(value).startsWith("creditos reconocidos");
}

const COURSE_AUTHORITY_STATUSES = ["verified", "candidate", "historical-equivalent", "administrative", "rejected"];

function courseFieldProvenance(status, officialIdentity = false, officialCredits = false) {
  return {
    inclusion: status === "verified" ? "official-curriculum" : "bedelias-composition",
    name: officialIdentity ? "official-curriculum" : "bedelias-composition",
    credits: officialCredits ? "official-curriculum" : "bedelias-composition",
  };
}

function withCourseAuthority(course, status, options = {}) {
  return {
    ...course,
    authorityStatus: status,
    fieldProvenance: {
      ...courseFieldProvenance(status, options.officialIdentity, options.officialCredits),
      ...(options.creditsProvenance ? { credits: options.creditsProvenance } : {}),
    },
  };
}

function exactOfficialCourseSourceIds(audit) {
  const curriculum = audit?.officialPlan?.curriculum ?? {};
  return new Set([
    ...(curriculum.verifiedCourseIds ?? []),
    ...(curriculum.commonCourseIds ?? []),
    ...(curriculum.courseGroups ?? []).flatMap((group) => (group.courses ?? []).map(({ id }) => id)),
    ...(curriculum.requiredCourseGroups ?? []).flatMap((group) => (
      group.verifiedSourceCourseIds
      ?? (curriculum.strictOfficialCourseIds === true ? [] : group.sourceCourseIds ?? [])
    )),
    ...(audit?.officialPlan?.trajectories ?? []).flatMap((trajectory) => [
      ...(trajectory.courseIds ?? []),
      ...(trajectory.catalogSourceCourseIds ?? []),
      ...(trajectory.periods ?? []).flatMap((period) => period.courseIds ?? []),
    ]),
    ...(audit?.officialPlan?.documentedSportOptions ?? []).flatMap((option) => option.courseIds ?? []),
  ].map(String));
}

const COURSE_NAME_CONNECTORS = new Set(["a", "al", "de", "del", "el", "en", "la", "las", "los", "para", "y"]);

export function normalizeEquivalentCourseName(value) {
  return normalize(String(value ?? "").replace(/\([^)]*\)/g, " "))
    .replace(/\bcorrec\b/g, "correccion")
    .split(" ")
    .filter((token) => token && !COURSE_NAME_CONNECTORS.has(token))
    .join(" ");
}

function variantCourseSignature(course) {
  const allocations = (course.creditAllocations ?? [])
    .map(({ nodeId, credits }) => `${nodeId}:${Number(credits) || 0}`)
    .sort()
    .join("|");
  return [normalizeEquivalentCourseName(course.name), Number(course.credits) || 0, Number(course.hours) || 0, allocations].join("::");
}

function preferredVariantCourse(courses) {
  return [...courses].sort((left, right) => {
    const leftCode = String(left.bedeliasCode ?? left.id);
    const rightCode = String(right.bedeliasCode ?? right.id);
    return leftCode.length - rightCode.length || leftCode.localeCompare(rightCode, "es-UY");
  })[0];
}

export function consolidateEquivalentCourseVariants(curriculum) {
  if (!curriculum) return new Map();
  const courseById = new Map(curriculum.courses.map((course) => [course.id, course]));
  const aliases = new Map();

  for (const group of curriculum.requiredCourseGroups ?? []) {
    if (group.minCompleted !== 1) continue;
    const officialGroupName = normalizeEquivalentCourseName(group.label);
    if (!officialGroupName) continue;
    const buckets = new Map();
    for (const courseId of group.courseIds) {
      const course = courseById.get(courseId);
      if (!course) continue;
      if (normalizeEquivalentCourseName(course.name) !== officialGroupName) continue;
      const signature = variantCourseSignature(course);
      if (!buckets.has(signature)) buckets.set(signature, []);
      buckets.get(signature).push(course);
    }
    for (const variants of buckets.values()) {
      if (variants.length < 2 || !normalizeEquivalentCourseName(variants[0].name)) continue;
      const canonical = preferredVariantCourse(variants);
      const equivalentCourseIds = [];
      const equivalentBedeliasCodes = [];
      for (const variant of variants) {
        if (variant.id === canonical.id) continue;
        aliases.set(variant.id, canonical.id);
        equivalentCourseIds.push(variant.id, ...(variant.equivalentCourseIds ?? []));
        equivalentBedeliasCodes.push(variant.bedeliasCode, ...(variant.equivalentBedeliasCodes ?? []));
      }
      canonical.equivalentCourseIds = [...new Set([...(canonical.equivalentCourseIds ?? []), ...equivalentCourseIds].filter(Boolean))];
      canonical.equivalentBedeliasCodes = [...new Set([...(canonical.equivalentBedeliasCodes ?? []), ...equivalentBedeliasCodes].filter(Boolean))];
    }
  }

  if (aliases.size === 0) return aliases;
  const canonicalId = (id) => aliases.get(id) ?? id;
  const canonicalIds = (ids) => [...new Set(ids.map(canonicalId))];
  curriculum.courses = curriculum.courses.filter((course) => !aliases.has(course.id));
  curriculum.periods = curriculum.periods.map((period) => ({ ...period, courseIds: canonicalIds(period.courseIds) }));
  for (const group of curriculum.requiredCourseGroups ?? []) {
    group.courseIds = canonicalIds(group.courseIds);
    group.minCompleted = Math.min(group.minCompleted, group.courseIds.length);
  }
  for (const [groupId, courseIds] of Object.entries(curriculum.requirementCourseGroups ?? {})) {
    curriculum.requirementCourseGroups[groupId] = canonicalIds(courseIds);
  }
  for (const [sourceId, courseId] of curriculum.courseIdBySourceId ?? []) {
    curriculum.courseIdBySourceId.set(sourceId, canonicalId(courseId));
  }
  return aliases;
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

function academicTitle(value) {
  return titleCase(value).replace(/\bLsu\b/g, "LSU");
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
  const filterTrajectoryCatalog = (trajectory, courseIds) => {
    if (!Array.isArray(trajectory.catalogSourceCourseIds)) return courseIds;
    const allowedIds = new Set(trajectory.catalogSourceCourseIds
      .map((sourceId) => officialCurriculum?.courseIdBySourceId.get(sourceId) ?? sourceId));
    return courseIds.filter((id) => allowedIds.has(id));
  };
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
      const excludedPeriodIds = new Set((trajectory.excludedPeriodCourseIds ?? [])
        .map((id) => officialCurriculum?.courseIdBySourceId.get(id) ?? id));
      const compositionPeriods = officialCurriculum?.pathwayPeriods?.[trajectory.id];
      if (compositionPeriods) {
        const excludedIds = new Set((trajectory.excludedCourseIds ?? [])
          .map((id) => officialCurriculum?.courseIdBySourceId.get(id) ?? id));
        const knownCourseIds = new Set(officialCurriculum.courses.map((course) => course.id));
        const mergedPeriods = new Map();
        const sourcePeriods = trajectory.useOnlyConfiguredPeriods === true
          ? trajectory.periods ?? []
          : [...(trajectory.periods ?? []), ...compositionPeriods];
        for (const period of sourcePeriods) {
          if (!mergedPeriods.has(period.label)) mergedPeriods.set(period.label, []);
          for (const sourceId of period.courseIds ?? []) {
            const id = officialCurriculum?.courseIdBySourceId.get(sourceId) ?? sourceId;
            if (knownCourseIds.has(id) && !excludedIds.has(id) && !excludedPeriodIds.has(id) && !mergedPeriods.get(period.label).includes(id)) {
              mergedPeriods.get(period.label).push(id);
            }
          }
        }
        const trajectoryPeriods = [...mergedPeriods]
          .map(([label, courseIds]) => ({ label, courseIds }))
          .filter((period) => period.courseIds.length > 0);
        const selectedCourseIds = new Set(trajectoryPeriods.flatMap((period) => period.courseIds));
        const catalogCourseIds = filterTrajectoryCatalog(trajectory, audit.officialPlan.curriculum.includeAllCoursesInPathwayCatalog
          ? officialCurriculum.courses.map((course) => course.id)
            .filter((id) => !selectedCourseIds.has(id) && !excludedIds.has(id))
          : []);
        return [trajectory.id, {
          label: trajectory.label,
          description: trajectory.description ?? `${trajectory.label} es una trayectoria publicada por el servicio universitario.`,
          ...(trajectory.credentialId ? { credentialId: trajectory.credentialId } : {}),
          campusIds: trajectory.campusIds ?? campuses.map((campus) => campus.id),
          ...(trajectory.restrictGeneratedCatalogToPublished === true ? { restrictGeneratedCatalogToPublished: true } : {}),
          periods: trajectoryPeriods,
          ...(catalogCourseIds.length > 0 ? { catalogCourseIds } : {}),
        }];
      }
      const excludedIds = new Set((trajectory.excludedCourseIds ?? []).map((id) => officialCurriculum?.courseIdBySourceId.get(id) ?? id));
      const includedIds = Array.isArray(trajectory.courseIds)
        ? new Set([...(audit.officialPlan.curriculum.commonCourseIds ?? []), ...trajectory.courseIds]
          .map((id) => officialCurriculum?.courseIdBySourceId.get(id) ?? id))
        : null;
      const configuredTrajectoryPeriods = (trajectory.periods ?? periods).map((period) => ({
        label: period.label,
        courseIds: (period.courseIds ?? [])
          .map((id) => officialCurriculum?.courseIdBySourceId.get(id) ?? id)
          .filter((id) => id && !excludedIds.has(id) && !excludedPeriodIds.has(id) && (!includedIds || includedIds.has(id))),
      })).filter((period) => period.courseIds.length > 0);
      const configuredCourseIds = new Set(configuredTrajectoryPeriods.flatMap((period) => period.courseIds));
      const curricularBlockIds = new Set((officialCurriculum?.courses ?? [])
        .filter((course) => course.curricularBlock === true && course.credits === 0)
        .map((course) => course.id));
      const sharedBlockPeriods = (trajectory.useOnlyConfiguredPeriods === true ? [] : officialCurriculum?.periods ?? []).map((period) => ({
        label: period.label,
        courseIds: period.courseIds.filter((id) => (
          curricularBlockIds.has(id) && !excludedIds.has(id) && !excludedPeriodIds.has(id) && !configuredCourseIds.has(id)
        )),
      })).filter((period) => period.courseIds.length > 0);
      const leadingBlockPeriods = sharedBlockPeriods.filter((period) => /orientaci[oó]n/i.test(period.label));
      const trailingBlockPeriods = sharedBlockPeriods.filter((period) => !/orientaci[oó]n/i.test(period.label));
      const trajectoryPeriods = [...leadingBlockPeriods, ...configuredTrajectoryPeriods, ...trailingBlockPeriods];
      const selectedCourseIds = new Set(trajectoryPeriods.flatMap((period) => period.courseIds));
      const catalogCourseIds = filterTrajectoryCatalog(trajectory, audit.officialPlan.curriculum.includeAllCoursesInPathwayCatalog
        ? officialCurriculum.courses.map((course) => course.id)
          .filter((id) => !excludedIds.has(id) && !selectedCourseIds.has(id))
        : includedIds
          ? [...new Set((trajectory.periods ?? periods).flatMap((period) => period.courseIds ?? []))]
            .map((id) => officialCurriculum?.courseIdBySourceId.get(id) ?? id)
            .filter((id) => id && !excludedIds.has(id) && !includedIds.has(id))
          : []);
      return [trajectory.id, {
        label: trajectory.label,
        description: trajectory.description ?? `${trajectory.label} es una trayectoria publicada por el servicio universitario.`,
        ...(trajectory.credentialId ? { credentialId: trajectory.credentialId } : {}),
        campusIds: trajectory.campusIds ?? campuses.map((campus) => campus.id),
        ...(trajectory.restrictGeneratedCatalogToPublished === true ? { restrictGeneratedCatalogToPublished: true } : {}),
        periods: trajectoryPeriods,
        ...(catalogCourseIds.length > 0 ? { catalogCourseIds } : {}),
      }];
    }));
  }
  const hasOfficialCourses = audit?.officialPlan?.curriculum?.periods?.some((period) => (period.courses ?? []).length > 0) === true;
  const catalogCourseIds = [
    ...periods.filter((period) => period.catalog).flatMap((period) => period.courseIds),
    ...(officialCurriculum?.catalogCourseIds ?? []),
  ];
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

function collectExpressionCourseIds(expression, output = new Set()) {
  if (!expression) return output;
  for (const option of expression.options ?? []) {
    if (option.code) output.add(option.code);
  }
  for (const child of expression.children ?? []) collectExpressionCourseIds(child, output);
  return output;
}

function ruleUsesOnlyPublishedCourseIdentities(rule, publishedCourseIdentities) {
  return publishedCourseIdentities.has(rule.target.code)
    && [...collectExpressionCourseIds(rule.expression)].every((courseId) => publishedCourseIdentities.has(courseId));
}

function buildOfficialCurriculum(audit, serviceCode, usedIds) {
  const curriculum = audit?.officialPlan?.curriculum;
  const hasPeriods = Array.isArray(curriculum?.periods) && curriculum.periods.length > 0;
  const courseGroups = curriculum?.courseGroups ?? curriculum?.periods ?? [];
  const hasCourseGroups = Array.isArray(courseGroups) && courseGroups.length > 0;
  const hasRequirements = Array.isArray(curriculum?.creditRequirements) && curriculum.creditRequirements.length > 0;
  if (!hasPeriods && !hasCourseGroups && !hasRequirements) return null;

  const sourceUrl = curriculum.sourceUrl ?? audit.sources?.[0]?.url;
  const courses = [];
  const periods = [];
  const courseIdBySourceId = new Map();
  for (const period of courseGroups) {
    const courseIds = [];
    for (const [index, rawCourse] of (period.courses ?? []).entries()) {
      const id = courseId(serviceCode, rawCourse, courses.length + index, usedIds);
      const credits = Number(rawCourse.credits);
      const hours = Number(rawCourse.hours);
      const nodeId = rawCourse.requirementId ?? "plan-total";
      const courseSourceUrl = rawCourse.sourceUrl ?? period.sourceUrl ?? sourceUrl;
      courses.push(withCourseAuthority({
        id,
        name: rawCourse.name,
        credits: Number.isFinite(credits) && credits >= 0 ? credits : 0,
        ...(Number.isFinite(hours) && hours > 0 ? { hours } : {}),
        eligibleRequirementIds: [nodeId],
        creditAllocations: [{ nodeId, credits, status: "official", sourceUrl: courseSourceUrl }],
        dataStatus: "official-curriculum",
        ruleCoverage: "not-published",
        curricularBlock: rawCourse.curricularBlock === true,
      }, "verified", { officialIdentity: true, officialCredits: true }));
      if (rawCourse.id) courseIdBySourceId.set(rawCourse.id, id);
      courseIds.push(id);
    }
    if (!curriculum.courseGroups) {
      periods.push({ label: period.label, courseIds, ...(period.catalog === true ? { catalog: true } : {}) });
    }
  }

  const catalogCourseIds = [];
  for (const [index, rawCourse] of (curriculum.catalogCourses ?? []).entries()) {
    const id = courseId(serviceCode, rawCourse, courses.length + index, usedIds);
    const credits = Number(rawCourse.credits);
    const hours = Number(rawCourse.hours);
    const nodeId = rawCourse.requirementId ?? "plan-total";
    const courseSourceUrl = rawCourse.sourceUrl ?? sourceUrl;
    courses.push(withCourseAuthority({
      id,
      ...(rawCourse.sourceCourseId ? { sourceCourseId: rawCourse.sourceCourseId } : {}),
      name: rawCourse.name,
      credits: Number.isFinite(credits) && credits >= 0 ? credits : 0,
      ...(Number.isFinite(hours) && hours > 0 ? { hours } : {}),
      eligibleRequirementIds: [nodeId],
      creditAllocations: [{ nodeId, credits, status: "official", sourceUrl: courseSourceUrl }],
      dataStatus: "official-curriculum",
      ruleCoverage: "not-published",
      curricularBlock: rawCourse.curricularBlock === true,
    }, "verified", { officialIdentity: true, officialCredits: true }));
    if (rawCourse.id) courseIdBySourceId.set(rawCourse.id, id);
    catalogCourseIds.push(id);
  }

  if (curriculum.courseGroups) {
    for (const period of curriculum.periods ?? []) {
      periods.push({
        label: period.label,
        courseIds: (period.courseIds ?? []).map((id) => courseIdBySourceId.get(id)).filter(Boolean),
        ...(period.catalog === true ? { catalog: true } : {}),
      });
    }
    for (const sourceCourseId of curriculum.catalogCourseIds ?? []) {
      const id = courseIdBySourceId.get(sourceCourseId);
      if (id && !catalogCourseIds.includes(id)) catalogCourseIds.push(id);
    }
  }

  const nodes = [{ id: "plan-total", parentId: null, kind: "group", name: "Total del plan", shortName: "Total", minCredits: Number(audit.officialPlan.minimumCredits), sourceStatus: "official", sourceUrl }];
  for (const requirement of curriculum.creditRequirements ?? []) {
    nodes.push({
      id: requirement.id,
      parentId: Object.hasOwn(requirement, "parentId") ? requirement.parentId : "plan-total",
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
    ...((credential.alternativeNodeRequirements ?? []).length > 0 ? { alternativeNodeRequirements: credential.alternativeNodeRequirements.map((requirement) => ({
      id: requirement.id,
      label: requirement.label,
      minSatisfied: Number(requirement.minSatisfied),
      options: (requirement.options ?? []).map((option) => ({
        nodeId: option.nodeId,
        minCredits: Number(option.minCredits),
      })),
      sourceUrl: requirement.sourceUrl ?? credential.sourceUrl ?? sourceUrl,
    })) } : {}),
    requiredCourseGroups: (credential.requiredCourseGroupIds ?? [])
      .map((id) => requiredCourseGroups.find((group) => group.id === id))
      .filter(Boolean),
    requiredActivities: [],
    sourceUrl: credential.sourceUrl ?? sourceUrl,
  }));

  return { courses, periods, catalogCourseIds, nodes, requiredCourseGroups, requirementCourseGroups, credentials, sourceUrl, courseIdBySourceId };
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
  const verifiedSourceCourseIds = exactOfficialCourseSourceIds(audit);
  const historicalEquivalentSourceCourseIds = new Set(curriculum.historicalEquivalentSourceCourseIds ?? []);
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
    if (isAdministrativeCreditEntry(parsed.name) || isAdministrativeCreditEntry(legacyParsed.name)) continue;
    if ((parsed.code && excludedSourceCourseIds.has(parsed.code))
      || (legacyParsed.code && excludedSourceCourseIds.has(legacyParsed.code))) continue;
    const courseOverride = courseOverrides[parsed.code]
      ?? courseOverrides[legacyParsed.code]
      ?? courseOverrides[normalize(parsed.name)]
      ?? courseOverrides[normalize(legacyParsed.name)]
      ?? {};
    const sourceCourseId = courseOverride.sourceId ?? parsed.code;
    if (curriculum.excludeUnverifiedSnapshotCourses === true
      && !verifiedSourceCourseIds.has(String(sourceCourseId))) continue;
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
    const titleCasedName = courseOverride.preserveName === true
      ? courseOverride.name
      : titleCase((courseOverride.name ?? parsed.name) || `Unidad ${index + 1}`);
    const displayName = courseOverride.preserveName === true
      ? titleCasedName
      : useProfileComposition
      ? titleCasedName.replace(/\b(?:Iii|Ii|Iv|Viii|Vii|Vi|Ix|Xi|Xii)\b/g, (roman) => roman.toLocaleUpperCase("es-UY"))
      : titleCasedName;
    const mergeSplitCompositionCourses = curriculum.mergeSplitCompositionCourses === true;
    const sharedKey = mergeSplitCompositionCourses
      ? `${sourceCourseId ? `code:${normalize(sourceCourseId)}:` : ""}name:${normalize(courseOverride.name ?? parsed.name)}`
      : curriculum.deduplicateSharedProfileCourses === true
        ? `${sourceCourseId ? `code:${normalize(sourceCourseId)}:` : ""}name:${normalize(courseOverride.name ?? parsed.name)}:credits:${credits}`
        : null;
    let course = sharedKey ? sharedProfileCourses.get(sharedKey) : null;
    if (!course) {
      const id = courseId(serviceCode, { code: sourceCourseId, name: courseOverride.name ?? parsed.name }, index, usedIds);
      const excludedRequirementIds = new Set(courseOverride.excludedAdditionalRequirementIds ?? []);
      const eligibleRequirementIds = [...new Set([
        nodeId,
        ...(courseOverride.additionalRequirementIds ?? []),
        ...additionalRequirementIdsForAllCourses.filter((id) => !excludedRequirementIds.has(id)),
      ])];
      const isOfficialOverride = Object.keys(courseOverride).length > 0;
      const hasOfficialIdentity = courseOverride.officialIdentity ?? isOfficialOverride;
      const hasOfficialCredits = courseOverride.officialCredits ?? isOfficialOverride;
      const authorityStatus = verifiedSourceCourseIds.has(String(sourceCourseId))
        || (curriculum.strictOfficialCourseIds !== true && isOfficialOverride)
        ? "verified"
        : historicalEquivalentSourceCourseIds.has(String(sourceCourseId)) ? "historical-equivalent" : "candidate";
      course = withCourseAuthority({
        id,
        ...(sourceCourseId ? { bedeliasCode: sourceCourseId } : {}),
        ...((courseOverride.equivalentCourseIds ?? []).length > 0
          ? { equivalentCourseIds: [...new Set(courseOverride.equivalentCourseIds)] }
          : {}),
        ...((courseOverride.equivalentBedeliasCodes ?? []).length > 0
          ? { equivalentBedeliasCodes: [...new Set(courseOverride.equivalentBedeliasCodes)] }
          : {}),
        name: displayName,
        credits,
        ...(courseOverride.creditSourceUrl ? { creditSourceUrl: courseOverride.creditSourceUrl } : {}),
        ...(courseOverride.creditConflict ? { creditConflict: courseOverride.creditConflict } : {}),
        eligibleRequirementIds,
        creditAllocations: eligibleRequirementIds.map((eligibleNodeId) => ({ nodeId: eligibleNodeId, credits, status: "official", sourceUrl })),
        dataStatus: Object.keys(courseOverride).length > 0
          ? "official-curriculum"
          : curriculum.usePublishedCredits === true ? "bedelias-composition" : "bedelias-composition-creditless",
        ruleCoverage: "not-scraped",
      }, authorityStatus, { officialIdentity: hasOfficialIdentity, officialCredits: hasOfficialCredits });
      courses.push(course);
      if (sharedKey) sharedProfileCourses.set(sharedKey, course);
    } else {
      if (!course.eligibleRequirementIds.includes(nodeId)) course.eligibleRequirementIds.push(nodeId);
      if (!course.creditAllocations.some((allocation) => allocation.nodeId === nodeId)) {
        course.creditAllocations.push({ nodeId, credits, status: "official", sourceUrl });
        if (mergeSplitCompositionCourses) course.credits += credits;
      }
      const excludedRequirementIds = new Set(courseOverride.excludedAdditionalRequirementIds ?? []);
      for (const eligibleNodeId of [
        ...(courseOverride.additionalRequirementIds ?? []),
        ...additionalRequirementIdsForAllCourses.filter((id) => !excludedRequirementIds.has(id)),
      ]) {
        if (!course.eligibleRequirementIds.includes(eligibleNodeId)) course.eligibleRequirementIds.push(eligibleNodeId);
        if (!course.creditAllocations.some((allocation) => allocation.nodeId === eligibleNodeId)) {
          course.creditAllocations.push({ nodeId: eligibleNodeId, credits, status: "official", sourceUrl });
        }
      }
    }
    if (Number.isFinite(Number(courseOverride.mergedTotalCredits))) {
      course.credits = Number(courseOverride.mergedTotalCredits);
    }
    for (const [allocationNodeId, allocationCredits] of Object.entries(courseOverride.allocationCreditOverrides ?? {})) {
      const allocation = course.creditAllocations.find(({ nodeId: allocationNodeIdValue }) => allocationNodeIdValue === allocationNodeId);
      if (allocation && Number.isFinite(Number(allocationCredits))) allocation.credits = Number(allocationCredits);
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
    const eligibleRequirementIds = [...new Set([nodeId, ...(rawCourse.additionalRequirementIds ?? [])])];
    courses.push(withCourseAuthority({
      id,
      ...(rawCourse.sourceCourseId ? { sourceCourseId: rawCourse.sourceCourseId } : {}),
      name: rawCourse.name,
      credits: Number(rawCourse.credits) || 0,
      eligibleRequirementIds,
      creditAllocations: eligibleRequirementIds.map((eligibleNodeId) => ({
        nodeId: eligibleNodeId,
        credits: Number(rawCourse.credits) || 0,
        status: "official",
        sourceUrl: rawCourse.sourceUrl ?? sourceUrl,
      })),
      dataStatus: "official-curriculum",
      ruleCoverage: "not-published",
      curricularBlock: rawCourse.curricularBlock === true,
      ...(rawCourse.elective === true ? { elective: true } : {}),
      ...(rawCourse.creditsPublished === false ? { creditsPublished: false } : {}),
      ...(rawCourse.catalogRole ? { catalogRole: rawCourse.catalogRole } : {}),
      ...(rawCourse.availabilityStatus ? { availabilityStatus: rawCourse.availabilityStatus } : {}),
    }, "verified", {
      officialIdentity: true,
      officialCredits: rawCourse.officialCredits ?? true,
      ...(rawCourse.creditsProvenance ? { creditsProvenance: rawCourse.creditsProvenance } : {}),
    }));
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
    const manualCourse = withCourseAuthority({
      id: courseId(serviceCode, { id: "validacion-final-plan" }, courses.length, usedIds),
      name: curriculum.manualCompletionValidation,
      credits: 0,
      eligibleRequirementIds: ["plan-total"],
      creditAllocations: [{ nodeId: "plan-total", credits: 0, status: "official", sourceUrl }],
      dataStatus: "manual-validation",
      ruleCoverage: "not-published",
      curricularBlock: true,
    }, "verified", { officialIdentity: true, officialCredits: true });
    courses.push(manualCourse);
    courseIdBySourceId.set("validacion-final-plan", manualCourse.id);
    periodsByLabel.set("Validación de egreso", [manualCourse.id]);
    commonPeriodsByLabel.set("Validación de egreso", [manualCourse.id]);
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
      parentId: Object.hasOwn(requirement, "parentId") ? requirement.parentId : "plan-total",
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
    ...((credential.alternativeNodeRequirements ?? []).length > 0 ? { alternativeNodeRequirements: credential.alternativeNodeRequirements.map((requirement) => ({
      id: requirement.id,
      label: requirement.label,
      minSatisfied: Number(requirement.minSatisfied),
      options: (requirement.options ?? []).map((option) => ({
        nodeId: option.nodeId,
        minCredits: Number(option.minCredits),
      })),
      sourceUrl: requirement.sourceUrl ?? credential.sourceUrl ?? sourceUrl,
    })) } : {}),
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
  const mergedPeriods = (...periodMaps) => {
    const merged = new Map();
    for (const periodMap of periodMaps) {
      for (const [label, courseIds] of periodMap) {
        for (const id of courseIds) addToPeriod(merged, label, id);
      }
    }
    return merged;
  };
  const pathwayPeriods = Object.fromEntries([...profilePeriodsById].map(([profileId, profilePeriods]) => [
    profileId,
    orderedPeriods(mergedPeriods(commonPeriodsByLabel, profilePeriods)),
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
    if (isAdministrativeCreditEntry(rawCourse.name)) continue;
    const id = courseId(snapshot.service.code, rawCourse, index, usedIds);
    const credits = Number(rawCourse.credits);
    const label = periodLabel(rawCourse);
    if (!periodMap.has(label)) periodMap.set(label, []);
    periodMap.get(label).push(id);
    if (rawCourse.code && !codeToId.has(rawCourse.code)) codeToId.set(rawCourse.code, id);
    courses.push(withCourseAuthority({
      id,
      bedeliasCode: rawCourse.code || undefined,
      name: titleCase(rawCourse.name || rawCourse.code || `Unidad ${index + 1}`),
      credits: Number.isFinite(credits) && credits >= 0 ? credits : 0,
      eligibleRequirementIds: ["plan-total"],
      creditAllocations: [{ nodeId: "plan-total", credits: Number.isFinite(credits) && credits >= 0 ? credits : 0, status: "official", sourceUrl: snapshot.plan.sourceUrl }],
      dataStatus: "bedelias-composition",
      ruleCoverage: "not-scraped",
    }, "candidate"));
    courseRecords.push({ id, rawCourse });
  }

  const usesBedeliasCompositionTree = audit?.officialPlan?.curriculum?.useBedeliasCompositionTree === true;
  const officialCurriculumUsedIds = audit?.officialPlan?.curriculum?.preserveBedeliasCourseIds === true
    ? new Set()
    : usedIds;
  const officialCurriculum = buildBedeliasCompositionCurriculum(audit, snapshot, snapshot.service.code, officialCurriculumUsedIds)
    ?? buildOfficialCurriculum(audit, snapshot.service.code, usedIds);
  const coursesBeforeAliasConsolidation = [...(officialCurriculum?.courses ?? [])];
  const equivalentCourseAliases = consolidateEquivalentCourseVariants(officialCurriculum);
  for (const [sourceCode, courseId] of codeToId) {
    codeToId.set(sourceCode, equivalentCourseAliases.get(courseId) ?? courseId);
  }
  const replaceBedeliasCourses = audit?.officialPlan?.curriculum?.replaceBedeliasCourses === true;
  if (officialCurriculum && (
    courses.length === 0
    || audit?.officialPlan?.curriculum?.useBedeliasCompositionTree === true
    || replaceBedeliasCourses
  )) {
    courses = officialCurriculum.courses;
    if (replaceBedeliasCourses || usesBedeliasCompositionTree) codeToId.clear();
    for (const course of courses) {
      if (course.bedeliasCode && !codeToId.has(course.bedeliasCode)) codeToId.set(course.bedeliasCode, course.id);
    }
  }

  const verifiedCourseIds = new Set(courses.filter((course) => course.authorityStatus === "verified").map((course) => course.id));
  const publishedCourseIdentities = new Set(courses
    .filter((course) => course.authorityStatus === "verified")
    .flatMap((course) => [course.id, course.bedeliasCode].filter(Boolean)));
  const rawRuleTargetCodes = new Set();
  const noPublishedCodes = new Set();
  const rules = [];
  // Preserve the Bedelías rule evidence even when an official curriculum replaces
  // the composition. `publishedRules` below is the authority boundary: only
  // rules whose target and every referenced identity are verified reach the UI.
  for (const rule of snapshot.prerequisites ?? []) {
    if (isAdministrativeCreditEntry(rule.target?.name)) continue;
    if (rule.expression && ["course", "exam"].includes(rule.target?.assessment) && rule.target?.code) {
      rawRuleTargetCodes.add(rule.target.code);
      rules.push({ target: { code: rule.target.code, name: rule.target.name, assessment: rule.target.assessment }, expression: normalizeExpressionCourseIds(rule.expression, codeToId, snapshot.service.code), heading: rule.heading, sourceUrl: rule.sourceUrl });
    } else if (rule.noPublishedRule && rule.target?.code) noPublishedCodes.add(rule.target.code);
  }
  for (const rule of buildOfficialPrerequisiteRules(audit, officialCurriculum, snapshot.service.code)) {
    rawRuleTargetCodes.add(rule.target.code);
    rules.push(rule);
  }
  const publishedRules = rules.filter((rule) => ruleUsesOnlyPublishedCourseIdentities(rule, publishedCourseIdentities));
  const publishedRuleTargetCodes = new Set(publishedRules.map((rule) => rule.target.code));
  for (const course of courses) {
    if (!course.bedeliasCode) {
      if (publishedRuleTargetCodes.has(course.id)) course.ruleCoverage = "published";
      else if (rawRuleTargetCodes.has(course.id)) course.ruleCoverage = "partial";
      continue;
    }
    course.ruleCoverage = publishedRuleTargetCodes.has(course.bedeliasCode)
      ? "published"
      : rawRuleTargetCodes.has(course.bedeliasCode)
        ? "partial"
        : noPublishedCodes.has(course.bedeliasCode) ? "not-published" : "not-scraped";
  }

  const publishedMinCredits = Number(snapshot.plan?.metadata?.minCredits);
  const auditedMinCredits = Number(audit?.officialPlan?.minimumCredits);
  const safeMinCredits = Number.isFinite(auditedMinCredits) && auditedMinCredits > 0
    ? auditedMinCredits
    : Number.isFinite(publishedMinCredits) && publishedMinCredits > 0 ? publishedMinCredits : 0;
  const hiddenCourseIds = new Set(courses.filter((course) => course.authorityStatus !== "verified").map((course) => course.id));
  const filterPublishedIds = (ids) => ids.filter((id) => verifiedCourseIds.has(id));
  const extractedCompositionAvailable = courses.length > 0;
  const compositionAvailable = extractedCompositionAvailable;
  const verifiedCompositionAvailable = verifiedCourseIds.size > 0;
  const periods = officialCurriculum
    ? officialCurriculum.periods
    : extractedCompositionAvailable ? [...periodMap].map(([label, courseIds]) => ({ label, courseIds })) : [];
  const campuses = auditCampuses(audit);
  const pathways = buildPathways(audit, periods, courseRecords, campuses, officialCurriculum);
  const publishedPathways = Object.fromEntries(Object.entries(pathways).map(([id, pathway]) => [id, {
    ...pathway,
    periods: pathway.periods.map((period) => ({ ...period, courseIds: filterPublishedIds(period.courseIds) })).filter((period) => period.courseIds.length > 0),
    ...(pathway.catalogCourseIds ? { catalogCourseIds: filterPublishedIds(pathway.catalogCourseIds) } : {}),
  }]));
  const auditStatus = audit ? "official-evidence-complete" : entry.canonicalSource.state === "structurally-valid" ? "structurally-valid" : "extracted";
  const courseCatalogAuditStatus = verifiedCourseIds.size === 0
    ? "structure-only"
    : hiddenCourseIds.size === 0 ? "verified" : "partial";
  const planDocument = audit?.sources?.[0]?.url ?? snapshot.plan?.metadata?.colibriUrl ?? snapshot.plan?.sourceUrl;
  let notice = audit?.uiNotice
    ?? (audit?.identity === "tecnicatura en deportes:2007"
    ? "El Plan 2007 continúa para cohortes existentes, pero no tiene ingreso abierto en Montevideo ni Rocha durante 2026; Paysandú no publica una nueva apertura y Rivera se conserva sólo como antecedente histórico."
    : officialCurriculum?.courses.length
      ? "Malla curricular vigente publicada por el servicio. Las previaturas no se muestran cuando la fuente oficial no las documenta."
    : officialCurriculum
      ? "La estructura de créditos y requisitos fue auditada en fuentes oficiales, pero el servicio no publica su composición por unidades curriculares. No se inventan materias ni trayectorias."
    : extractedCompositionAvailable
    ? audit
      ? "La estructura del plan fue contrastada con fuentes oficiales. Sólo se muestran las materias respaldadas por una fuente curricular vigente; el resto de la composición de Bedelías permanece en validación."
      : "El plan permanece seleccionable, pero sus materias extraídas de Bedelías todavía no tienen respaldo curricular suficiente para mostrarse como catálogo vigente."
    : "Bedelías identifica este plan vigente, pero no publica su composición. No se inventan materias ni una trayectoria provisional.");
  if (courseCatalogAuditStatus === "partial") {
    notice = `${notice} El catálogo publicado es parcial: las demás entradas de Bedelías se conservaron para revisión, pero no se muestran como materias vigentes.`;
  } else if (courseCatalogAuditStatus === "structure-only" && extractedCompositionAvailable) {
    notice = `${notice} La composición extraída se conservó para revisión, pero ninguna entrada se presenta como materia vigente sin una fuente curricular que la respalde.`;
  }

  const sharedWith = [
    ...(audit?.officialPlan?.sharedWith ?? []),
    ...(entry.sourceOffers ?? []).map((offer) => offer.serviceName)
      .filter((name) => Boolean(name) && name !== entry.canonicalSource.serviceName),
  ].filter((name, index, names) => names.findIndex((candidate) => normalize(candidate) === normalize(name)) === index);
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
        degreeTitle: academicTitle(audit?.officialPlan?.title ?? snapshot.plan?.titleLabels?.[0] ?? entry.career.name),
        ...(audit?.officialPlan?.credentialLabel ? { credentialLabel: audit.officialPlan.credentialLabel } : {}),
        minCredits: safeMinCredits,
        publishedMinCredits: Number.isFinite(publishedMinCredits) && publishedMinCredits > 0 ? publishedMinCredits : null,
        durationMonths: Number(audit?.officialPlan?.durationMonths) || Number.parseInt(snapshot.plan?.metadata?.duration, 10) || null,
        ...(Number(audit?.officialPlan?.totalHours) > 0 ? { totalHours: Number(audit.officialPlan.totalHours) } : {}),
        campuses,
        sharedWith,
        auditStatus,
        planAuditStatus: auditStatus,
        courseCatalogAuditStatus,
        ...(audit?.officialPlan?.creditComputationCoverage ? { creditComputationCoverage: audit.officialPlan.creditComputationCoverage } : {}),
        compositionAvailable,
        verifiedCompositionAvailable,
        extractedCompositionAvailable,
        notice,
        publishedRules: publishedRules.length,
        partialRules: rules.length - publishedRules.length,
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
      publishedPathways,
      campuses,
      rules,
      publishedRules,
      requirementGroupMap: {},
      ...(officialCurriculum && Object.keys(officialCurriculum.requirementCourseGroups).length > 0
        ? { requirementCourseGroups: officialCurriculum.requirementCourseGroups }
        : {}),
      courseAuthority: {
        schemaVersion: 1,
        sources: {
          "official-curriculum": { kind: "official-curriculum", url: audit?.officialPlan?.curriculum?.sourceUrl ?? planDocument, reviewedAt: audit?.reviewedAt ?? null },
          "bedelias-composition": { kind: "bedelias-composition", url: snapshot.plan?.sourceUrl, extractedAt: snapshot.source?.extractedAt ?? null, contentHash: snapshot.contentHash ?? null },
        },
        statuses: COURSE_AUTHORITY_STATUSES,
        records: [
          ...coursesBeforeAliasConsolidation.filter((course) => equivalentCourseAliases.has(course.id)).map((course) => ({
            courseId: course.id,
            sourceCourseId: course.bedeliasCode ?? null,
            status: "historical-equivalent",
            canonicalCourseId: equivalentCourseAliases.get(course.id),
            fieldProvenance: course.fieldProvenance,
          })),
          ...(snapshot.plan?.courses ?? []).filter((course) => isAdministrativeCreditEntry(course.name)).map((course, index) => ({
            courseId: `${snapshot.service.code.toLocaleLowerCase()}-administrative-${slug(course.code || course.name || index + 1)}`,
            sourceCourseId: course.code ?? null,
            status: "administrative",
            fieldProvenance: courseFieldProvenance("administrative"),
          })),
          ...(snapshot.plan?.courses ?? []).filter((course) => audit?.officialPlan?.curriculum?.excludedSourceCourseIds?.includes(course.code)).map((course, index) => ({
            courseId: `${snapshot.service.code.toLocaleLowerCase()}-rejected-${slug(course.code || course.name || index + 1)}`,
            sourceCourseId: course.code ?? null,
            status: "rejected",
            fieldProvenance: courseFieldProvenance("rejected"),
          })),
          ...(audit?.officialPlan?.curriculum?.progressAliases ?? []).flatMap((alias) => {
            const canonicalCourseId = officialCurriculum?.courseIdBySourceId?.get(alias.sourceId);
            if (!canonicalCourseId) return [];
            return (alias.equivalentCourseIds ?? []).map((courseId) => ({
              courseId,
              sourceCourseId: alias.sourceId,
              status: "historical-equivalent",
              canonicalCourseId,
              fieldProvenance: courseFieldProvenance("historical-equivalent"),
            }));
          }),
          ...(audit?.officialPlan?.curriculum?.excludeUnverifiedSnapshotCourses === true
            ? (snapshot.plan?.courses ?? []).filter((course) => (
              course.code
              && !isAdministrativeCreditEntry(course.name)
              && !exactOfficialCourseSourceIds(audit).has(String(course.code))
            )).map((course, index) => ({
              courseId: `${snapshot.service.code.toLocaleLowerCase()}-rejected-${slug(course.code || course.name || index + 1)}`,
              sourceCourseId: course.code ?? null,
              status: "rejected",
              fieldProvenance: courseFieldProvenance("rejected"),
            }))
            : []),
        ],
      },
      audit: {
        anomalies: audit?.officialPlan?.curriculum?.projectionAnomalies ?? snapshot.validation?.issues ?? [],
        priority: entry.priority ?? "official-evidence-complete",
        publicationEligible: false,
      },
    },
  };
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function fceaEconomia2012Reconciliation(source) {
  const gridRows = source.mainGrid.periods.flatMap((period) => (
    period.rows.flatMap((row) => row.sourceIds.map((sourceId) => ({ ...row, sourceId, periodLabel: period.label })))
  ));
  const sourceCourses = [
    ...gridRows,
    ...source.additionalVerifiedCourses.map((course) => ({
      ...course,
      sourceId: course.sourceId,
      sourceIds: [course.sourceId],
    })),
  ];
  const courseOverrides = Object.fromEntries(sourceCourses.map((course) => [course.sourceId, {
    sourceId: course.sourceId,
    name: course.name,
    ...(course.sourceId === "MC52" ? {} : { requirementId: course.area }),
    ...(course.sourceId === "MC52"
      ? {
          mergedTotalCredits: course.credits,
          allocationCreditOverrides: { "free-distribution": course.credits },
        }
      : { credits: course.credits }),
    ...((source.bedeliasComparison.progressAliases ?? []).find(({ sourceId }) => sourceId === course.sourceId) ?? {}),
  }]));
  const verifiedCourseIds = [...new Set(sourceCourses.map(({ sourceId }) => sourceId))];
  const requiredByPeriod = new Map(source.mainGrid.periods.map((period) => [
    period.label,
    period.rows.filter(({ inclusion }) => inclusion !== "opcional").flatMap(({ sourceIds }) => sourceIds),
  ]));
  const periodBySourceId = new Map(gridRows.map(({ sourceId, periodLabel }) => [sourceId, periodLabel]));
  const guideTrajectory = (guide) => {
    const recommendedIds = [...new Set(guide.suggestions.flatMap(({ sourceIds = [] }) => sourceIds))];
    return {
      id: guide.id,
      label: guide.label,
      description: guide.description,
      credentialId: "licenciado-economia",
      useOnlyConfiguredPeriods: true,
      periods: source.mainGrid.periods.map(({ label }) => ({
        label,
        courseIds: [...new Set([
          ...(requiredByPeriod.get(label) ?? []),
          ...recommendedIds.filter((sourceId) => periodBySourceId.get(sourceId) === label),
        ])],
      })),
    };
  };
  const trajectories = [
    {
      id: "personalizada",
      label: "Grilla curricular",
      description: "Grilla curricular vigente de FCEA; ordena obligatorias y opciones por semestre sin volver obligatoria toda la oferta opcional.",
      credentialId: "licenciado-economia",
      useOnlyConfiguredPeriods: true,
      periods: source.mainGrid.periods.map(({ label, rows }) => ({
        label,
        courseIds: rows.flatMap(({ sourceIds }) => sourceIds),
      })),
    },
    ...source.suggestedGuides.map(guideTrajectory),
  ];

  return {
    reviewedAt: source.source.reviewedAt,
    sources: source.source.documents,
    trajectories,
    curriculum: {
      sourceUrl: source.mainGrid.sourceUrl,
      sourceDataPath: "data/fcea/economia-2012-trayectoria.json",
      pathwayLabel: "Recorrido",
      strictOfficialCourseIds: true,
      verifiedCourseIds,
      excludeUnverifiedSnapshotCourses: true,
      mergeSplitCompositionCourses: true,
      courseOverrides,
      progressAliases: source.bedeliasComparison.progressAliases ?? [],
      includeAllCoursesInPathwayCatalog: true,
      periodOrder: source.mainGrid.periods.map(({ label }) => label),
      projectionAnomalies: source.interpretation.creditConflicts.map(({ sourceId, resolution }) => ({
        field: `credits.${sourceId}`,
        resolution,
      })),
      requiredCourseGroups: [{
        id: "economia-obligatorias-fijas",
        label: "Unidades curriculares obligatorias sin alternativas",
        minCompleted: source.interpretation.fixedRequiredSourceIds.length,
        sourceCourseIds: source.interpretation.fixedRequiredSourceIds,
        verifiedSourceCourseIds: source.interpretation.fixedRequiredSourceIds,
        sourceUrl: source.mainGrid.sourceUrl,
      }],
    },
    credentialRequiredCourseGroupIds: {
      "licenciado-economia": ["economia-obligatorias-fijas"],
    },
    additionalAnomalies: source.interpretation.creditConflicts.map(({ sourceId, resolution }) => ({
      field: `credits.${sourceId}`,
      resolution,
    })),
    uiNotice: "Plan 2012 flexible de ocho semestres y 360 créditos en Montevideo. La Currícula reproduce la grilla FCEA actualizada en julio de 2026 y ofrece cuatro guías no certificadas; sus categorías abiertas y alternativas no son obligaciones acumulativas. Cumplí los mínimos por área y 50 créditos de libre distribución.",
    remainingWork: "La oferta opcional puede variar por semestre. Una nueva revisión sólo requiere reconsultar las fuentes si cambia su fecha publicada o alguna huella normalizada.",
  };
}

function fceaEstadistica2014Reconciliation(source) {
  const profileOrder = ["actuarial-demografico", "bioestadistico", "economia", "tecnologico"];
  const requirementPrefix = {
    "actuarial-demografico": "actuarial",
    bioestadistico: "bio",
    economia: "economy",
    tecnologico: "technology",
  };
  const areaSuffix = {
    M: "mathematics",
    IE: "inference",
    I: "instrumental",
    PE: "profile",
    CG: "general",
    AI: "integrative",
  };
  const placementsBySourceId = Map.groupBy(source.profiles.flatMap((profile) => (
    profile.periods.flatMap((period) => period.placements.map((placement) => ({ ...placement, profileId: profile.id })))
  )), ({ sourceId }) => sourceId);
  const requirementIds = (sourceId) => [...new Set((placementsBySourceId.get(sourceId) ?? []).map(({ profileId, area }) => (
    `${requirementPrefix[profileId]}-${areaSuffix[area]}`
  )))];
  const sourceOnly = new Set(source.courses.filter(({ projectionBasis }) => projectionBasis === "source-only").map(({ sourceId }) => sourceId));
  const courseOverrides = Object.fromEntries(source.courses.filter(({ sourceId }) => !sourceOnly.has(sourceId)).map((course) => {
    const [requirementId, ...additionalRequirementIds] = requirementIds(course.sourceId);
    return [course.sourceId, {
      sourceId: course.sourceId,
      name: course.name,
      preserveName: true,
      credits: course.credits,
      requirementId,
      additionalRequirementIds,
    }];
  }));
  const additionalCourses = source.courses.filter(({ sourceId }) => sourceOnly.has(sourceId)).map((course) => {
    const [requirementId, ...additionalRequirementIds] = requirementIds(course.sourceId);
    return {
      id: course.sourceId,
      sourceCourseId: course.sourceId,
      name: course.name,
      credits: course.credits,
      requirementId,
      additionalRequirementIds: [...additionalRequirementIds, "free-distribution"],
    };
  });
  const profilesById = new Map(source.profiles.map((profile) => [profile.id, profile]));
  const trajectories = profileOrder.map((id) => {
    const profile = profilesById.get(id);
    return {
      id,
      label: profile.label,
      description: `Grilla curricular oficial del perfil ${profile.label}; las opciones publicadas son oferta elegible y no obligaciones acumulativas.`,
      credentialId: profile.credentialId,
      useOnlyConfiguredPeriods: true,
      periods: profile.periods.map(({ label, courseIds }) => ({ label, courseIds })),
      sourceUrl: source.source.documents[0].url,
    };
  });
  const minimumCreditsByArea = source.interpretation.minimumCreditsByArea;
  const credentials = profileOrder.map((id) => ({
    id,
    title: source.interpretation.title,
    minTotalCredits: source.interpretation.minimumCredits,
    nodeRequirements: Object.entries(areaSuffix).map(([area, suffix]) => ({
      nodeId: `${requirementPrefix[id]}-${suffix}`,
      minCredits: minimumCreditsByArea[area],
    })).concat({ nodeId: "free-distribution", minCredits: minimumCreditsByArea.freeDistribution }),
    requiredCourseGroupIds: [],
  }));
  const discrepancies = source.interpretation.discrepancies.map(({ field, resolution }) => ({ field, resolution }));

  return {
    reviewedAt: source.source.reviewedAt,
    sources: source.source.documents.map(({ url, authority, role }) => ({ url, authority, supports: [role] })),
    trajectories,
    curriculum: {
      sourceUrl: source.source.documents[0].url,
      sourceDataPath: "data/fcea/estadistica-2014-trayectorias.json",
      pathwayLabel: "Perfil",
      strictOfficialCourseIds: true,
      verifiedCourseIds: source.courses.filter(({ sourceId }) => !sourceOnly.has(sourceId)).map(({ sourceId }) => sourceId),
      excludeUnverifiedSnapshotCourses: true,
      courseOverrides,
      additionalCourses,
      credentials,
      includeAllCoursesInPathwayCatalog: true,
      periodOrder: source.profiles[0].periods.map(({ label }) => label),
      projectionAnomalies: discrepancies,
    },
    additionalAnomalies: discrepancies,
    uiNotice: "Plan 2014 flexible de ocho semestres y 360 créditos en Montevideo. Elegí uno de los cuatro perfiles del mismo título; cada grilla separa obligatorias y opciones, y el egreso exige los mínimos por área más 70 créditos de libre distribución.",
    remainingWork: "La oferta opcional puede variar y la Comisión de Carrera supervisa cada trayecto individual. Una nueva revisión sólo requiere reconsultar las fuentes si cambia la actualización publicada o la huella normalizada.",
  };
}

function fceaEconomiaAgricola2022Reconciliation(source) {
  const rows = source.grid.periods.flatMap(({ label, rows: periodRows }) => (
    periodRows.map((row) => ({ ...row, periodLabel: label }))
  ));
  const sourceOnly = new Set(["FCEA-I111N", "PRACTICA-LEAGA"]);
  const isPrincipalFor = (row, mentionId) => row.inclusion === "principal" && row.mentionIds.includes(mentionId);
  const requirementIds = (row) => {
    switch (row.area) {
      case "A":
        return [
          isPrincipalFor(row, "mencion-en-investigacion") ? "research-administration-required" : "research-administration-optional",
          isPrincipalFor(row, "mencion-profesional") ? "professional-administration-required" : "professional-administration-optional",
        ];
      case "C":
        return [
          "research-accounting",
          isPrincipalFor(row, "mencion-profesional") ? "professional-accounting-required" : "professional-accounting-optional",
        ];
      case "E":
        return [
          isPrincipalFor(row, "mencion-en-investigacion") ? "research-economics-required" : "research-economics-optional",
          isPrincipalFor(row, "mencion-profesional") ? "professional-economics-required" : "professional-economics-optional",
        ];
      case "MC":
        return [
          isPrincipalFor(row, "mencion-en-investigacion") ? "research-quantitative-required" : "research-quantitative",
          "professional-quantitative",
        ];
      case "I":
        return ["research-integrative", "professional-integrative"];
      case "S":
        return ["research-social", "professional-social"];
      case "J":
        return ["research-free-choice", "professional-free-choice"];
      default:
        throw new Error(`Área curricular desconocida en ${row.sourceId}: ${row.area}.`);
    }
  };
  const courseOverrides = Object.fromEntries(rows.filter(({ sourceId }) => !sourceOnly.has(sourceId)).map((row) => {
    const [requirementId, ...additionalRequirementIds] = requirementIds(row);
    return [row.sourceId, {
      sourceId: row.sourceId,
      name: row.name,
      preserveName: true,
      credits: row.credits,
      requirementId,
      additionalRequirementIds,
      ...(row.sourceId === "EGAF2" ? {
        creditSourceUrl: source.source.documents.find(({ url }) => url.includes("EGAF2_2026"))?.url,
        creditConflict: {
          status: "official-source-conflict-unresolved",
          selectedCredits: row.linkedCourseSheetCredits,
          selectedSource: "ficha institucional vigente de la unidad curricular",
          gridCredits: row.gridPrintedCredits,
          gridSourceUrl: source.grid.sourceUrl,
          notice: "La ficha institucional vigente publica 4 créditos y la grilla vigente imprime 5; no existe prioridad normativa documentada entre ambas fuentes.",
        },
      } : {}),
    }];
  }));
  const additionalCourses = rows.filter(({ sourceId }) => sourceOnly.has(sourceId)).map((row) => {
    const [requirementId, ...additionalRequirementIds] = requirementIds(row);
    return {
      id: row.sourceId,
      sourceCourseId: row.sourceId,
      name: row.name,
      credits: row.credits ?? 0,
      requirementId,
      additionalRequirementIds,
      sourceUrl: source.grid.sourceUrl,
    };
  });
  const trajectories = source.trajectories.map((trajectory) => ({
    ...trajectory,
    description: source.mentions.find(({ id }) => id === trajectory.id)?.description,
    useOnlyConfiguredPeriods: true,
    sourceUrl: source.grid.sourceUrl,
  }));
  const credentials = [
    { id: "degree-research", requirements: source.requirements.research },
    { id: "degree-professional", requirements: source.requirements.professional },
  ].map(({ id, requirements }) => ({
    id,
    title: source.interpretation.title,
    minTotalCredits: source.interpretation.minimumCredits,
    nodeRequirements: requirements,
    requiredCourseGroupIds: [],
  }));
  const discrepancies = source.interpretation.discrepancies.map(({ field, resolution }) => ({ field, resolution }));

  return {
    reviewedAt: source.source.reviewedAt,
    sources: source.source.documents.map(({ url, authority, role }) => ({ url, authority, supports: [role] })),
    trajectories,
    curriculum: {
      sourceUrl: source.grid.sourceUrl,
      sourceDataPath: "data/fcea/economia-agricola-2022-trayectorias.json",
      pathwayLabel: "Mención",
      strictOfficialCourseIds: true,
      verifiedCourseIds: rows.filter(({ sourceId }) => !sourceOnly.has(sourceId)).map(({ sourceId }) => sourceId),
      excludeUnverifiedSnapshotCourses: true,
      courseOverrides,
      additionalCourses,
      credentials,
      includeAllCoursesInPathwayCatalog: true,
      periodOrder: source.grid.periods.map(({ label }) => label),
      projectionAnomalies: discrepancies,
    },
    additionalAnomalies: discrepancies,
    uiNotice: "Plan 2022 de 360 créditos en Tacuarembó. Elegí una de las dos menciones acreditadas del mismo título; Cálculo I se cursa como MC10 o como 114A más 128A. Las opciones de la grilla no son obligaciones acumulativas. EGAF2 figura con 4 cr. en su ficha 2026 y con 5 cr. en la grilla; la contradicción oficial sigue abierta.",
    remainingWork: "La oferta opcional puede variar por edición. I111N permanece separado del histórico I71 porque no se publicó una equivalencia, y el conflicto de EGAF2 entre 5 créditos en la grilla y 4 en su ficha sigue sin prioridad normativa documentada.",
  };
}

function cenurlnBiologiaBioquimica2016Reconciliation(source) {
  const curriculumSource = source.sources.find(({ id }) => id === "dcb-teaching-page");
  const bedeliasSource = source.sources.find(({ id }) => id === "bedelias-snapshot");
  const sourceUrl = curriculumSource?.url;
  const pathRequirementMap = Object.fromEntries(source.requirements.map((requirement) => [
    requirement.sourceGroupCode,
    requirement.id,
  ]));
  return {
    reviewedAt: source.reviewedAt,
    sources: source.sources.map((entry) => ({
      url: entry.url,
      authority: entry.authority,
      supports: entry.supports,
      ...(entry.contentHash ? { contentHash: entry.contentHash } : {}),
    })),
    trajectories: source.trajectories.map((trajectory) => ({
      ...trajectory,
      sourceUrl,
      catalogSourceCourseIds: [],
    })),
    curriculum: {
      sourceUrl,
      useBedeliasCompositionTree: true,
      preserveBedeliasCourseIds: true,
      usePublishedCredits: true,
      strictOfficialCourseIds: true,
      includeAllCoursesInPathwayCatalog: false,
      pathRequirementMap,
      courseOverrides: Object.fromEntries(source.rows.map((row) => [row.sourceCourseId, {
        name: row.officialLabel,
        preserveName: true,
        officialIdentity: true,
        officialCredits: false,
        creditSourceUrl: bedeliasSource?.url,
      }])),
      periodOrder: source.trajectories[0].periods.map(({ label }) => label),
      pathwayLabel: "Currícula",
      pathwayDescription: "La currícula publicada distribuye ocho unidades en dos semestres y se comparte entre Salto y Paysandú.",
      creditRequirements: source.requirements.map((requirement) => ({
        id: requirement.id,
        name: requirement.name,
        shortName: requirement.shortName,
        minCredits: requirement.minCredits,
      })),
      projectionAnomalies: [{
        field: "formacion-metodologica-general-maxCredits",
        resolution: "La fuente publica un máximo de 20 créditos para Formación Metodológica y General; el modelo controla el mínimo de 5 y conserva el máximo como límite documental no automatizado.",
      }],
    },
    uiNotice: "Ciclo completo de 90 créditos compartido por Salto y Paysandú. La currícula publicada distribuye ocho unidades en dos semestres; las demás entradas acreditables de Bedelías permanecen fuera del catálogo visible porque no demuestran inclusión curricular vigente.",
    remainingWork: "Revisar nuevamente si el Departamento publica otra currícula o modifica los máximos de área; las continuaciones posteriores no forman parte de este plan.",
    additionalAnomalies: [{
      field: "curriculumAuthority",
      resolution: "Los ocho nombres y sus semestres provienen del Departamento de Ciencias Biológicas; Bedelías sólo contrasta códigos, créditos, áreas y previaturas.",
    }],
  };
}

function cenurlnCicloInicialMatematica2012Reconciliation(source) {
  const curriculumSource = source.sources.find(({ id }) => id === "impo-plan-2012");
  const sourceUrl = curriculumSource?.url;
  const pathRequirementMap = Object.fromEntries(source.requirements.map((requirement) => [
    requirement.sourceGroupCode,
    requirement.id,
  ]));
  return {
    reviewedAt: source.reviewedAt,
    officialPlan: {
      durationMonths: source.publication.ownDurationMonths,
      minimumCredits: source.publication.minimumCredits,
      current: source.publication.currentAtReview,
      creditComputationCoverage: source.creditComputationCoverage,
    },
    sources: source.sources.map((entry) => ({
      url: entry.url,
      authority: entry.authority,
      supports: entry.supports,
      ...(entry.contentHash ? { contentHash: entry.contentHash } : {}),
    })),
    trajectories: [{
      ...source.fallbackPathway,
      sourceUrl,
      catalogSourceCourseIds: [],
      restrictGeneratedCatalogToPublished: true,
    }],
    curriculum: {
      sourceUrl,
      sourceDataPath: "data/cenurln/ciclo-inicial-matematica-2012.json",
      useBedeliasCompositionTree: true,
      preserveBedeliasCourseIds: true,
      usePublishedCredits: true,
      strictOfficialCourseIds: true,
      includeAllCoursesInPathwayCatalog: false,
      pathRequirementMap,
      courseOverrides: Object.fromEntries(source.rows.map((row) => [row.sourceCourseId, {
        name: row.officialLabel,
        preserveName: true,
        officialIdentity: true,
        officialCredits: true,
        credits: row.credits,
        requirementId: row.requirementId,
        creditSourceUrl: source.sources.find(({ id }) => id === row.creditsSourceId)?.url ?? sourceUrl,
        ...(row.conflict ? { creditConflict: row.conflict } : {}),
      }])),
      additionalCourses: source.officialSourceOnlyOptions.map((option) => ({
        id: option.identityKey,
        name: option.officialLabel,
        elective: true,
        creditsPublished: false,
        officialCredits: false,
        creditsProvenance: "official-source-no-load",
        catalogRole: "official-plan-example-option",
        availabilityStatus: "not-asserted-by-plan",
        requirementId: "plan-total",
        periodLabel: source.fallbackPathway.periods[1].label,
        sourceUrl,
      })),
      periodOrder: source.fallbackPathway.periods.map(({ label }) => label),
      pathwayLabel: source.fallbackPathway.label,
      pathwayDescription: source.fallbackPathway.description,
      creditRequirements: source.requirements.map((requirement) => ({
        id: requirement.id,
        name: requirement.name,
        shortName: requirement.shortName,
        minCredits: requirement.minCredits,
      })),
      projectionAnomalies: [
        {
          field: "durationMonths",
          resolution: "El Plan 2012 define un año propio después del CIO-CT; las fichas que indican dos años describen el recorrido acumulado CIO-CT + CIM y no dos años propios del CIM.",
        },
        {
          field: "CIM10.credits",
          resolution: "El Plan y el DMEL publican 12 créditos para Cálculo Vectorial; prevalecen sobre los 10 del snapshot de Bedelías.",
        },
      ],
    },
    uiNotice: "El CIM es un ciclo flexible de un año posterior al CIO-CT; los dos años difundidos corresponden al recorrido acumulado. Sus 160 créditos no se completan con las ocho UC propias cotejadas: incluyen la formación previa reconocida y las opciones del Plan de Formación individual que debe aprobar la Comisión de Carrera. No existe una secuencia semestral oficial. Las 22 opciones del Plan sin código ni carga se muestran como tales y no se equiparan con Bedelías.",
    remainingWork: "Revisar si el CIM publica códigos, cargas o nueva oferta para las 22 opciones del Plan; los semestres y cursos previos del CIO-CT no se incorporan como trayectoria del CIM.",
    additionalAnomalies: [
      {
        field: "trajectoryAuthority",
        resolution: "El Plan 2012 declara una formación amplia y flexible con Plan de Formación individual; la proyección no reutiliza los semestres administrativos de Bedelías como sugerencia institucional.",
      },
      {
        field: "courseAuthority",
        resolution: "Ocho identidades propias del listado CIM tienen correspondencia oficial inequívoca con Bedelías; las otras 21 entradas administrativas permanecen candidatas recuperables. Además se conservan 22 opciones oficiales por su nombre literal, sin código, carga ni equivalencia inferida.",
      },
      {
        field: "catalogCoverage",
        resolution: "El catálogo es parcial: el Plan aprobado enumera 22 ejemplos opcionales, pero no publica sus códigos, créditos ni asignación a mínimos de área. Se muestran con carga no publicada y quedan sujetos al Plan de Formación individual.",
      },
    ],
  };
}

function mergeAuditReconciliation(audit, reconciliation) {
  if (!audit || !reconciliation) return audit;
  const curriculum = {
    ...audit.officialPlan?.curriculum,
    ...reconciliation.curriculum,
  };
  if (reconciliation.additionalCourses) {
    const additionalCourses = new Map((curriculum.additionalCourses ?? []).map((course) => [course.id, course]));
    for (const course of reconciliation.additionalCourses) additionalCourses.set(course.id, course);
    curriculum.additionalCourses = [...additionalCourses.values()];
  }
  if (reconciliation.additionalRequiredCourseGroups) {
    const requiredCourseGroups = new Map((curriculum.requiredCourseGroups ?? []).map((group) => [group.id, group]));
    for (const group of reconciliation.additionalRequiredCourseGroups) requiredCourseGroups.set(group.id, group);
    curriculum.requiredCourseGroups = [...requiredCourseGroups.values()];
  }
  if (reconciliation.credentialRequiredCourseGroupIds) {
    curriculum.credentials = (curriculum.credentials ?? []).map((credential) => ({
      ...credential,
      requiredCourseGroupIds: [...new Set([
        ...(credential.requiredCourseGroupIds ?? []),
        ...(reconciliation.credentialRequiredCourseGroupIds[credential.id] ?? []),
      ])],
    }));
  }
  if (reconciliation.requiredCourseGroupSourceIds) {
    curriculum.requiredCourseGroups = (curriculum.requiredCourseGroups ?? []).map((group) => ({
      ...group,
      sourceCourseIds: [...new Set([
        ...(group.sourceCourseIds ?? []),
        ...(reconciliation.requiredCourseGroupSourceIds[group.id] ?? []),
      ])],
    }));
  }
  const anomalies = new Map((audit.anomalies ?? []).map((anomaly) => [anomaly.field, anomaly]));
  for (const anomaly of reconciliation.additionalAnomalies ?? []) anomalies.set(anomaly.field, anomaly);
  return {
    ...audit,
    reviewedAt: reconciliation.reviewedAt,
    sources: reconciliation.sources ?? audit.sources,
    uiNotice: reconciliation.uiNotice ?? audit.uiNotice,
    anomalies: [...anomalies.values()],
    remainingWork: reconciliation.remainingWork ?? audit.remainingWork,
    officialPlan: {
      ...audit.officialPlan,
      ...reconciliation.officialPlan,
      trajectories: reconciliation.trajectories ?? audit.officialPlan?.trajectories,
      curriculum,
    },
  };
}

export async function buildExtractedAcademicPlans() {
  const queue = await loadJson(path.join(inventoryDirectory, "audit-queue.json"));
  const auditsRegistry = await loadJson(path.join(snapshotDirectory, "audits", "official-source-audits.json"));
  const global = await loadJson(path.join(inventoryDirectory, "global-current.json"));
  const fhceReconciliations = await loadJson(fhceReconciliationsPath);
  const iq2021Reconciliation = await loadJson(iq2021ReconciliationPath);
  const tim2016Reconciliation = await loadJson(tim2016ReconciliationPath);
  const telecom2009Reconciliation = await loadJson(telecom2009ReconciliationPath);
  const naval1997Reconciliation = await loadJson(naval1997ReconciliationPath);
  const industrialMecanica1997Reconciliation = await loadJson(industrialMecanica1997ReconciliationPath);
  const produccion2010Reconciliation = await loadJson(produccion2010ReconciliationPath);
  const sistemasComunicacion2018Reconciliation = await loadJson(sistemasComunicacion2018ReconciliationPath);
  const fceaEconomia2012 = await loadJson(fceaEconomia2012Path);
  const fceaEstadistica2014 = await loadJson(fceaEstadistica2014Path);
  const fceaEconomiaAgricola2022 = await loadJson(fceaEconomiaAgricola2022Path);
  const cenurlnBiologiaBioquimica2016 = await loadJson(cenurlnBiologiaBioquimica2016Path);
  const cenurlnCicloInicialMatematica2012 = await loadJson(cenurlnCicloInicialMatematica2012Path);
  const reconciliationByIdentity = new Map([
    ...fhceReconciliations.plans.map((plan) => [plan.identity, {
      ...plan,
      reviewedAt: plan.reviewedAt ?? fhceReconciliations.reviewedAt,
    }]),
    ...iq2021Reconciliation.plans.map((plan) => [plan.identity, {
      ...plan,
      reviewedAt: plan.reviewedAt ?? iq2021Reconciliation.reviewedAt,
    }]),
    ...tim2016Reconciliation.plans.map((plan) => [plan.identity, {
      ...plan,
      reviewedAt: plan.reviewedAt ?? tim2016Reconciliation.reviewedAt,
    }]),
    ...telecom2009Reconciliation.plans.map((plan) => [plan.identity, {
      ...plan,
      reviewedAt: plan.reviewedAt ?? telecom2009Reconciliation.reviewedAt,
    }]),
    ...naval1997Reconciliation.plans.map((plan) => [plan.identity, {
      ...plan,
      reviewedAt: plan.reviewedAt ?? naval1997Reconciliation.reviewedAt,
    }]),
    ...industrialMecanica1997Reconciliation.plans.map((plan) => [plan.identity, {
      ...plan,
      reviewedAt: plan.reviewedAt ?? industrialMecanica1997Reconciliation.reviewedAt,
    }]),
    ...produccion2010Reconciliation.plans.map((plan) => [plan.identity, {
      ...plan,
      reviewedAt: plan.reviewedAt ?? produccion2010Reconciliation.reviewedAt,
    }]),
    ...sistemasComunicacion2018Reconciliation.plans.map((plan) => [plan.identity, {
      ...plan,
      reviewedAt: plan.reviewedAt ?? sistemasComunicacion2018Reconciliation.reviewedAt,
    }]),
    ["licenciatura en economia:2012", fceaEconomia2012Reconciliation(fceaEconomia2012)],
    ["licenciatura en estadistica:2014", fceaEstadistica2014Reconciliation(fceaEstadistica2014)],
    ["licenciatura en economia agricola y gestion de agronegocios:2022", fceaEconomiaAgricola2022Reconciliation(fceaEconomiaAgricola2022)],
    [cenurlnBiologiaBioquimica2016.auditIdentity, cenurlnBiologiaBioquimica2016Reconciliation(cenurlnBiologiaBioquimica2016)],
    [cenurlnCicloInicialMatematica2012.auditIdentity, cenurlnCicloInicialMatematica2012Reconciliation(cenurlnCicloInicialMatematica2012)],
  ]);
  const audits = new Map(auditsRegistry.audits.map((audit) => [
    audit.identity,
    mergeAuditReconciliation(audit, reconciliationByIdentity.get(audit.identity)),
  ]));
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
      sourceOffers: audit.offerings?.filter((offering) => offering.includeInSharedWith !== false)
        .map((offering) => ({ serviceCode: offering.serviceCode, serviceName: global.services.find((service) => service.code === offering.serviceCode)?.name ?? offering.serviceCode })) ?? [],
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
    projections.push({
      entry,
      item,
      audit,
      reconciliation: reconciliationByIdentity.get(entry.identity) ?? null,
      ...buildProjection(entry, item.snapshot, audit),
    });
  }

  await mkdir(outputDirectory, { recursive: true });
  for (const { planId, projection } of projections) await writeFile(path.join(outputDirectory, `${planId}.json`), `${JSON.stringify(projection)}\n`, "utf8");

  const facultyMap = new Map();
  for (const { entry, planId, projection, audit } of projections) {
    const facultyCode = audit?.officialPlan?.facultyCode ?? entry.canonicalSource.serviceCode;
    const facultyName = audit?.officialPlan?.facultyName ?? entry.canonicalSource.serviceName;
    const careerName = audit?.officialPlan?.careerName ?? entry.career.name;
    const planYear = audit?.officialPlan?.planYear ?? entry.plan.year;
    const catalogFacultyCodes = [facultyCode, ...(audit?.officialPlan?.catalogFacultyCodes ?? [])]
      .filter((code, index, codes) => codes.findIndex((candidate) => normalize(candidate) === normalize(code)) === index);
    for (const catalogFacultyCode of catalogFacultyCodes) {
      const catalogFacultyName = normalize(catalogFacultyCode) === normalize(facultyCode)
        ? facultyName
        : global.services.find((service) => normalize(service.code) === normalize(catalogFacultyCode))?.name ?? catalogFacultyCode;
      const facultyId = `bedelias-${catalogFacultyCode.toLocaleLowerCase()}`;
      if (!facultyMap.has(facultyId)) facultyMap.set(facultyId, { id: facultyId, label: readableFacultyName(catalogFacultyName), careers: new Map() });
      const faculty = facultyMap.get(facultyId);
      const careerId = `${facultyId}-${slug(careerName)}`;
      if (!faculty.careers.has(careerId)) faculty.careers.set(careerId, { id: careerId, label: academicTitle(careerName), plans: [] });
      faculty.careers.get(careerId).plans.push({
        id: planId,
        label: `Plan ${planYear} · ${audit?.officialPlan?.catalogStatusLabel ?? (projection.plan.current === false ? "histórico" : "vigente")}`,
        defaultTrajectoryId: Object.keys(projection.pathways)[0],
        defaultCredentialId: projection.pathways[Object.keys(projection.pathways)[0]]?.credentialId
          ?? projection.creditStructure.credentials.find((credential) => credential.id === "bedelias-degree")?.id
          ?? projection.creditStructure.credentials.at(-1)?.id
          ?? "bedelias-degree",
      });
    }
  }
  const catalog = [...facultyMap.values()].map((faculty) => ({ ...faculty, careers: [...faculty.careers.values()].map((career) => ({ ...career, plans: career.plans.sort((a, b) => b.label.localeCompare(a.label, "es")) })) }));
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  const loaderLines = projections.map(({ planId, projection, audit }) => {
    const progressPlanId = audit?.officialPlan?.progressPlanId;
    return `  ${JSON.stringify(planId)}: {\n    load: () => import(${JSON.stringify(`./bedelias-generated/${planId}.json`)}),\n    pathwayIds: ${JSON.stringify(Object.keys(projection.pathways))},\n    pathwayLabel: ${JSON.stringify(pathwayLabelForAudit(audit))},\n    minCredits: ${projection.plan.minCredits},${progressPlanId ? `\n    progressPlanId: ${JSON.stringify(progressPlanId)},` : ""}\n  },`;
  });
  await writeFile(loadersPath, `// Archivo generado por scripts/build-extracted-academic-plans.mjs.\nexport const extractedAcademicPlanRegistrations = {\n${loaderLines.join("\n")}\n} as const;\n`, "utf8");

  const authorityRecords = (projection) => [
    ...projection.courses.map((course) => ({ status: course.authorityStatus })),
    ...projection.courseAuthority.records,
  ];
  const ruleAuthority = (projection) => {
    const publishedCourseIdentities = new Set(projection.courses
      .filter((course) => course.authorityStatus === "verified")
      .flatMap((course) => [course.id, course.bedeliasCode].filter(Boolean)));
    const visibleTargetRules = projection.rules.filter((rule) => publishedCourseIdentities.has(rule.target.code));
    return {
      retainedRules: projection.rules.length,
      publishedRules: projection.publishedRules.length,
      visibleTargetsWithUnpublishedDependencies: visibleTargetRules
        .filter((rule) => !ruleUsesOnlyPublishedCourseIdentities(rule, publishedCourseIdentities)).length,
    };
  };
  const authorityTotals = Object.fromEntries(COURSE_AUTHORITY_STATUSES.map((status) => [
    status,
    projections.reduce((sum, { projection }) => sum + authorityRecords(projection).filter((record) => record.status === status).length, 0),
  ]));
  const reportCore = {
    schemaVersion: 2,
    generatedFrom: {
      auditQueueHash: queue.contentHash,
      officialAuditHash: auditsRegistry.contentHash,
      globalManifestHash: global.contentHash,
      fhceReconciliationsHash: hash(fhceReconciliations),
      iq2021ReconciliationHash: hash(iq2021Reconciliation),
      tim2016ReconciliationHash: hash(tim2016Reconciliation),
      telecom2009ReconciliationHash: hash(telecom2009Reconciliation),
      naval1997ReconciliationHash: hash(naval1997Reconciliation),
      industrialMecanica1997ReconciliationHash: hash(industrialMecanica1997Reconciliation),
      sistemasComunicacion2018ReconciliationHash: hash(sistemasComunicacion2018Reconciliation),
      fceaEconomia2012ReconciliationHash: hash(fceaEconomia2012),
      fceaEstadistica2014ReconciliationHash: hash(fceaEstadistica2014),
    },
    counts: {
      canonicalCurrentIdentities: queue.counts.canonicalIdentities,
      generatedPlans: projections.length,
      compositionAvailable: projections.filter(({ projection }) => projection.plan.compositionAvailable).length,
      compositionUnavailable: projections.filter(({ projection }) => !projection.plan.compositionAvailable).length,
      plansWithOfficialCampuses: projections.filter(({ projection }) => projection.campuses.length > 1).length,
      excludedFromCurrentUi: auditsRegistry.audits.filter((audit) => audit.conclusion?.excludeFromCurrentUi).length,
      courseAuthority: authorityTotals,
      beforePublishedCourses: projections.reduce((sum, { projection }) => sum + projection.courses.length, 0),
      afterPublishedCourses: authorityTotals.verified,
      beforePublishedRules: projections.reduce((sum, { projection }) => sum + ruleAuthority(projection).retainedRules, 0),
      afterPublishedRules: projections.reduce((sum, { projection }) => sum + ruleAuthority(projection).publishedRules, 0),
      visibleTargetsWithUnpublishedDependencies: projections.reduce((sum, { projection }) => sum + ruleAuthority(projection).visibleTargetsWithUnpublishedDependencies, 0),
      plansWithVerifiedCatalog: projections.filter(({ projection }) => projection.plan.courseCatalogAuditStatus === "verified").length,
      plansWithPartialCatalog: projections.filter(({ projection }) => projection.plan.courseCatalogAuditStatus === "partial").length,
      plansWithStructureOnly: projections.filter(({ projection }) => projection.plan.courseCatalogAuditStatus === "structure-only").length,
    },
    plans: projections.map(({ entry, planId, item, projection, reconciliation }) => ({
      identity: entry.identity,
      planId,
      facultyCode: entry.canonicalSource.serviceCode,
      snapshotPath: path.relative(projectRoot, item.absolutePath).replaceAll("\\", "/"),
      planAuditStatus: projection.plan.planAuditStatus,
      courseCatalogAuditStatus: projection.plan.courseCatalogAuditStatus,
      compositionAvailable: projection.plan.compositionAvailable,
      extractedCompositionAvailable: projection.plan.extractedCompositionAvailable,
      campusIds: projection.campuses.map((campus) => campus.id),
      before: { publishedCourses: projection.courses.length, publishedRules: ruleAuthority(projection).retainedRules },
      after: {
        publishedCourses: authorityRecords(projection).filter((record) => record.status === "verified").length,
        hiddenCourses: authorityRecords(projection).filter((record) => record.status !== "verified").length,
        publishedRules: ruleAuthority(projection).publishedRules,
        rulesWithUnpublishedDependencies: ruleAuthority(projection).visibleTargetsWithUnpublishedDependencies,
      },
      statuses: Object.fromEntries(COURSE_AUTHORITY_STATUSES.map((status) => [
        status,
        authorityRecords(projection).filter((record) => record.status === status).length,
      ])),
      ...(reconciliation ? {
        authorityReconciliation: {
          before: reconciliation.authorityCountsBefore,
          after: Object.fromEntries(COURSE_AUTHORITY_STATUSES.map((status) => [
            status,
            authorityRecords(projection).filter((record) => record.status === status).length,
          ])),
        },
      } : {}),
    })),
  };
  const report = { ...reportCore, contentHash: hash(reportCore) };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const report = await buildExtractedAcademicPlans();
  console.log(`${report.counts.generatedPlans} planes generados: ${report.counts.plansWithVerifiedCatalog} catálogos verificados, ${report.counts.plansWithPartialCatalog} parciales y ${report.counts.plansWithStructureOnly} sólo con estructura.`);
}
