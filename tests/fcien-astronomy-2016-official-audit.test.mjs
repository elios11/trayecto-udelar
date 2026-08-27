import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-astronomia-2016.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-astronomia-2016.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en astronomia:2016");
const requirements = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));

test("normaliza Astronomía como un único Plan 2016 flexible en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-one-personalized-flexible-pathway");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Astronomía", 48, 360]);
  assert.deepEqual(plan.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "formacion-personalizada",
  }]);
  assert.equal(snapshot.plan.metadata.minCredits, 360);
  assert.deepEqual(Object.keys(plan.pathways), ["formacion-personalizada"]);
});

test("controla siete mínimos raíz que completan exactamente los 360 créditos", () => {
  const credential = plan.creditStructure.credentials[0];
  const rootRequirements = credential.nodeRequirements.filter(({ nodeId }) => requirements.get(nodeId).parentId === "plan-total");
  assert.deepEqual(rootRequirements, [
    { nodeId: "mathematics", minCredits: 70 },
    { nodeId: "physics", minCredits: 100 },
    { nodeId: "astronomy", minCredits: 90 },
    { nodeId: "computational-methods", minCredits: 20 },
    { nodeId: "social-human-sciences", minCredits: 8 },
    { nodeId: "training-experiences", minCredits: 22 },
    { nodeId: "flexible", minCredits: 50 },
  ]);
  assert.equal(rootRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
  assert.deepEqual(
    credential.nodeRequirements.filter(({ nodeId }) => requirements.get(nodeId).parentId === "flexible"),
    [{ nodeId: "optional", minCredits: 30 }, { nodeId: "elective", minCredits: 10 }],
  );
});

test("separa las dos experiencias formativas y corrige sus identidades administrativas", () => {
  const coursesByCode = new Map(plan.courses.map((course) => [course.bedeliasCode, course]));
  assert.deepEqual(
    ["FI182", "BG802", "BG928", "FI189"].map((code) => ({
      code,
      name: coursesByCode.get(code).name,
      credits: coursesByCode.get(code).credits,
      requirement: coursesByCode.get(code).eligibleRequirementIds[0],
    })),
    [
      { code: "FI182", name: "Iniciación a la Investigación", credits: 12, requirement: "research-initiation" },
      { code: "BG802", name: "Efi - Clubes de Ciencias Como Estrategia de Enseñanza", credits: 10, requirement: "training-practice" },
      { code: "BG928", name: "Mentorías Intergeneracionales (2021-", credits: 10, requirement: "training-practice" },
      { code: "FI189", name: "Prácticas de Formación", credits: 10, requirement: "training-practice" },
    ],
  );
  assert.equal(requirements.get("research-initiation").minCredits, 12);
  assert.equal(requirements.get("training-practice").minCredits, 10);
});

test("mantiene un catálogo por áreas sin inventar perfiles ni obligaciones masivas", () => {
  const pathway = plan.pathways["formacion-personalizada"];
  assert.deepEqual(pathway.periods.map(({ label }) => label), [
    "MATEMÁTICA",
    "FÍSICA",
    "ASTRONOMÍA",
    "MÉTODOS COMPUTACIONALES",
    "CIENCIAS SOCIALES Y HUMANAS",
    "EXPERIENCIAS DE FORMACIÓN",
    "ELECTIVAS",
    "OPTATIVAS",
    "Validación de egreso",
  ]);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [32, 33, 22, 8, 24, 4, 22, 41, 1]);
  assert.equal(plan.courses.length, 187);
  assert.equal(plan.rules.length, 175);
  assert.match(pathway.description, /no constituye una mención/i);
  const validation = plan.creditStructure.credentials[0].requiredCourseGroups.find(({ id }) => id === "validacion-final-plan");
  assert.match(validation.label, /Comisión de Carrera/i);
});
