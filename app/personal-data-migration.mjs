import { parsePersonalDataV3, serializePersonalDataV3 } from "./personal-data.mjs";

export const PERSONAL_DATA_STORAGE_KEY = "trayecto-udelar-personal-data-v3";
export const LEGACY_PROGRESS_STORAGE_KEY = "trayecto-udelar-progress-v2";
export const LEGACY_COMPUTATION_PROGRESS_STORAGE_KEY = "trayecto-udelar-demo-v1";
export const LEGACY_PLANNER_STORAGE_KEY = "trayecto-udelar-planner-v1";
export const LEGACY_CURRENT_TERM_STORAGE_KEY = "trayecto-udelar-current-term-v1";
export const LEGACY_ACADEMIC_SELECTION_STORAGE_KEY = "trayecto-udelar-academic-selection-v1";

const PROGRESS_STATUSES = new Set(["pending", "approved", "exonerated"]);
const LOAD_UNITS = new Set(["credits", "hours", "courses"]);

const issue = (path, code, message) => ({ path, code, message });
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value) => typeof value === "string" && value.trim() !== "";

function parseStoredJson(raw, path, issues) {
  if (raw === null || raw === undefined || raw === "") return undefined;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    issues.push(issue(path, "invalid_json", "El dato guardado no contiene JSON válido."));
    return undefined;
  }
}

function normalizeCatalog(catalog, issues) {
  if (!Array.isArray(catalog)) {
    issues.push(issue("$.catalog", "invalid_catalog", "El catálogo académico no está disponible."));
    return [];
  }
  return catalog.filter((entry, index) => {
    const valid = isRecord(entry)
      && nonEmpty(entry.facultyId)
      && nonEmpty(entry.careerId)
      && nonEmpty(entry.planId)
      && nonEmpty(entry.progressPlanId)
      && LOAD_UNITS.has(entry.loadUnit);
    if (!valid) issues.push(issue(`$.catalog[${index}]`, "invalid_catalog_entry", "La identidad académica del catálogo está incompleta."));
    return valid;
  });
}

function descriptorForPlan(catalog, planId) {
  return catalog.find((entry) => entry.planId === planId);
}

function validateOptionalReference(value, allowed, path, issues) {
  if (value === null || value === undefined || value === "") return null;
  if (!nonEmpty(value)) {
    issues.push(issue(path, "invalid_reference", "La referencia debe ser un identificador no vacío."));
    return null;
  }
  if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(value)) {
    issues.push(issue(path, "unknown_reference", "La referencia no existe en el plan académico."));
    return null;
  }
  return value;
}

function resolveSelection(value, catalog, path, issues) {
  if (!isRecord(value) || !nonEmpty(value.planId)) {
    issues.push(issue(path, "invalid_selection", "La selección académica no identifica un plan."));
    return null;
  }
  const descriptor = descriptorForPlan(catalog, value.planId);
  if (!descriptor) {
    issues.push(issue(`${path}.planId`, "unknown_plan", "El plan no existe en el catálogo académico."));
    return null;
  }
  if (nonEmpty(value.facultyId) && value.facultyId !== descriptor.facultyId) {
    issues.push(issue(`${path}.facultyId`, "unknown_reference", "La facultad no corresponde al plan seleccionado."));
    return null;
  }
  if (nonEmpty(value.careerId) && value.careerId !== descriptor.careerId) {
    issues.push(issue(`${path}.careerId`, "unknown_reference", "La carrera no corresponde al plan seleccionado."));
    return null;
  }
  if (nonEmpty(value.progressPlanId) && value.progressPlanId !== descriptor.progressPlanId) {
    issues.push(issue(`${path}.progressPlanId`, "unknown_reference", "El plan de progreso no corresponde al plan seleccionado."));
    return null;
  }
  const trajectoryId = validateOptionalReference(
    value.trajectoryId ?? descriptor.defaultTrajectoryId ?? null,
    descriptor.trajectoryIds,
    `${path}.trajectoryId`,
    issues,
  );
  const credentialId = validateOptionalReference(
    value.credentialId ?? descriptor.defaultCredentialId ?? null,
    descriptor.credentialIds,
    `${path}.credentialId`,
    issues,
  );
  const campusId = validateOptionalReference(value.campusId, descriptor.campusIds, `${path}.campusId`, issues);
  return {
    facultyId: descriptor.facultyId,
    careerId: descriptor.careerId,
    planId: descriptor.planId,
    progressPlanId: descriptor.progressPlanId,
    campusId,
    trajectoryId,
    credentialId,
  };
}

