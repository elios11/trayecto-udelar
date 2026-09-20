const LOAD_UNITS = new Set(["credits", "hours", "courses"]);
export const SCENARIO_NAME_MAX_LENGTH = 80;

const clone = (value) => structuredClone(value);
const ok = (planning, extra = {}) => ({ ok: true, planning, ...extra });
const error = (code, message) => ({ ok: false, code, message });
const nonEmpty = (value) => typeof value === "string" && value.trim() !== "";

function validTimestamp(value) {
  return nonEmpty(value) && Number.isFinite(Date.parse(value));
}

function normalizeName(value) {
  if (typeof value !== "string") return error("invalid_name", "El nombre del escenario debe ser texto.");
  const name = value.trim();
  if (!name) return error("empty_name", "El nombre del escenario no puede quedar vacío.");
  if (name.length > SCENARIO_NAME_MAX_LENGTH) return error("name_too_long", `El nombre puede tener hasta ${SCENARIO_NAME_MAX_LENGTH} caracteres.`);
  return { ok: true, name };
}

function dependencies(options) {
  if (typeof options?.idGenerator !== "function") return error("missing_id_generator", "No hay un generador de identificadores disponible.");
  if (!validTimestamp(options?.now)) return error("invalid_time", "La fecha de la operación no es válida.");
  return { ok: true, now: new Date(options.now).toISOString(), idGenerator: options.idGenerator };
}

function allIds(planning) {
  return new Set((planning?.scenarios ?? []).flatMap((scenario) => [scenario.id, ...(scenario.terms ?? []).map((term) => term.id)]));
}

function freshId(used, generate, kind) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = generate(kind);
    if (nonEmpty(candidate) && !used.has(candidate.trim())) {
      const id = candidate.trim();
      used.add(id);
      return id;
    }
  }
  return null;
}

function scenarioById(planning, scenarioId) {
  return planning?.scenarios?.find((scenario) => scenario.id === scenarioId) ?? null;
}

export function suggestScenarioCopyName(name, scenarios) {
  const base = nonEmpty(name) ? name.trim() : "Escenario";
  const existing = new Set((scenarios ?? []).map((scenario) => scenario.name));
  const candidate = (prefix) => `${prefix}${base.slice(0, Math.max(1, SCENARIO_NAME_MAX_LENGTH - prefix.length))}`;
  const first = candidate("Copia de ");
  if (!existing.has(first)) return first;
  let ordinal = 2;
  while (existing.has(candidate(`Copia ${ordinal} de `))) ordinal += 1;
  return candidate(`Copia ${ordinal} de `);
}

export function createPlanningScenario(planning, options) {
  const deps = dependencies(options);
  if (!deps.ok) return deps;
  const named = normalizeName(options?.name ?? "Nuevo escenario");
  if (!named.ok) return named;
  const next = clone(planning ?? { activeScenarioId: null, scenarios: [] });
  const used = allIds(next);
  const scenarioId = freshId(used, deps.idGenerator, "scenario");
  const termId = freshId(used, deps.idGenerator, "term");
  if (!scenarioId || !termId) return error("id_collision", "No se pudo crear una identidad única para el escenario.");
  const first = next.scenarios.length === 0;
  const scenario = {
    id: scenarioId,
    name: named.name,
    isPrimary: first,
    archived: false,
    createdAt: deps.now,
    updatedAt: deps.now,
    currentTermId: null,
    terms: [{ id: termId, label: "Semestre 1", status: "planned", startsAt: null, endsAt: null, loadTarget: null, courseIds: [] }],
  };
  next.scenarios.push(scenario);
  if (first || options?.activate === true) next.activeScenarioId = scenarioId;
  return ok(next, { scenario });
}

export function duplicatePlanningScenario(planning, sourceScenarioId, options) {
  const deps = dependencies(options);
  if (!deps.ok) return deps;
  const source = scenarioById(planning, sourceScenarioId);
  if (!source) return error("scenario_not_found", "El escenario que querés duplicar no existe.");
  const named = normalizeName(options?.name ?? suggestScenarioCopyName(source.name, planning.scenarios));
  if (!named.ok) return named;
  const next = clone(planning);
  const used = allIds(next);
  const scenarioId = freshId(used, deps.idGenerator, "scenario");
  if (!scenarioId) return error("id_collision", "No se pudo crear una identidad única para la copia.");
  const terms = [];
  for (const sourceTerm of source.terms) {
    const termId = freshId(used, deps.idGenerator, "term");
    if (!termId) return error("id_collision", "No se pudieron crear identidades únicas para los semestres copiados.");
    terms.push({ ...clone(sourceTerm), id: termId });
  }
  const currentIndex = source.terms.findIndex((term) => term.id === source.currentTermId);
  const scenario = {
    ...clone(source),
    id: scenarioId,
    name: named.name,
    isPrimary: false,
    archived: false,
    createdAt: deps.now,
    updatedAt: deps.now,
    currentTermId: currentIndex >= 0 ? terms[currentIndex].id : null,
    terms,
  };
  next.scenarios.push(scenario);
  if (options?.activate === true) next.activeScenarioId = scenarioId;
  return ok(next, { scenario });
}

