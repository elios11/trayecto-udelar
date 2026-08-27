import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcea-licenciatura-en-economia-2012.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en economia:2012");
const nodesById = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));
const coursesById = new Map(plan.courses.map((course) => [course.id, course]));

const gridCodes = (pathwayId) => plan.pathways[pathwayId].periods
  .flatMap(({ courseIds }) => courseIds)
  .map((courseId) => coursesById.get(courseId).bedeliasCode);

test("audita Economía como un título flexible con cuatro guías no certificadas", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-flexible-degree-four-suggested-pathways");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Economía", 48, 360]);
  assert.deepEqual(Object.keys(plan.pathways), ["personalizada", "academica", "empresarial", "politicas-publicas", "sector-financiero"]);
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.equal(plan.creditStructure.credentials.length, 1);
});

test("controla los mínimos por área, sus submínimos básicos y 50 créditos libres", () => {
  const credential = plan.creditStructure.credentials[0];
  const rootRequirements = credential.nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId === "plan-total");
  assert.deepEqual(rootRequirements.map(({ minCredits }) => minCredits), [150, 80, 50, 10, 10, 10, 50]);
  assert.equal(rootRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
  assert.deepEqual(
    credential.nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId !== "plan-total").map(({ minCredits }) => minCredits),
    [120, 70, 20, 10, 10, 10],
  );
  assert.ok(plan.courses.every(({ eligibleRequirementIds }) => eligibleRequirementIds.includes("free-distribution")));
  assert.ok(plan.courses.every(({ eligibleRequirementIds }) => !eligibleRequirementIds.includes("plan-total")));
});

test("las guías destacan recomendaciones concretas sin ocultar las categorías abiertas", () => {
  const expectedCodes = {
    academica: ["E76", "E77", "S44", "E45", "462", "MC71", "I90"],
    empresarial: ["E87", "A71", "A81", "C63", "MC30"],
    "politicas-publicas": ["E76", "E77", "E75", "E72", "S44", "E45", "S21", "A81"],
    "sector-financiero": ["E78", "E74", "S41", "A71", "A81", "C63", "MC30", "462", "MC71"],
  };
  const allCourseIds = new Set(plan.courses.map(({ id }) => id));

  for (const [pathwayId, codes] of Object.entries(expectedCodes)) {
    const grid = gridCodes(pathwayId);
    for (const code of codes) assert.ok(grid.includes(code), `${pathwayId}: ${code}`);
    const pathway = plan.pathways[pathwayId];
    const availableIds = new Set([...pathway.periods.flatMap(({ courseIds }) => courseIds), ...pathway.catalogCourseIds]);
    assert.deepEqual(availableIds, allCourseIds);
  }
});