function normalizeStatuses(value, path, issues) {
  if (!isRecord(value)) {
    issues.push(issue(path, "invalid_progress", "El progreso debe ser un objeto por materia."));
    return {};
  }
  const result = {};
  for (const [courseId, status] of Object.entries(value)) {
    if (!nonEmpty(courseId) || !PROGRESS_STATUSES.has(status)) {
      issues.push(issue(`${path}.${courseId}`, "invalid_progress_entry", "La materia o su estado de progreso no son válidos."));
      continue;
    }
    result[courseId] = status;
  }
  return result;
}

function normalizeProgressPlans(value, path, issues) {
  if (value === undefined) return {};
  if (!isRecord(value)) {
    issues.push(issue(path, "invalid_progress", "El progreso guardado debe ser un objeto por plan."));
    return {};
  }
  return Object.fromEntries(Object.entries(value).map(([planId, statuses]) => [
    planId,
    normalizeStatuses(statuses, `${path}.${planId}`, issues),
  ]));
}

function normalizePlannerTransfer(value, path, issues, allowEmpty = false) {
  if (!isRecord(value) || !Array.isArray(value.terms) || (!allowEmpty && value.terms.length === 0)) {
    issues.push(issue(path, "invalid_planner", "La planificación debe contener una colección de semestres."));
    return null;
  }
  const termIds = new Set();
  const courseIds = new Set();
  const terms = [];
  for (const [index, candidate] of value.terms.entries()) {
    if (!isRecord(candidate) || !nonEmpty(candidate.id) || termIds.has(candidate.id) || !nonEmpty(candidate.label) || !Array.isArray(candidate.courseIds)) {
      issues.push(issue(`${path}.terms[${index}]`, "invalid_term", "El semestre tiene un identificador, nombre o materias inválidos."));
      return null;
    }
    const normalizedCourseIds = [];
    for (const [courseIndex, courseId] of candidate.courseIds.entries()) {
      if (!nonEmpty(courseId) || courseIds.has(courseId)) {
        issues.push(issue(`${path}.terms[${index}].courseIds[${courseIndex}]`, "duplicate_or_invalid_course", "La materia es inválida o aparece en más de un semestre."));
        return null;
      }
      courseIds.add(courseId);
      normalizedCourseIds.push(courseId);
    }
    termIds.add(candidate.id);
    terms.push({ id: candidate.id, label: candidate.label, courseIds: normalizedCourseIds });
  }
  const currentTermId = value.currentTermId === null || value.currentTermId === undefined
    ? null
    : nonEmpty(value.currentTermId) && termIds.has(value.currentTermId) ? value.currentTermId : null;
  if (value.currentTermId !== null && value.currentTermId !== undefined && currentTermId === null) {
    issues.push(issue(`${path}.currentTermId`, "missing_reference", "El semestre actual no existe en la planificación."));
  }
  return { terms, currentTermId };
}

function normalizePlannerPlans(value, currentTerms, path, issues) {
  if (value === undefined) return {};
  if (!isRecord(value)) {
    issues.push(issue(path, "invalid_planner", "La planificación guardada debe ser un objeto por plan."));
    return {};
  }
  const result = {};
  for (const [planId, terms] of Object.entries(value)) {
    const transfer = normalizePlannerTransfer(
      { terms, currentTermId: isRecord(currentTerms) ? currentTerms[planId] : null },
      `${path}.${planId}`,
      issues,
      true,
    );
    if (transfer) result[planId] = transfer;
  }
  return result;
}

