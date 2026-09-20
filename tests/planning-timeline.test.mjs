import assert from "node:assert/strict";
import test from "node:test";
import { projectPlanningTimeline } from "../app/planning-timeline.mjs";

const event = (id, courseId, occurredAt = null) => ({ id, courseId, kind: "accreditation", resultStatus: "exonerated", occurredAt, recordedAt: `2026-01-0${id.slice(-1)}T00:00:00.000Z`, revision: 1, supersedesEventId: null, voided: false, source: "user" });
const scenario = (terms, currentTermId = null) => ({ id: "active", name: "Alternativa", currentTermId, terms });
const term = (id, label, extra = {}) => ({ id, label, status: "planned", startsAt: null, endsAt: null, courseIds: [], ...extra });

test("proyecta períodos sin mutar, ordena fechados y conserva los no fechados por escenario", () => {
  const input = scenario([term("later", "Después", { startsAt: "2026-08-01", endsAt: "2026-12-01", courseIds: ["B"] }), term("first", "Inicio", { status: "closed", startsAt: "2026-03-01", endsAt: "2026-07-01", courseIds: ["A"] }), term("free", "Mi bloque")]);
  const history = { events: [event("e1", "A", "2026-04-10")] };
  const before = structuredClone(input);
  const result = projectPlanningTimeline({ scenario: input, academicHistory: history, courses: [{ id: "A", credits: 5 }, { id: "B", credits: 4 }], loadUnit: "credits" });
  assert.deepEqual(input, before);
  assert.deepEqual(result.periods.map((item) => item.id), ["first", "later", "free"]);
  assert.equal(result.periods[0].status, "closed");
  assert.equal(result.periods[0].events[0].id, "e1");
  assert.equal(result.periods[2].label, "Mi bloque");
});

test("no infiere fechas: separa eventos sin fecha de hitos fechados fuera de períodos", () => {
  const result = projectPlanningTimeline({ scenario: scenario([
    term("a", "A", { status: "closed", startsAt: "2026-07-01", endsAt: "2026-03-01" }),
    term("b", "B", { startsAt: "2026-06-01", endsAt: "2026-08-01" }),
  ]), academicHistory: { events: [event("e2", "A"), event("e3", "A", "2026-04-01")] } });
  assert.deepEqual(result.undatedEvents.map((item) => item.id), ["e2"]);
  assert.deepEqual(result.unassignedDatedEvents.map((item) => item.id), ["e3"]);
  assert.deepEqual(result.datedEvents.map((item) => item.id), []);
  assert.deepEqual(result.warnings.map((item) => item.code).sort(), ["inverted_dates"]);
});

test("rechaza fechas calendario imposibles y mantiene visibles los hitos sin períodos", () => {
  const result = projectPlanningTimeline({
    scenario: scenario([term("bad", "Fecha inválida", { startsAt: "2026-02-30", endsAt: "2026-99-01" })]),
    academicHistory: { events: [event("e4", "A", "2026-09-10")] },
    credentials: [{ id: "degree", title: "Título", inProgress: true }],
  });
  assert.equal(result.periods[0].startsAt, null);
  assert.equal(result.periods[0].endsAt, null);
  assert.deepEqual(result.unassignedDatedEvents.map((item) => item.id), ["e4"]);
  assert.equal(result.empty, false);
  assert.deepEqual(result.warnings.map((item) => item.code), ["invalid_dates"]);
});

test("advierte períodos fechados que se superponen sin reordenar ni corregir datos", () => {
  const active = scenario([
    term("a", "A", { startsAt: "2026-03-01", endsAt: "2026-07-15" }),
    term("b", "B", { startsAt: "2026-07-01", endsAt: "2026-12-01" }),
  ]);
  const before = structuredClone(active);
  const result = projectPlanningTimeline({ scenario: active });
  assert.deepEqual(active, before);
  assert.deepEqual(result.warnings.map((item) => item.code), ["overlapping_dates"]);
});

test("un escenario sin períodos todavía muestra sus hitos curriculares", () => {
  const result = projectPlanningTimeline({ scenario: scenario([]), credentials: [{ id: "degree", title: "Título" }] });
  assert.equal(result.empty, false);
  assert.equal(result.milestones[0].state, "pending");
});

test("calcula carga completa o parcial en créditos, horas y materias sin tratar ausencias como cero", () => {
  const active = scenario([term("a", "A", { courseIds: ["A", "B"] })]);
  const credits = projectPlanningTimeline({ scenario: active, courses: [{ id: "A", credits: 5 }, { id: "B", credits: 0 }], loadUnit: "credits" }).periods[0].load;
  const hours = projectPlanningTimeline({ scenario: active, courses: [{ id: "A", hours: 25 }], loadUnit: "hours" }).periods[0].load;
  const courses = projectPlanningTimeline({ scenario: active, loadUnit: "courses" }).periods[0].load;
  assert.deepEqual([credits.value, credits.partial], [5, true]);
  assert.deepEqual([hours.value, hours.partial], [25, true]);
  assert.deepEqual([courses.value, courses.partial], [2, false]);
});

test("conserva el pasado y cambia sólo períodos futuros al cambiar escenario", () => {
  const history = { events: [event("e1", "A", "2026-04-01")] };
  const base = projectPlanningTimeline({ scenario: scenario([term("past", "Pasado", { startsAt: "2026-03-01", endsAt: "2026-07-01" }), term("future", "Futuro", { courseIds: ["B"] })]), academicHistory: history });
  const alternative = projectPlanningTimeline({ scenario: scenario([term("past", "Pasado", { startsAt: "2026-03-01", endsAt: "2026-07-01" }), term("other", "Otro futuro", { courseIds: ["C"] })]), academicHistory: history });
  assert.equal(base.periods[0].events[0].id, alternative.periods[0].events[0].id);
  assert.notDeepEqual(base.periods[1].courseIds, alternative.periods[1].courseIds);
});

test("expone hitos alcanzados, planificados, pendientes y no evaluables sin fecha de egreso", () => {
  const result = projectPlanningTimeline({ scenario: scenario([term("future", "Futuro")]), credentials: [
    { id: "a", title: "Intermedio", achieved: true, occurredAt: "2026-06-01" },
    { id: "b", title: "Final", plannedTermId: "future", inProgress: true },
    { id: "c", title: "Actividad", inProgress: true },
    { id: "d", title: "Constancia", evaluable: false },
  ] });
  assert.deepEqual(result.milestones.map((item) => item.state), ["achieved", "planned", "in-progress", "not-evaluable"]);
  assert.equal(Object.hasOwn(result, "graduationDate"), false);
});
