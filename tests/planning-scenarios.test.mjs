import test from "node:test";
import assert from "node:assert/strict";
import {
  SCENARIO_NAME_MAX_LENGTH,
  activatePlanningScenario,
  archivePlanningScenario,
  comparePlanningScenarios,
  createPlanningScenario,
  duplicatePlanningScenario,
  promotePlanningScenario,
  renamePlanningScenario,
  restorePlanningScenario,
  suggestScenarioCopyName,
} from "../app/planning-scenarios.mjs";

const now = "2026-09-15T12:00:00.000Z";
const term = (id, label, courseIds, extra = {}) => ({
  id, label, status: "planned", startsAt: null, endsAt: null, loadTarget: null, courseIds, ...extra,
});
const scenario = (id, name, extra = {}) => ({
  id, name, isPrimary: false, archived: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", currentTermId: null,
  terms: [term(`${id}-t1`, "Semestre 1", ["A"])], ...extra,
});
const planning = () => ({
  extensions: { "org.example.plan": { safe: true } },
  activeScenarioId: "main",
  scenarios: [scenario("main", "Principal", { isPrimary: true, currentTermId: "main-t1", terms: [term("main-t1", "Semestre inicial", ["A", "B"], { startsAt: "2026-03-01T00:00:00.000Z", endsAt: "2026-07-01T00:00:00.000Z", loadTarget: { unit: "credits", value: 18 }, extensions: { "org.example.term": "kept" } })], extensions: { "org.example.scenario": [1] } })],
});

function ids(...values) {
  let index = 0;
  return () => values[index++];
}

test("crear el primer escenario produce un semestre mínimo, principal y activo sin mutar", () => {
  const input = { activeScenarioId: null, scenarios: [], extensions: { "org.example.plan": 1 } };
  const before = structuredClone(input);
  const result = createPlanningScenario(input, { now, name: "  Alternativa  ", idGenerator: ids("scenario-1", "term-1") });
  assert.equal(result.ok, true);
  assert.deepEqual(input, before);
  assert.equal(result.planning.activeScenarioId, "scenario-1");
  assert.equal(result.scenario.name, "Alternativa");
  assert.equal(result.scenario.isPrimary, true);
  assert.deepEqual(result.scenario.terms[0], term("term-1", "Semestre 1", []));
  assert.deepEqual(result.planning.extensions, input.extensions);
});

test("duplicar conserva contenido y extensiones, renueva todas las identidades y no promueve", () => {
  const input = planning();
  const before = structuredClone(input);
  const result = duplicatePlanningScenario(input, "main", { now, activate: true, idGenerator: ids("main", "copy", "main-t1", "copy-t1") });
  assert.equal(result.ok, true);
  assert.deepEqual(input, before);
  assert.equal(result.scenario.id, "copy");
  assert.equal(result.scenario.terms[0].id, "copy-t1");
  assert.equal(result.scenario.currentTermId, "copy-t1");
  assert.equal(result.scenario.isPrimary, false);
  assert.equal(result.scenario.archived, false);
  assert.equal(result.planning.activeScenarioId, "copy");
  assert.deepEqual(result.scenario.terms[0].loadTarget, { unit: "credits", value: 18 });
  assert.deepEqual(result.scenario.extensions, { "org.example.scenario": [1] });
  assert.deepEqual(result.scenario.terms[0].extensions, { "org.example.term": "kept" });
});

test("los nombres de copia se desambiguan y el renombrado valida texto y límite", () => {
  const scenarios = [scenario("a", "Carga"), scenario("b", "Copia de Carga"), scenario("c", "Copia 2 de Carga")];
  assert.equal(suggestScenarioCopyName("Carga", scenarios), "Copia 3 de Carga");
  assert.equal(suggestScenarioCopyName("x".repeat(SCENARIO_NAME_MAX_LENGTH), []).length, SCENARIO_NAME_MAX_LENGTH);
  assert.equal(renamePlanningScenario({ activeScenarioId: "a", scenarios }, "a", "   ", { now }).code, "empty_name");
  assert.equal(renamePlanningScenario({ activeScenarioId: "a", scenarios }, "a", "x".repeat(SCENARIO_NAME_MAX_LENGTH + 1), { now }).code, "name_too_long");
  const renamed = renamePlanningScenario({ activeScenarioId: "a", scenarios }, "a", "  Mismo nombre  ", { now });
  assert.equal(renamed.scenario.name, "Mismo nombre");
  assert.equal(scenarios[0].name, "Carga");
});

