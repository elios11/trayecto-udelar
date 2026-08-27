import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcea-contador-publico-2024.json");
const audit = registry.audits.find(({ identity }) => identity === "contador publico:2024");

const pathwayIds = [
  "asesoria-financiera",
  "aspectos-tributarios-y-juridicos",
  "controller-y-transformacion-digital",
  "reportes-externos-y-atestiguamiento",
  "sector-publico",
];
const nodesById = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));
const coursesByCode = new Map(plan.courses.map((course) => [course.bedeliasCode, course]));

test("audita Contador Público como un título con cinco perfiles certificados", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-five-certified-profiles");
  assert.deepEqual([audit.officialPlan.durationMonths, audit.officialPlan.semesters, audit.officialPlan.minimumCredits], [48, 8, 360]);
  assert.deepEqual(audit.officialPlan.trajectories.map(({ id }) => id), pathwayIds);
  assert.ok(audit.officialPlan.curriculum.credentials.every(({ title }) => title.startsWith("Contador Público · constancia Perfil")));
  assert.equal(plan.plan.degreeTitle, "Contador Público");
});

test("controla 260+10+60+30 y el mínimo interno 40+20 de cada perfil", () => {
  assert.deepEqual(Object.keys(plan.pathways), pathwayIds);
  assert.deepEqual(plan.creditStructure.credentials.map(({ id }) => id), pathwayIds);
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);

  for (const credential of plan.creditStructure.credentials) {
    const roots = credential.nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId === "plan-total");
    const children = credential.nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId !== "plan-total");
    assert.equal(roots.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
    assert.deepEqual(children.map(({ minCredits }) => minCredits), [40, 20]);
  }
  assert.ok(plan.courses.every((course) => !course.eligibleRequirementIds.includes("plan-total")));
});

test("corrige el grupo Controller sin perder sus cursos libres", () => {
  const controllerRequired = plan.courses.filter(({ eligibleRequirementIds }) => eligibleRequirementIds.includes("controller-required"));
  assert.deepEqual(controllerRequired.map(({ bedeliasCode }) => bedeliasCode).sort(), ["A81", "C76N", "C87N", "I75N", "I88N", "MC72"]);
  assert.equal(controllerRequired.reduce((sum, { credits }) => sum + credits, 0), 40);
  for (const code of ["I137", "I138"]) {
    assert.deepEqual(coursesByCode.get(code).eligibleRequirementIds, ["free-electives"]);
  }
  assert.ok(Object.values(plan.pathways).every(({ periods }) => (
    periods.some(({ label }) => label === "Perfil · obligatorias")
    && periods.some(({ label }) => label === "Perfil · opcionales")
    && periods.some(({ label }) => label === "Opcionales libres")
  )));
});
