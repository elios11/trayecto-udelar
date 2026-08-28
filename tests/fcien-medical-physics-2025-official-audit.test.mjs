import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-fisica-medica-2025.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en fisica medica:2025");
const requirements = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));

test("normaliza un único Plan 2025 compartido por Ciencias y Medicina", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-shared-degree-one-flexible-individual-plan");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Física Médica", 48, 360]);
  assert.deepEqual(plan.plan.sharedWith, ["FACULTAD DE MEDICINA"]);
  assert.deepEqual(plan.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "plan-individual",
  }]);
  assert.deepEqual(audit.offerings.map(({ serviceCode }) => serviceCode), ["FCIEN", "FMED"]);
  assert.deepEqual(Object.keys(plan.pathways), ["plan-individual"]);
});

test("controla siete áreas, la práctica transversal y deja 26 créditos flexibles", () => {
  const credential = plan.creditStructure.credentials[0];
  const rootRequirements = credential.nodeRequirements.filter(({ nodeId }) => requirements.get(nodeId).parentId === "plan-total");
  assert.deepEqual(rootRequirements, [
    { nodeId: "biology-medicine", minCredits: 41 },
    { nodeId: "physics", minCredits: 81 },
    { nodeId: "radiation-physics", minCredits: 27 },
    { nodeId: "experimental-physics", minCredits: 23 },
    { nodeId: "complementary-training", minCredits: 11 },
    { nodeId: "mathematics", minCredits: 81 },
    { nodeId: "medical-physics-electives", minCredits: 60 },
    { nodeId: "social-productive-practices", minCredits: 10 },
  ]);
  const controlledMinimum = rootRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0);
  assert.equal(controlledMinimum, 334);
  assert.equal(credential.minTotalCredits - controlledMinimum, 26);
  const validation = credential.requiredCourseGroups.find(({ id }) => id === "validacion-final-plan");
  assert.match(validation.label, /Comisión de Carrera.*180 créditos/i);
});

test("mantiene un plan individual y el catálogo operativo por requisitos", () => {
  const pathway = plan.pathways["plan-individual"];
  assert.deepEqual(pathway.periods.map(({ label }) => label), [
    "Biología-Medicina",
    "Física",
    "Física de radiaciones",
    "Física experimental",
    "Formación complementaria",
    "Matemática",
    "Módulos electivos en Física Médica",
    "Prácticas de formación en el ámbito social y productivo",
    "Validación de egreso",
  ]);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [7, 8, 3, 7, 4, 8, 5, 6, 1]);
  assert.equal(plan.courses.length, 49);
  assert.equal(plan.rules.length, 55);
  assert.match(pathway.description, /no menciones certificadas separadas/i);
});