function isDefaultEmptyPlanner(transfer) {
  return transfer.currentTermId === null
    && transfer.terms.length === 4
    && transfer.terms.every((term, index) => term.id === `term-${index + 1}` && term.label === `Semestre ${index + 1}` && term.courseIds.length === 0);
}

function stableProfileId(selection) {
  return `profile:${encodeURIComponent([
    selection.facultyId,
    selection.careerId,
    selection.planId,
    selection.progressPlanId,
    selection.campusId ?? "",
    selection.trajectoryId ?? "",
    selection.credentialId ?? "",
  ].join("|"))}`;
}

function profileFromLegacy(selection, statuses, planner, timestamp, previousProfile = null) {
  const profileId = previousProfile?.id ?? stableProfileId(selection);
  const previousScenario = previousProfile?.planning?.scenarios?.find((scenario) => scenario.isPrimary)
    ?? previousProfile?.planning?.scenarios?.[0]
    ?? null;
  const hasPlanner = planner !== null;
  const scenarioId = previousScenario?.id ?? `scenario:primary:${profileId}`;
  const rebuiltScenario = hasPlanner ? {
    id: scenarioId,
    name: previousScenario?.name ?? "Plan principal",
    isPrimary: true,
    archived: false,
    createdAt: previousScenario?.createdAt ?? timestamp,
    updatedAt: timestamp,
    currentTermId: planner.currentTermId,
    terms: planner.terms.map((term) => {
      const previousTerm = previousScenario?.terms?.find((candidate) => candidate.id === term.id);
      return {
        id: term.id,
        label: term.label,
        status: term.id === planner.currentTermId
          ? "in-progress"
          : previousTerm?.status === "closed" ? "closed" : "planned",
        startsAt: previousTerm?.startsAt ?? null,
        endsAt: previousTerm?.endsAt ?? null,
        loadTarget: previousTerm?.loadTarget ?? null,
        courseIds: [...term.courseIds],
      };
    }),
  } : null;
  const scenarios = rebuiltScenario
    ? previousProfile?.planning?.scenarios?.length
      ? previousProfile.planning.scenarios.map((scenario) => scenario.id === previousScenario?.id ? rebuiltScenario : scenario)
      : [rebuiltScenario]
    : previousProfile?.planning?.scenarios ?? [];
  return {
    id: profileId,
    selection,
    curriculumRevision: previousProfile?.curriculumRevision ?? null,
    loadUnit: previousProfile?.loadUnit ?? "courses",
    progress: Object.entries(statuses).map(([courseId, status]) => {
      const previousEntry = previousProfile?.progress?.find((entry) => entry.courseId === courseId);
      return { courseId, status, updatedAt: previousEntry?.status === status ? previousEntry.updatedAt : previousProfile ? timestamp : null };
    }),
    planning: {
      activeScenarioId: hasPlanner ? scenarioId : previousProfile?.planning?.activeScenarioId ?? null,
      scenarios,
    },
  };
}

function plannerFromProfile(profile) {
  const scenario = profile.planning.scenarios.find((candidate) => candidate.id === profile.planning.activeScenarioId)
    ?? profile.planning.scenarios.find((candidate) => candidate.isPrimary)
    ?? null;
  if (!scenario) return null;
  return {
    terms: scenario.terms.map((term) => ({ id: term.id, label: term.label, courseIds: [...term.courseIds] })),
    currentTermId: scenario.currentTermId,
  };
}

function equalStatusMaps(left, right) {
  const leftEntries = Object.entries(left).sort(([leftId], [rightId]) => leftId.localeCompare(rightId));
  const rightEntries = Object.entries(right).sort(([leftId], [rightId]) => leftId.localeCompare(rightId));
  return JSON.stringify(leftEntries) === JSON.stringify(rightEntries);
}

