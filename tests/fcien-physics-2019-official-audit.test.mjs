import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-fisica-2019.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en fisica:2019");
const requirements = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));

test("normaliza un único Plan 2019 de Física en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-one-tutored-flexible-physics-pathway");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado/a en Física", 48, 360]);
  assert.deepEqual(plan.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "formacion-personalizada",
  }]);
  assert.deepEqual(Object.keys(plan.pathways), ["formacion-personalizada"]);
  assert.deepEqual(audit.offerings.map(({ serviceCode }) => serviceCode), ["FCIEN"]);
});

test("controla cinco mínimos por 268 créditos y deja 92 flexibles", () => {
  const credential = plan.creditStructure.credentials[0];
  const rootRequirements = credential.nodeRequirements.filter(({ nodeId }) => requirements.get(nodeId).parentId === "plan-total");
  assert.deepEqual(rootRequirements, [
    { nodeId: "physics", minCredits: 110 },
    { nodeId: "mathematics", minCredits: 70 },
    { nodeId: "research-professional-tools", minCredits: 60 },
    { nodeId: "other-scientific-technological", minCredits: 10 },
    { nodeId: "integral-human-social", minCredits: 18 },
  ]);
  const controlledMinimum = rootRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0);
  assert.equal(controlledMinimum, 268);
  assert.equal(credential.minTotalCredits - controlledMinimum, 92);
  const validation = credential.requiredCourseGroups.find(({ id }) => id === "validacion-final-plan");
  assert.match(validation.label, /10 créditos de formación integral y 8 de iniciación a la investigación/i);
});

test("mantiene el catálogo por áreas y una trayectoria personal no certificada", () => {
  const pathway = plan.pathways["formacion-personalizada"];
  assert.deepEqual(pathway.periods.map(({ label }) => label), [
    "Física",
    "Matemática",
    "Herramientas para la investigación y el desarrollo profesional",
    "Otras disciplinas científicas y tecnológicas",
    "Formación integral, Ciencias Humanas y Sociales",
    "Validación de egreso",
  ]);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [54, 44, 52, 61, 79, 1]);
  assert.equal(plan.courses.length, 291);
  assert.equal(plan.rules.length, 229);
  assert.match(pathway.description, /no como menciones certificadas/i);
});
