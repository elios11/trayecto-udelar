import { effectiveAcademicHistoryEvents } from "./academic-history.mjs";

const LOAD_UNITS = new Set(["credits", "hours", "courses"]);
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const clone = (value) => structuredClone(value);
const validDate = (value) => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return false;
  if (!DATE_ONLY.test(value)) return true;
  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
};
const dateValue = (value) => validDate(value) ? Date.parse(value) : null;
const loadLabel = (unit) => unit === "credits" ? "créditos" : unit === "hours" ? "horas" : "materias";

function courseMap(courses) {
  return courses instanceof Map ? courses : new Map((courses ?? []).map((course) => [course.id, course]));
}

function projectLoad(courseIds, courses, unit) {
  let value = 0;
  const missingCourseIds = [];
  const missingValueCourseIds = [];
  for (const courseId of courseIds) {
    const course = courses.get(courseId);
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
  return { unit, label: loadLabel(unit), value, partial: missingCourseIds.length > 0 || missingValueCourseIds.length > 0, missingCourseIds, missingValueCourseIds };
}

function termStatus(term, scenario) {
  if (term.status === "closed") return "closed";
  if (term.status === "in-progress" || scenario.currentTermId === term.id) return "in-progress";
  return "planned";
}

function compareTerms(left, right) {
  const leftStart = dateValue(left.startsAt);
  const rightStart = dateValue(right.startsAt);
  if (leftStart !== null && rightStart !== null) return leftStart - rightStart || left.index - right.index;
  if (leftStart !== null) return -1;
  if (rightStart !== null) return 1;
  return left.index - right.index;
}

function termWarnings(terms) {
  const warnings = [];
  for (const term of terms) {
    const startsAt = dateValue(term.startsAt);
    const endsAt = dateValue(term.endsAt);
    if ((term.startsAt && startsAt === null) || (term.endsAt && endsAt === null)) warnings.push({ code: "invalid_dates", termId: term.id, message: `${term.label}: hay una fecha que no se puede interpretar.` });
    if (startsAt !== null && endsAt !== null && startsAt > endsAt) warnings.push({ code: "inverted_dates", termId: term.id, message: `${term.label}: el inicio figura después del cierre.` });
    if (term.status === "closed" && endsAt === null) warnings.push({ code: "closed_without_end", termId: term.id, message: `${term.label}: está cerrado, pero no registra fecha de cierre.` });
  }
  for (let leftIndex = 0; leftIndex < terms.length; leftIndex += 1) {
    const left = terms[leftIndex];
    const leftStart = dateValue(left.startsAt);
    const leftEnd = dateValue(left.endsAt);
    if (leftStart === null || leftEnd === null || leftStart > leftEnd) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < terms.length; rightIndex += 1) {
      const right = terms[rightIndex];
      const rightStart = dateValue(right.startsAt);
      const rightEnd = dateValue(right.endsAt);
      if (rightStart !== null && rightEnd !== null && rightStart <= leftEnd && leftStart <= rightEnd) warnings.push({ code: "overlapping_dates", termId: left.id, relatedTermId: right.id, message: `${left.label} y ${right.label} tienen fechas superpuestas.` });
    }
  }
  return warnings;
}

function eventPeriod(event, terms) {
  const occurredAt = dateValue(event.occurredAt);
  if (occurredAt === null) return null;
  return terms.find((term) => {
    const start = dateValue(term.startsAt);
    const end = dateValue(term.endsAt);
    return start !== null && end !== null && start <= occurredAt && occurredAt <= end;
  })?.id ?? null;
}

function milestones(credentials) {
  return (credentials ?? []).map((credential) => {
    const evaluable = credential.evaluable !== false;
    const achieved = evaluable && credential.achieved === true;
    const hasKnownPlan = evaluable && !achieved && credential.plannedTermId && credential.plannedTermId !== null;
    return {
      id: credential.id,
      title: credential.title,
      kind: credential.kind ?? "credential",
      state: !evaluable ? "not-evaluable" : achieved ? "achieved" : hasKnownPlan ? "planned" : credential.inProgress ? "in-progress" : "pending",
      termId: achieved ? null : hasKnownPlan ? credential.plannedTermId : null,
      occurredAt: achieved && validDate(credential.occurredAt) ? credential.occurredAt : null,
      explanation: !evaluable ? (credential.explanation ?? "No hay información suficiente para evaluar este requisito.") : credential.explanation ?? null,
    };
  });
}

/**
 * Proyecta la lectura temporal personal. Nunca altera el historial, la planificación ni la currícula.
 */
export function projectPlanningTimeline({ scenario, academicHistory, courses = [], loadUnit = "courses", credentials = [] } = {}) {
  if (!scenario) {
    const projectedMilestones = milestones(credentials);
    return { periods: [], datedEvents: [], unassignedDatedEvents: [], undatedEvents: [], milestones: projectedMilestones, warnings: [], empty: projectedMilestones.length === 0 };
  }
  const unit = LOAD_UNITS.has(loadUnit) ? loadUnit : "courses";
  const byCourseId = courseMap(courses);
  const periods = (scenario.terms ?? []).map((term, index) => ({
    id: term.id,
    index,
    label: typeof term.label === "string" && term.label.trim() ? term.label : "Período sin fecha",
    status: termStatus(term, scenario),
    startsAt: validDate(term.startsAt) ? term.startsAt : null,
    endsAt: validDate(term.endsAt) ? term.endsAt : null,
    courseIds: [...(term.courseIds ?? [])],
    load: projectLoad(term.courseIds ?? [], byCourseId, unit),
    events: [],
  })).sort(compareTerms);
  const termById = new Map(periods.map((period) => [period.id, period]));
  const datedEvents = [];
  const unassignedDatedEvents = [];
  const undatedEvents = [];
  const events = academicHistory?.events ? effectiveAcademicHistoryEvents(academicHistory) : [];
  for (const event of events) {
    const item = clone(event);
    const periodId = eventPeriod(event, periods);
    if (periodId) {
      termById.get(periodId).events.push(item);
      datedEvents.push({ ...item, periodId });
    } else if (dateValue(event.occurredAt) !== null) {
      unassignedDatedEvents.push(item);
    } else {
      undatedEvents.push(item);
    }
  }
  for (const period of periods) period.events.sort((left, right) => (dateValue(left.occurredAt) ?? 0) - (dateValue(right.occurredAt) ?? 0) || left.id.localeCompare(right.id));
  unassignedDatedEvents.sort((left, right) => dateValue(left.occurredAt) - dateValue(right.occurredAt) || left.id.localeCompare(right.id));
  undatedEvents.sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.id.localeCompare(right.id));
  const projectedMilestones = milestones(credentials);
  return {
    scenario: { id: scenario.id, name: scenario.name },
    unit,
    periods,
    datedEvents,
    unassignedDatedEvents,
    undatedEvents,
    milestones: projectedMilestones,
    warnings: termWarnings(scenario.terms ?? []),
    empty: periods.length === 0 && events.length === 0 && projectedMilestones.length === 0,
  };
}

export function timelineStatusLabel(status) {
  return ({ closed: "Completado", "in-progress": "En curso", planned: "Planificado", achieved: "Alcanzado", "not-evaluable": "No evaluable", pending: "Pendiente" })[status] ?? "En progreso";
}