export function personalDataToAppState(document, catalog) {
  const parsed = parsePersonalDataV3(document);
  const issues = [];
  const normalizedCatalog = normalizeCatalog(catalog, issues);
  if (!parsed.ok) return { ok: false, issues: parsed.issues };
  const progress = {};
  const plannerPlans = {};
  const currentPlannerTerms = {};
  for (const [index, profile] of parsed.document.profiles.entries()) {
    const selection = resolveSelection(profile.selection, normalizedCatalog, `$.profiles[${index}].selection`, issues);
    if (!selection) continue;
    const descriptor = descriptorForPlan(normalizedCatalog, selection.planId);
    if (descriptor.loadUnit !== profile.loadUnit) {
      issues.push(issue(`$.profiles[${index}].loadUnit`, "load_unit_mismatch", "La unidad de carga no coincide con el plan académico."));
      continue;
    }
    const statuses = Object.fromEntries(profile.progress.map((entry) => [entry.courseId, entry.status]));
    const existing = progress[selection.progressPlanId];
    if (existing && !equalStatusMaps(existing, statuses)) {
      issues.push(issue(`$.profiles[${index}].progress`, "shared_progress_conflict", "Dos perfiles articulados contienen estados de progreso diferentes."));
      continue;
    }
    progress[selection.progressPlanId] = statuses;
    const planner = plannerFromProfile(profile);
    if (planner) {
      plannerPlans[selection.planId] = planner.terms;
      currentPlannerTerms[selection.planId] = planner.currentTermId;
    }
  }
  const activeProfile = parsed.document.profiles.find((profile) => profile.id === parsed.document.activeProfileId) ?? null;
  return issues.length > 0 ? { ok: false, issues } : {
    ok: true,
    document: parsed.document,
    state: {
      progress,
      plannerPlans,
      currentPlannerTerms,
      selection: activeProfile?.selection ?? null,
    },
  };
}

export function migrateLegacyStateToPersonalData(legacy, options) {
  const issues = [];
  const catalog = normalizeCatalog(options?.catalog, issues);
  const timestamp = options?.now;
  const documentId = options?.documentId;
  if (!nonEmpty(timestamp) || !Number.isFinite(Date.parse(timestamp))) issues.push(issue("$.now", "invalid_date", "La fecha de migración debe ser ISO válida."));
  if (!nonEmpty(documentId)) issues.push(issue("$.documentId", "invalid_id", "El documento necesita un identificador estable."));

  const progressPlans = normalizeProgressPlans(legacy?.progressV2, "$.progressV2", issues);
  if (Object.keys(progressPlans).length === 0 && legacy?.progressV1 !== undefined) {
    progressPlans["1997"] = normalizeStatuses(legacy.progressV1, "$.progressV1", issues);
  }
  const plannerPlans = normalizePlannerPlans(legacy?.plannerV1, legacy?.currentTermV1, "$.plannerV1", issues);
  const selected = legacy?.selectionV1 === undefined
    ? null
    : resolveSelection(legacy.selectionV1, catalog, "$.selectionV1", issues);

  const profilePlanIds = new Set();
  if (selected) profilePlanIds.add(selected.planId);
  for (const [planId, planner] of Object.entries(plannerPlans)) {
    if (!isDefaultEmptyPlanner(planner)) profilePlanIds.add(planId);
  }
  for (const [progressPlanId, statuses] of Object.entries(progressPlans)) {
    if (Object.keys(statuses).length === 0) continue;
    const candidates = catalog.filter((entry) => entry.progressPlanId === progressPlanId);
    const chosen = selected?.progressPlanId === progressPlanId
      ? descriptorForPlan(catalog, selected.planId)
      : candidates.find((entry) => entry.planId === progressPlanId) ?? (candidates.length === 1 ? candidates[0] : null);
    if (!chosen) {
      issues.push(issue(`$.progressV2.${progressPlanId}`, "ambiguous_progress_plan", "No se pudo asociar el progreso a una identidad académica única."));
      continue;
    }
    profilePlanIds.add(chosen.planId);
  }

  const profiles = [];
  for (const planId of profilePlanIds) {
    const descriptor = descriptorForPlan(catalog, planId);
    if (!descriptor) {
      issues.push(issue(`$.plannerV1.${planId}`, "unknown_plan", "El plan no existe en el catálogo académico."));
      continue;
    }
    const selection = selected?.planId === planId ? selected : resolveSelection({ planId }, catalog, `$.profiles.${planId}`, issues);
    if (!selection) continue;
    const planner = plannerPlans[planId] ?? null;
    const statuses = progressPlans[descriptor.progressPlanId] ?? {};
    const profile = profileFromLegacy(selection, statuses, planner, timestamp);
    profile.loadUnit = descriptor.loadUnit;
    profiles.push(profile);
  }
  const activeProfile = selected ? profiles.find((profile) => profile.selection.planId === selected.planId) ?? null : null;
  const candidate = {
    format: "trayecto-personal-data",
    formatVersion: 3,
    id: documentId,
    revision: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastModifiedByDeviceId: null,
    activeProfileId: activeProfile?.id ?? null,
    profiles,
  };
  const parsed = parsePersonalDataV3(candidate);
  if (!parsed.ok) return { ok: false, issues: [...issues, ...parsed.issues] };
  return { ok: true, document: parsed.document, issues };
}

