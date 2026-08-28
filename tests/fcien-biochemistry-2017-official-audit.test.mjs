import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-bioquimica-2017.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-bioquimica-2017.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en bioquimica:2017");
const requirements = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));

test("normaliza Bioquímica como un único Plan 2017 flexible en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-one-personalized-orientation-pathway");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Bioquímica", 48, 360]);
  assert.deepEqual(plan.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "formacion-personalizada",
  }]);
  assert.equal(snapshot.plan.metadata.minCredits, null);
  assert.deepEqual(Object.keys(plan.pathways), ["formacion-personalizada"]);
});

test("controla los mínimos oficiales y deja 46 créditos de distribución flexible", () => {
  const credential = plan.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements, [
    { nodeId: "physical-mathematics", minCredits: 60 },
    { nodeId: "chemistry", minCredits: 70 },
    { nodeId: "biology", minCredits: 60 },
    { nodeId: "basic-biochemistry", minCredits: 45 },
    { nodeId: "humanities", minCredits: 6 },
    { nodeId: "orientation", minCredits: 33 },
    { nodeId: "thesis", minCredits: 40 },
  ]);
  assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 314);
  assert.equal(credential.minTotalCredits, 360);
  assert.equal(requirements.get("social-productive").minCredits, 0);
  assert.ok(!credential.nodeRequirements.some(({ nodeId }) => nodeId === "social-productive"));
});

test("exige la Tesina publicada y conserva aparte la validación transversal", () => {
  const thesis = plan.courses.find(({ bedeliasCode }) => bedeliasCode === "BQ200");
  assert.deepEqual({ name: thesis.name, credits: thesis.credits, eligible: thesis.eligibleRequirementIds }, {
    name: "Tesina de Grado",
    credits: 40,
    eligible: ["thesis"],
  });
  const validation = plan.creditStructure.credentials[0].requiredCourseGroups.find(({ id }) => id === "validacion-final-plan");
  assert.match(validation.label, /10 créditos de formación social\/productiva/i);
  const validationCourse = plan.courses.find(({ id }) => id === validation.courseIds[0]);
  assert.equal(validationCourse.dataStatus, "manual-validation");
  assert.equal(validationCourse.credits, 0);
});

test("mantiene el catálogo por áreas sin inventar menciones ni obligaciones masivas", () => {
  const pathway = plan.pathways["formacion-personalizada"];
  assert.deepEqual(pathway.periods.map(({ label }) => label), [
    "BIOLOGÍA",
    "BIOQUÍMICA BÁSICA",
    "FÍSICO-MATEMÁTICA",
    "HUMANÍSTICA",
    "QUÍMICA",
    "ACTIVIDADES DE FORMACIÓN (ÁMBITO SOCIAL Y PRODUCTIVO)",
    "ELECTIVAS",
    "TESINA DE GRADO",
    "Validación de egreso",
  ]);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [24, 13, 26, 18, 30, 2, 314, 1, 1]);
  assert.equal(plan.courses.length, 429);
  assert.equal(plan.rules.length, 443);
  assert.match(pathway.description, /no son menciones certificadas/i);
});