export function renamePlanningScenario(planning, scenarioId, name, options = {}) {
  const named = normalizeName(name);
  if (!named.ok) return named;
  if (!validTimestamp(options.now)) return error("invalid_time", "La fecha de la operación no es válida.");
  if (!scenarioById(planning, scenarioId)) return error("scenario_not_found", "El escenario que querés renombrar no existe.");
  const next = clone(planning);
  const scenario = scenarioById(next, scenarioId);
  scenario.name = named.name;
  scenario.updatedAt = new Date(options.now).toISOString();
  return ok(next, { scenario });
}

export function activatePlanningScenario(planning, scenarioId) {
  const scenario = scenarioById(planning, scenarioId);
  if (!scenario) return error("scenario_not_found", "El escenario que querés abrir no existe.");
  if (scenario.archived) return error("scenario_archived", "Restaurá el escenario antes de abrirlo.");
  const next = clone(planning);
  next.activeScenarioId = scenarioId;
  return ok(next, { scenario: scenarioById(next, scenarioId) });
}

export function promotePlanningScenario(planning, scenarioId, options = {}) {
  if (!validTimestamp(options.now)) return error("invalid_time", "La fecha de la operación no es válida.");
  if (!scenarioById(planning, scenarioId)) return error("scenario_not_found", "El escenario que querés hacer principal no existe.");
  const next = clone(planning);
  const timestamp = new Date(options.now).toISOString();
  next.scenarios = next.scenarios.map((scenario) => ({
    ...scenario,
    isPrimary: scenario.id === scenarioId,
    archived: scenario.id === scenarioId ? false : scenario.archived,
    updatedAt: scenario.id === scenarioId ? timestamp : scenario.updatedAt,
  }));
  return ok(next, { scenario: scenarioById(next, scenarioId) });
}

export function archivePlanningScenario(planning, scenarioId, options = {}) {
  if (!validTimestamp(options.now)) return error("invalid_time", "La fecha de la operación no es válida.");
  const existing = scenarioById(planning, scenarioId);
  if (!existing) return error("scenario_not_found", "El escenario que querés archivar no existe.");
  if (existing.isPrimary) return error("primary_scenario", "Elegí otro escenario principal antes de archivar este.");
  if (planning.activeScenarioId === scenarioId) return error("active_scenario", "Cambiá a otro escenario antes de archivar este.");
  const next = clone(planning);
  const scenario = scenarioById(next, scenarioId);
  scenario.archived = true;
  scenario.updatedAt = new Date(options.now).toISOString();
  return ok(next, { scenario });
}

export function restorePlanningScenario(planning, scenarioId, options = {}) {
  if (!validTimestamp(options.now)) return error("invalid_time", "La fecha de la operación no es válida.");
  if (!scenarioById(planning, scenarioId)) return error("scenario_not_found", "El escenario que querés restaurar no existe.");
  const next = clone(planning);
  const scenario = scenarioById(next, scenarioId);
  scenario.archived = false;
  scenario.updatedAt = new Date(options.now).toISOString();
  return ok(next, { scenario });
}

export function replaceActiveScenarioPlanning(planning, planner, options = {}) {
  if (!validTimestamp(options.now)) return error("invalid_time", "La fecha de la operación no es válida.");
  const existing = scenarioById(planning, planning?.activeScenarioId);
  if (!existing) return error("missing_active_scenario", "No hay un escenario activo para importar la planificación.");
  if (!Array.isArray(planner?.terms) || planner.terms.length === 0) return error("invalid_planner", "La planificación importada debe tener al menos un semestre.");
  const next = clone(planning);
  const scenario = scenarioById(next, next.activeScenarioId);
  scenario.terms = planner.terms.map((term) => ({
    ...(term.extensions ? { extensions: clone(term.extensions) } : {}),
    id: term.id,
    label: term.label,
    status: term.id === planner.currentTermId ? "in-progress" : "planned",
    startsAt: term.startsAt ?? null,
    endsAt: term.endsAt ?? null,
    loadTarget: term.loadTarget ?? null,
    courseIds: [...term.courseIds],
  }));
  scenario.currentTermId = planner.currentTermId;
  scenario.updatedAt = new Date(options.now).toISOString();
  return ok(next, { scenario });
}