export function hydratePersonalData(rawStorage, options) {
  const issues = [];
  const canonicalValue = parseStoredJson(rawStorage?.personalDataV3, "$.personalDataV3", issues);
  if (canonicalValue !== undefined) {
    const parsed = parsePersonalDataV3(canonicalValue);
    if (parsed.ok) {
      const adapted = personalDataToAppState(parsed.document, options?.catalog);
      if (adapted.ok) return { ...adapted, source: "v3", issues, shouldPersist: false, canonicalWriteBlocked: false };
      issues.push(...adapted.issues.map((entry) => ({ ...entry, path: `$.personalDataV3${entry.path.slice(1)}` })));
    } else {
      issues.push(...parsed.issues.map((entry) => ({ ...entry, path: `$.personalDataV3${entry.path.slice(1)}` })));
    }
  }

  const progressV2 = parseStoredJson(rawStorage?.progressV2, "$.progressV2", issues);
  const progressV1 = parseStoredJson(rawStorage?.progressV1, "$.progressV1", issues);
  const plannerV1 = parseStoredJson(rawStorage?.plannerV1, "$.plannerV1", issues);
  const currentTermV1 = parseStoredJson(rawStorage?.currentTermV1, "$.currentTermV1", issues);
  const selectionV1 = parseStoredJson(rawStorage?.selectionV1, "$.selectionV1", issues);
  const migrated = migrateLegacyStateToPersonalData(
    { progressV2, progressV1, plannerV1, currentTermV1, selectionV1 },
    options,
  );
  if (!migrated.ok) return { ok: false, issues: [...issues, ...migrated.issues], source: "legacy" };
  const adapted = personalDataToAppState(migrated.document, options?.catalog);
  if (!adapted.ok) return { ok: false, issues: [...issues, ...migrated.issues, ...adapted.issues], source: "legacy" };
  const canonicalWasPresent = rawStorage?.personalDataV3 !== null && rawStorage?.personalDataV3 !== undefined;
  return {
    ...adapted,
    source: "legacy",
    issues: [...issues, ...migrated.issues],
    shouldPersist: !canonicalWasPresent,
    canonicalWriteBlocked: canonicalWasPresent,
  };
}

