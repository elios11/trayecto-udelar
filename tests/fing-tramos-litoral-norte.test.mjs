import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation, completeRegisteredPlanCourses } from "../app/registered-plan-courses.mjs";
import { resolveCampusPathway } from "../app/academic-campus.mjs";

const root = new URL("../", import.meta.url);
const read = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const inventory = await read("data/official-trajectories/inventory.json");

for (const [key, main, expected] of [
  ["ingenieria-en-agrimensura-2023", "trayectoria-flexible", [[44, 48], [44, 48]]],
  ["ingenieria-fisico-matematica-2017", "curricula-personalizada", [[44, 48, 47, 45], [40, 48, 47, 45]]],
]) {
  test(`${key}: las sedes iniciales muestran sólo su tramo oficial y no alteran Montevideo`, async () => {
    const planId = `bedelias-fing-${key}`;
    const projection = await read(`app/data/bedelias-generated/${planId}.json`);
    assert.equal(projection.plan.minCredits, 450);
    assert.deepEqual(projection.campuses.map(({ id, defaultPathwayId }) => [id, defaultPathwayId]), [
      ["montevideo", main], ["salto", "salto-inicial"], ["paysandu", "paysandu-inicial"],
    ]);
    const capital = buildRegisteredPlanPresentation(main, projection);
    assert.ok(capital.courses.length > 0);
    assert.ok(capital.courses.every(({ id }) => !id.startsWith("fing-litoral-norte-")));
    const capitalIds = new Set(completeRegisteredPlanCourses(main, projection, capital.courses).map(({ id }) => id));
    const regional = ["salto-inicial", "paysandu-inicial"].map((id, index) => {
      assert.equal(resolveCampusPathway(projection.pathways, projection.campuses[index + 1], main), id);
      const view = buildRegisteredPlanPresentation(id, projection);
      assert.equal(view.generated, false);
      assert.match(view.description, /continúa en Montevideo/);
      const courses = new Map(view.courses.map((course) => [course.id, course]));
      assert.deepEqual(view.periods.map((period) => period.courseIds.reduce((total, id) => total + courses.get(id).credits, 0)), expected[index]);
      assert.deepEqual(new Set(courses.keys()), new Set(view.periods.flatMap(({ courseIds }) => courseIds)));
      assert.ok(view.courses.every(({ id, bedeliasCode, eligibleRequirementIds }) =>
        id.startsWith("fing-litoral-norte-") && !bedeliasCode && eligibleRequirementIds.join() === "plan-total"));
      const planner = completeRegisteredPlanCourses(id, projection, view.courses);
      assert.deepEqual(new Set(planner.map(({ id }) => id)), capitalIds);
      assert.ok(planner.some((course) => course.id === capital.courses[0].id && course.semester === "opt"));
      return view;
    });
    assert.deepEqual(regional[0].periods[1], regional[1].periods[1]);
    if (expected[0].length === 4) {
      assert.ok(regional[0].courses.some(({ name }) => name === "Taller de Diseño"));
      assert.ok(!regional[0].courses.some(({ name }) => name === "Taller de Robótica"));
      assert.ok(regional[1].courses.some(({ name }) => name === "Taller de Robótica"));
    } else {
      assert.deepEqual(regional[0].periods, regional[1].periods);
    }
    assert.equal(inventory.plans.find((entry) => entry.planId === planId).state, "research-pending");
  });
}