function locations(scenario) {
  const result = new Map();
  scenario.terms.forEach((term, index) => {
    term.courseIds.forEach((courseId) => {
      const entries = result.get(courseId) ?? [];
      entries.push({ termId: term.id, label: term.label, index, startsAt: term.startsAt ?? null, endsAt: term.endsAt ?? null });
      result.set(courseId, entries);
    });
  });
  return result;
}

function periodIdentity(location) {
  return location.startsAt && location.endsAt ? `${location.startsAt}|${location.endsAt}` : null;
}

function scenarioLoad(scenario, courses, unit) {
  const byId = courses instanceof Map ? courses : new Map((courses ?? []).map((course) => [course.id, course]));
  const perTerm = scenario.terms.map((term) => {
    let value = 0;
    const missingCourseIds = [];
    const missingValueCourseIds = [];
    for (const courseId of term.courseIds) {
      const course = byId.get(courseId);
      if (unit === "courses") {
        value += 1;
      } else if (!course) {
        missingCourseIds.push(courseId);
      } else {
        const amount = unit === "credits" ? course.credits : course.hours;
        if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) value += amount;
        else missingValueCourseIds.push(courseId);
      }
    }
    const partial = missingCourseIds.length > 0 || missingValueCourseIds.length > 0;
    const target = term.loadTarget?.unit === unit ? term.loadTarget : null;
    const difference = target && !partial ? value - target.value : null;
    const targetStatus = !target ? "none" : partial ? "partial" : difference > 0 ? "exceeded" : difference === 0 ? "met" : "below";
    return { termId: term.id, label: term.label, value, partial, missingCourseIds, missingValueCourseIds, target, targetStatus, difference };
  });
  return { unit, value: perTerm.reduce((sum, term) => sum + term.value, 0), partial: perTerm.some((term) => term.partial), perTerm };
}

export function comparePlanningScenarios(left, right, options = {}) {
  if (!left || !right) return error("scenario_not_found", "Se necesitan dos escenarios para comparar.");
  const unit = options.unit ?? "courses";
  if (!LOAD_UNITS.has(unit)) return error("invalid_load_unit", "La unidad de carga no es válida.");
  const leftLocations = locations(left);
  const rightLocations = locations(right);
  const leftIds = new Set(leftLocations.keys());
  const rightIds = new Set(rightLocations.keys());
  const sharedCourseIds = [...leftIds].filter((id) => rightIds.has(id)).sort();
  const onlyLeftCourseIds = [...leftIds].filter((id) => !rightIds.has(id)).sort();
  const onlyRightCourseIds = [...rightIds].filter((id) => !leftIds.has(id)).sort();
  const duplicateCourseIds = {
    left: [...leftLocations].filter(([, entries]) => entries.length > 1).map(([id]) => id).sort(),
    right: [...rightLocations].filter(([, entries]) => entries.length > 1).map(([id]) => id).sort(),
  };
  const movedCourseIds = [];
  for (const courseId of sharedCourseIds) {
    const from = leftLocations.get(courseId)[0];
    const to = rightLocations.get(courseId)[0];
    const datedFrom = periodIdentity(from);
    const datedTo = periodIdentity(to);
    const comparableByDate = datedFrom !== null && datedTo !== null;
    if ((comparableByDate && datedFrom !== datedTo) || (!comparableByDate && from.index !== to.index)) {
      movedCourseIds.push({ courseId, from, to, basis: comparableByDate ? "dates" : "position" });
    }
  }
  return {
    ok: true,
    comparison: {
      left: { id: left.id, name: left.name, termCount: left.terms.length, uniqueCourseCount: leftIds.size, load: scenarioLoad(left, options.courses, unit) },
      right: { id: right.id, name: right.name, termCount: right.terms.length, uniqueCourseCount: rightIds.size, load: scenarioLoad(right, options.courses, unit) },
      sharedCourseIds,
      onlyLeftCourseIds,
      onlyRightCourseIds,
      movedCourseIds,
      duplicateCourseIds,
      positionIsPresentationOnly: movedCourseIds.some((move) => move.basis === "position"),
    },
  };
}