export function appStateToPersonalData(state, options) {
  const issues = [];
  const catalog = normalizeCatalog(options?.catalog, issues);
  const previous = options?.previousDocument ? parsePersonalDataV3(options.previousDocument) : null;
  if (previous && !previous.ok) return { ok: false, issues: previous.issues };
  const timestamp = options?.now;
  if (!nonEmpty(timestamp) || !Number.isFinite(Date.parse(timestamp))) return { ok: false, issues: [issue("$.now", "invalid_date", "La fecha de guardado debe ser ISO válida.")] };
  const previousDocument = previous?.ok ? previous.document : null;
  if (previousDocument) {
    const previousState = personalDataToAppState(previousDocument, catalog);
    if (previousState.ok && personalDataStateFingerprint(previousState.state) === personalDataStateFingerprint(state)) {
      return { ok: true, document: previousDocument, issues: [] };
    }
  }
  const legacyResult = migrateLegacyStateToPersonalData({
    progressV2: state?.progress,
    plannerV1: state?.plannerPlans,
    currentTermV1: state?.currentPlannerTerms,
    selectionV1: state?.selection,
  }, {
    catalog,
    now: timestamp,
    documentId: previousDocument?.id ?? options?.documentId,
  });
  if (!legacyResult.ok) return legacyResult;
  const migratedByPlan = new Map(legacyResult.document.profiles.map((profile) => [profile.selection.planId, profile]));
  const orderedPlanIds = [
    ...(previousDocument?.profiles.map((profile) => profile.selection.planId) ?? []),
    ...legacyResult.document.profiles.map((profile) => profile.selection.planId),
  ].filter((planId, index, all) => all.indexOf(planId) === index);
  const previousByPlan = new Map(previousDocument?.profiles.map((profile) => [profile.selection.planId, profile]) ?? []);
  const profiles = orderedPlanIds.map((planId) => {
    const previousProfile = previousByPlan.get(planId) ?? null;
    const migratedProfile = migratedByPlan.get(planId) ?? null;
    const descriptor = descriptorForPlan(catalog, planId);
    const currentStatuses = descriptor && Object.hasOwn(state?.progress ?? {}, descriptor.progressPlanId)
      ? state.progress[descriptor.progressPlanId]
      : null;
    const currentTerms = Object.hasOwn(state?.plannerPlans ?? {}, planId) ? state.plannerPlans[planId] : null;
    const currentPlanner = currentTerms ? {
      terms: currentTerms,
      currentTermId: state.currentPlannerTerms?.[planId] ?? null,
    } : null;
    const base = migratedProfile ?? previousProfile;
    if (!base) return null;
    const rebuilt = profileFromLegacy(
      base.selection,
      currentStatuses ?? Object.fromEntries(base.progress.map((entry) => [entry.courseId, entry.status])),
      currentPlanner && (!isDefaultEmptyPlanner(currentPlanner) || previousProfile?.planning.scenarios.length)
        ? currentPlanner
        : plannerFromProfile(base),
      timestamp,
      previousProfile,
    );
    rebuilt.loadUnit = base.loadUnit;
    return rebuilt;
  }).filter(Boolean);
  const candidate = {
    ...legacyResult.document,
    id: previousDocument?.id ?? legacyResult.document.id,
    revision: (previousDocument?.revision ?? -1) + 1,
    createdAt: previousDocument?.createdAt ?? timestamp,
    updatedAt: timestamp,
    lastModifiedByDeviceId: previousDocument?.lastModifiedByDeviceId ?? null,
    activeProfileId: profiles.find((profile) => profile.selection.planId === state?.selection?.planId)?.id ?? null,
    profiles,
  };
  const parsed = parsePersonalDataV3(candidate);
  return parsed.ok ? { ok: true, document: parsed.document, issues: legacyResult.issues } : parsed;
}

