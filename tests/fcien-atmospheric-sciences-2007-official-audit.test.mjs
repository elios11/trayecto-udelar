import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-ciencias-de-la-atmosfera-2007.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-ciencias-de-la-atmosfera-2007.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en ciencias de la atmosfera:2007");
const requirements = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));

test("normaliza un único Plan 2007 compartido por Ciencias e Ingeniería", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-shared-degree-one-flexible-curriculum");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], [
    "Licenciado en Ciencias de la Atmósfera",
    48,
    360,
  ]);
  assert.deepEqual(plan.plan.sharedWith, ["FACULTAD DE INGENIERÍA"]);
  assert.deepEqual(plan.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "curriculo-personalizado",
  }]);
  assert.deepEqual(Object.keys(plan.pathways), ["curriculo-personalizado"]);
  assert.equal(snapshot.plan.metadata.duration, "60 meses");
  assert.deepEqual(audit.offerings.map(({ serviceCode, locations, curriculumVariant }) => ({
    serviceCode,
    locations,
    curriculumVariant,
  })), [
    { serviceCode: "FCIEN", locations: ["Montevideo"], curriculumVariant: false },
    { serviceCode: "FING", locations: ["Montevideo"], curriculumVariant: false },
  ]);
});

test("controla nueve mínimos por 279 créditos y deja 81 de distribución flexible", () => {
  const credential = plan.creditStructure.credentials[0];
  const rootRequirements = credential.nodeRequirements.filter(({ nodeId }) => requirements.get(nodeId).parentId === "plan-total");
  assert.deepEqual(rootRequirements, [
    { nodeId: "mathematics", minCredits: 68 },
    { nodeId: "physics", minCredits: 64 },
    { nodeId: "fluids-atmospheric-dynamics", minCredits: 54 },
    { nodeId: "integrative-lab-special", minCredits: 24 },
    { nodeId: "data-treatment", minCredits: 20 },
    { nodeId: "numerical-methods", minCredits: 18 },
    { nodeId: "chemistry", minCredits: 10 },
    { nodeId: "water-geosciences", minCredits: 15 },
    { nodeId: "science-society", minCredits: 6 },
  ]);
  const controlledMinimum = rootRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0);
  assert.equal(controlledMinimum, 279);
  assert.equal(credential.minTotalCredits - controlledMinimum, 81);
});

test("conserva el catálogo flexible por área sin inventar menciones", () => {
  const pathway = plan.pathways["curriculo-personalizado"];
  assert.deepEqual(pathway.periods.map(({ label }) => label), [
    "Matemática",
    "Física básica, intermedia y avanzada",
    "Mecánica de los fluidos y dinámica atmosférica",
    "Actividades integradoras, laboratorios y especiales",
    "Tratamiento de datos",
    "Métodos numéricos",
    "Química",
    "Recursos hídricos y otras geociencias",
    "Ciencia y Sociedad",
    "Validación de egreso",
  ]);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [43, 41, 28, 38, 13, 16, 8, 21, 30, 1]);
  assert.equal(plan.courses.length, 238);
  assert.equal(plan.rules.length, 150);
  assert.match(pathway.description, /no crea menciones ni títulos diferentes/i);
  const validation = plan.creditStructure.credentials[0].requiredCourseGroups.find(({ id }) => id === "validacion-final-plan");
  assert.match(validation.label, /Comisión de Carrera compartida/i);
});
