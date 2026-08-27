import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcea-licenciatura-en-administracion-2012.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en administracion:2012");
const nodesById = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));
const coursesById = new Map(plan.courses.map((course) => [course.id, course]));

const gridCodes = (pathwayId) => plan.pathways[pathwayId].periods
  .flatMap(({ courseIds }) => courseIds)
  .map((courseId) => coursesById.get(courseId).bedeliasCode);

test("audita Administración como un título flexible con dos guías no certificadas", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-flexible-degree-two-suggested-pathways");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Administración", 48, 360]);
  assert.deepEqual(Object.keys(plan.pathways), ["personalizada", "gestion-de-personas", "marketing"]);
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.equal(plan.creditStructure.credentials.length, 1);
});

test("controla siete áreas, sus submínimos básicos y 40 créditos libres", () => {
  const credential = plan.creditStructure.credentials[0];
  const rootRequirements = credential.nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId === "plan-total");
  assert.deepEqual(rootRequirements.map(({ minCredits }) => minCredits), [120, 60, 45, 40, 20, 20, 15, 40]);
  assert.equal(rootRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
  assert.deepEqual(
    credential.nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId !== "plan-total").map(({ minCredits }) => minCredits),
    [80, 40, 30, 40, 10, 10],
  );
  assert.ok(plan.courses.every(({ eligibleRequirementIds }) => eligibleRequirementIds.includes("free-distribution")));
  assert.ok(plan.courses.every(({ eligibleRequirementIds }) => !eligibleRequirementIds.includes("plan-total")));
});

test("las guías destacan recomendaciones sin ocultar el catálogo flexible", () => {
  const peopleCodes = gridCodes("gestion-de-personas");
  const marketingCodes = gridCodes("marketing");
  for (const code of ["A42", "A54", "A67", "A85", "E77", "A89"]) assert.ok(peopleCodes.includes(code), code);
  for (const code of ["A63", "A72", "A52", "A77", "I87"]) assert.ok(marketingCodes.includes(code), code);
  assert.ok(!peopleCodes.includes("A77"));
  assert.ok(!marketingCodes.includes("A54"));

  const allCourseIds = new Set(plan.courses.map(({ id }) => id));
  for (const pathwayId of ["gestion-de-personas", "marketing"]) {
    const pathway = plan.pathways[pathwayId];
    const availableIds = new Set([...pathway.periods.flatMap(({ courseIds }) => courseIds), ...pathway.catalogCourseIds]);
    assert.deepEqual(availableIds, allCourseIds);
  }
});