export function parseCompleteTransfer(value, options) {
  const direct = parsePersonalDataV3(value);
  if (direct.ok) {
    const adapted = personalDataToAppState(direct.document, options?.catalog);
    return adapted.ok ? { ok: true, document: direct.document, state: adapted.state, sourceVersion: 3, issues: [] } : adapted;
  }
  if (!isRecord(value) || value.scope === "planner") {
    return { ok: false, issues: [issue("$", "unknown_format", "El archivo no contiene una exportación completa de Trayecto.")] };
  }
  const supportedVersion = value.formatVersion === undefined || value.formatVersion === 1 || value.formatVersion === 2;
  if (!supportedVersion) return { ok: false, issues: [issue("$.formatVersion", "unsupported_version", "La versión del archivo no es compatible.")] };
  if (value.scope !== undefined && value.scope !== "all") return { ok: false, issues: [issue("$.scope", "unknown_format", "El archivo no contiene una exportación completa de Trayecto.")] };
  if (!isRecord(value.statuses)) return { ok: false, issues: [issue("$.statuses", "invalid_progress", "El archivo no contiene progreso por materia.")] };
  const transferCatalog = Array.isArray(options?.catalog) ? options.catalog : [];
  const transferDescriptor = transferCatalog.find((entry) => entry.planId === value.plan);
  if (!transferDescriptor) return { ok: false, issues: [issue("$.plan", "unknown_plan", "El plan no existe en el catálogo académico.")] };
  const migrated = migrateLegacyStateToPersonalData({
    progressV2: { [transferDescriptor.progressPlanId]: value.statuses },
    plannerV1: value.planner === undefined ? undefined : { [value.plan]: value.planner.terms },
    currentTermV1: value.planner === undefined ? undefined : { [value.plan]: value.planner.currentTermId ?? null },
    selectionV1: {
      facultyId: value.facultyId,
      careerId: value.career,
      planId: value.plan,
      trajectoryId: value.trajectory,
      campusId: value.campusId,
      credentialId: value.credentialId,
    },
  }, options);
  if (!migrated.ok) return migrated;
  const adapted = personalDataToAppState(migrated.document, options?.catalog);
  return adapted.ok ? {
    ok: true,
    document: migrated.document,
    state: adapted.state,
    sourceVersion: value.formatVersion ?? 1,
    issues: migrated.issues,
  } : adapted;
}

export function parsePlannerTransferFile(value, options) {
  if (isRecord(value) && value.scope === "planner") {
    if (value.formatVersion !== 1) return { ok: false, issues: [issue("$.formatVersion", "unsupported_version", "La versión del planificador no es compatible.")] };
    if (value.plan !== options?.planId) return { ok: false, issues: [issue("$.plan", "different_plan", "La planificación corresponde a otro plan.")] };
    const issues = [];
    const planner = normalizePlannerTransfer(value.planner, "$.planner", issues);
    return planner && issues.length === 0 ? { ok: true, planner, sourceVersion: 1, issues } : { ok: false, issues };
  }
  const complete = parseCompleteTransfer(value, options);
  if (!complete.ok) return complete;
  const profile = complete.document.profiles.find((candidate) => candidate.selection.planId === options?.planId);
  if (!profile) return { ok: false, issues: [issue("$.profiles", "different_plan", "La exportación no contiene el plan seleccionado.")] };
  const planner = plannerFromProfile(profile);
  return planner ? { ok: true, planner, sourceVersion: complete.sourceVersion, issues: complete.issues } : {
    ok: false,
    issues: [issue("$.profiles", "missing_planner", "La exportación no contiene planificación para el plan seleccionado.")],
  };
}

export function serializePersonalDataForStorage(document) {
  return serializePersonalDataV3(document);
}

export function personalDataStateFingerprint(state) {
  const progress = Object.fromEntries(Object.entries(state.progress ?? {}).filter(([, statuses]) => isRecord(statuses) && Object.keys(statuses).length > 0));
  const plannerPlans = {};
  const currentPlannerTerms = {};
  for (const [planId, terms] of Object.entries(state.plannerPlans ?? {})) {
    const transfer = { terms, currentTermId: state.currentPlannerTerms?.[planId] ?? null };
    if (!Array.isArray(terms) || isDefaultEmptyPlanner(transfer)) continue;
    plannerPlans[planId] = terms;
    currentPlannerTerms[planId] = transfer.currentTermId;
  }
  return JSON.stringify({
    progress,
    plannerPlans,
    currentPlannerTerms,
    selection: state.selection,
  });
}
