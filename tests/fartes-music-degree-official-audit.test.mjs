import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fartes-licenciatura-en-musica-2005.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en musica:2005");

const pathwayIds = ["composicion", "direccion-de-coro", "direccion-de-orquesta", "musicologia"];
const nodesById = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));
const coursesById = new Map(plan.courses.map((course) => [course.id, course]));
const specificNames = (pathwayId) => plan.pathways[pathwayId].periods
  .find(({ label }) => label === "Materias específicas de la opción").courseIds
  .map((courseId) => coursesById.get(courseId).name);

test("audita Música como una carrera con cuatro opciones certificadas", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-four-certified-options");
  assert.deepEqual([audit.officialPlan.durationMonths, audit.officialPlan.semesters, audit.officialPlan.minimumCredits], [48, 8, 360]);
  assert.deepEqual(audit.officialPlan.trajectories.map(({ id }) => id), pathwayIds);
  assert.deepEqual(audit.officialPlan.trajectories.map(({ label }) => label), [
    "Composición", "Dirección de Coro", "Dirección de Orquesta", "Musicología",
  ]);
});

test("controla los mínimos diferenciados y los submínimos electivos", () => {
  assert.deepEqual([plan.plan.year, plan.plan.durationMonths, plan.plan.minCredits], ["2005", 48, 360]);
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.deepEqual(Object.keys(plan.pathways), pathwayIds);
  assert.deepEqual(plan.creditStructure.credentials.map(({ id }) => id), pathwayIds);

  const rootRequirementSum = ({ nodeRequirements }) => nodeRequirements
    .filter(({ nodeId }) => nodesById.get(nodeId).parentId === "plan-total")
    .reduce((sum, requirement) => sum + requirement.minCredits, 0);
  assert.ok(plan.creditStructure.credentials.every((credential) => rootRequirementSum(credential) === 360));
  assert.deepEqual(
    plan.creditStructure.credentials.map(({ id, nodeRequirements }) => [
      id,
      nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId !== "plan-total").map(({ minCredits }) => minCredits),
    ]),
    [
      ["composicion", [20, 20]],
      ["direccion-de-coro", [26, 26]],
      ["direccion-de-orquesta", [29, 29]],
      ["musicologia", [29, 29]],
    ],
  );
});

test("separa las materias específicas y conserva la oferta flexible sin inflarla", () => {
  assert.ok(plan.courses.length > 600);
  assert.ok(plan.courses.reduce((sum, course) => sum + course.credits, 0) > plan.plan.minCredits);
  assert.ok(plan.courses.every((course) => !course.eligibleRequirementIds.includes("plan-total")));
  assert.ok(specificNames("composicion").includes("Composición 8"));
  assert.ok(specificNames("direccion-de-coro").includes("Dirección de Coro 8"));
  assert.ok(specificNames("direccion-de-orquesta").includes("Dirección de Orquesta 8"));
  assert.ok(specificNames("musicologia").includes("Investigación 4"));
  assert.ok(!specificNames("musicologia").includes("Composición 8"));
  assert.ok(Object.values(plan.pathways).every(({ periods }) => periods.some(({ label }) => label === "Tronco común")));
});