test("activar, promover, archivar y restaurar respetan invariantes", () => {
  const input = planning();
  input.scenarios.push(scenario("other", "Otra"), scenario("archived", "Archivada", { archived: true }));
  const before = structuredClone(input);
  assert.equal(activatePlanningScenario(input, "archived").code, "scenario_archived");
  assert.equal(archivePlanningScenario(input, "main", { now }).code, "primary_scenario");
  assert.equal(archivePlanningScenario({ ...input, activeScenarioId: "other" }, "other", { now }).code, "active_scenario");

  const activated = activatePlanningScenario(input, "other");
  assert.equal(activated.planning.activeScenarioId, "other");
  const promoted = promotePlanningScenario(activated.planning, "archived", { now });
  assert.equal(promoted.planning.activeScenarioId, "other");
  assert.deepEqual(promoted.planning.scenarios.filter((item) => item.isPrimary).map((item) => item.id), ["archived"]);
  assert.equal(promoted.scenario.archived, false);
  const archived = archivePlanningScenario(promoted.planning, "main", { now });
  assert.equal(archived.scenario.archived, true);
  const restored = restorePlanningScenario(archived.planning, "main", { now });
  assert.equal(restored.scenario.archived, false);
  assert.equal(restored.planning.activeScenarioId, "other");
  assert.deepEqual(input, before);
});

test("una planificación heredada sin principal sólo cambia cuando se promueve explícitamente", () => {
  const input = { activeScenarioId: "a", scenarios: [scenario("a", "A"), scenario("b", "B")] };
  const activated = activatePlanningScenario(input, "b");
  assert.equal(activated.ok, true);
  assert.equal(activated.planning.scenarios.some((item) => item.isPrimary), false);
  const promoted = promotePlanningScenario(activated.planning, "b", { now });
  assert.deepEqual(promoted.planning.scenarios.filter((item) => item.isPrimary).map((item) => item.id), ["b"]);
  assert.equal(promoted.planning.activeScenarioId, "b");
  assert.equal(input.scenarios.some((item) => item.isPrimary), false);
});

test("comparar informa comunes, exclusivas, movimientos, carga parcial y duplicados", () => {
  const left = scenario("left", "Liviano", { terms: [
    term("l1", "Primero", ["A", "B", "D"], { startsAt: "2026-03-01T00:00:00.000Z", endsAt: "2026-07-01T00:00:00.000Z" }),
    term("l2", "Segundo", ["C", "D"]),
  ] });
  const right = scenario("right", "Intenso", { terms: [
    term("r1", "Inicio", ["A", "C"], { startsAt: "2026-03-01T00:00:00.000Z", endsAt: "2026-07-01T00:00:00.000Z" }),
    term("r2", "Después", ["E"]),
  ] });
  const credits = comparePlanningScenarios(left, right, { unit: "credits", courses: [
    { id: "A", credits: 6 }, { id: "B", credits: 4 }, { id: "C", credits: 0 }, { id: "D", credits: 3 }, { id: "E", credits: 5 },
  ] }).comparison;
  assert.deepEqual(credits.sharedCourseIds, ["A", "C"]);
  assert.deepEqual(credits.onlyLeftCourseIds, ["B", "D"]);
  assert.deepEqual(credits.onlyRightCourseIds, ["E"]);
  assert.deepEqual(credits.duplicateCourseIds.left, ["D"]);
  assert.deepEqual(credits.movedCourseIds.map((move) => [move.courseId, move.basis]), [["C", "position"]]);
  assert.equal(credits.left.load.value, 16);
  assert.equal(credits.left.load.partial, true);
  assert.equal(credits.right.load.value, 11);
  assert.equal(credits.right.load.partial, true);

  const hours = comparePlanningScenarios(left, right, { unit: "hours", courses: [{ id: "A", hours: 90 }] }).comparison;
  assert.equal(hours.left.load.value, 90);
  assert.equal(hours.left.load.partial, true);
  const courseCount = comparePlanningScenarios(left, right, { unit: "courses", courses: [] }).comparison;
  assert.equal(courseCount.left.load.value, 5);
  assert.equal(courseCount.left.load.partial, false);
});

test("la comparación reutiliza el aviso no bloqueante de objetivo cuando la carga es completa", () => {
  const left = scenario("left", "Carga", { terms: [term("l1", "Primero", ["A"], { loadTarget: { unit: "credits", value: 4 } })] });
  const right = scenario("right", "Otra", { terms: [term("r1", "Primero", ["A"])] });
  const comparison = comparePlanningScenarios(left, right, { unit: "credits", courses: [{ id: "A", credits: 6 }] }).comparison;
  assert.equal(comparison.left.load.perTerm[0].targetStatus, "exceeded");
  assert.equal(comparison.left.load.perTerm[0].difference, 2);
  assert.equal(comparison.right.load.perTerm[0].targetStatus, "none");
});
