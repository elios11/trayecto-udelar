import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildRegisteredPlanPresentation, completeRegisteredPlanCourses } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const read = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const projection = async (slug) => read(`app/data/bedelias-generated/bedelias-${slug}.json`);

test("Deportes publica en cada opción 20 materias, 144 créditos básicos y cuatro semestres además de dos bloques anuales", async () => {
  const plan = await projection("isef-tecnicatura-en-deportes-2007");
  const football = buildRegisteredPlanPresentation("futbol", plan);
  const swimming = buildRegisteredPlanPresentation("actividades-acuaticas", plan);
  assert.deepEqual(football.periods.map(({ label }) => label), [
    "Primer año · anuales", "Semestre 1", "Semestre 2", "Segundo año · anuales", "Semestre 3", "Semestre 4",
  ]);
  for (const pathwayId of ["futbol", "actividades-acuaticas", "atletismo"]) {
    assert.equal(plan.pathways[pathwayId].scopeProgressToPathway, true);
    const view = buildRegisteredPlanPresentation(pathwayId, plan);
    assert.equal(view.generated, false);
    assert.equal(view.courses.length, 20);
    assert.equal(new Set(view.periods.flatMap(({ courseIds }) => courseIds)).size, 20);
    assert.equal(view.courses.reduce((sum, course) => sum + course.credits, 0), 144);
    assert.ok(view.courses.some(({ id, bedeliasCode }) => id === "isef-cb122" && bedeliasCode === "CB122"));
  }
  const footballPracticeId = football.courses.find(({ name }) => name === "Práctica Profesional · Fútbol").id;
  assert.ok(!swimming.courses.some(({ id }) => id === footballPracticeId));
  assert.ok(completeRegisteredPlanCourses("actividades-acuaticas", plan, swimming.courses).some(({ id }) => id === footballPracticeId));
  const legacy = completeRegisteredPlanCourses("actividades-acuaticas", plan, swimming.courses)
    .find(({ id }) => id === "isef-td01");
  assert.equal(legacy.provisional, true);
  assert.deepEqual(legacy.creditAllocations, []);
  assert.ok(!swimming.courses.some(({ id }) => id === legacy.id));
  assert.deepEqual(plan.creditStructure.credentials[0].nodeRequirements.map(({ minCredits }) => minCredits), [37, 107, 16]);
  assert.equal(plan.plan.minCredits, 160);
  assert.match(plan.plan.notice, /16 créditos optativos/);
  assert.ok(plan.courses.some(({ id, authorityStatus }) => id === "isef-td01" && authorityStatus === "candidate"));
});

test("Licenciatura publica únicamente las tres guías compartidas, sin fijar su Trabajo Final ni convertir el proyecto de Ingeniería", async () => {
  const plan = await projection("fing-licenciatura-en-computacion-2025");
  assert.equal(plan.plan.minCredits, 360);
  assert.deepEqual(plan.campuses.map(({ defaultPathwayId }) => defaultPathwayId),
    ["second-semester-pi-60-plus", "curricula-personalizada", "curricula-personalizada", "litoral-norte", "litoral-norte"]);
  for (const id of ["second-semester-pi-60-plus", "second-semester-pi-20-59", "litoral-norte"]) {
    const view = buildRegisteredPlanPresentation(id, plan);
    assert.equal(view.periods.length, 8);
    assert.equal(view.generated, false);
    const thesis = view.courses.find(({ id }) => id === "fing-liccomp-trabajo-final");
    assert.equal(thesis.semester, "opt");
    const project = view.courses.find(({ id }) => id === "fing-p25-proy-is");
    assert.equal(project.credits, 15);
    assert.deepEqual(project.eligibleRequirementIds, ["plan-total"]);
    assert.deepEqual(project.equivalentCourseIds ?? [], []);
  }
});
