import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-ciencias-biologicas-2017.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-ciencias-biologicas-2017.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en ciencias biologicas:2017");
const requirements = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));

test("normaliza un único Plan 2017 de Ciencias Biológicas en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-one-personalized-biological-pathway");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Ciencias Biológicas", 48, 360]);
  assert.deepEqual(plan.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "formacion-personalizada",
  }]);
  assert.equal(snapshot.plan.metadata.minCredits, 360);
  assert.deepEqual(Object.keys(plan.pathways), ["formacion-personalizada"]);
});

test("controla los tres mínimos raíz que completan exactamente 360 créditos", () => {
  const credential = plan.creditStructure.credentials[0];
  const rootRequirements = credential.nodeRequirements.filter(({ nodeId }) => requirements.get(nodeId).parentId === "plan-total");
  assert.deepEqual(rootRequirements, [
    { nodeId: "common", minCredits: 210 },
    { nodeId: "orientation", minCredits: 140 },
    { nodeId: "integral-practice", minCredits: 10 },
  ]);
  assert.equal(rootRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
});

test("conserva los submínimos comunes y el Trabajo Final dentro de orientación", () => {
  const credential = plan.creditStructure.credentials[0];
  assert.deepEqual(
    credential.nodeRequirements.filter(({ nodeId }) => requirements.get(nodeId).parentId === "common"),
    [
      { nodeId: "common-basic-science", minCredits: 90 },
      { nodeId: "common-cellular-molecular", minCredits: 40 },
      { nodeId: "common-biological-diversity", minCredits: 60 },
      { nodeId: "common-scientific-reflection", minCredits: 10 },
    ],
  );
  assert.deepEqual(
    credential.nodeRequirements.filter(({ nodeId }) => requirements.get(nodeId).parentId === "orientation"),
    [{ nodeId: "final-project", minCredits: 32 }],
  );
  const finalProject = plan.courses.find(({ bedeliasCode }) => bedeliasCode === "BG900");
  assert.deepEqual({ name: finalProject.name, credits: finalProject.credits, eligible: finalProject.eligibleRequirementIds }, {
    name: "Trabajo Final",
    credits: 32,
    eligible: ["final-project"],
  });
  const integralValidation = plan.courses.find(({ bedeliasCode }) => bedeliasCode === "SEPI");
  assert.deepEqual([integralValidation.credits, integralValidation.eligibleRequirementIds], [10, ["integral-practice"]]);
});

test("mantiene el catálogo por tramos sin inventar orientaciones certificadas", () => {
  const pathway = plan.pathways["formacion-personalizada"];
  assert.deepEqual(pathway.periods.map(({ label }) => label), [
    "Tramo común · Científico-Básica",
    "Tramo común · Biología Celular y Molecular",
    "Tramo común · Diversidad Biológica",
    "Tramo común · Reflexión Científica y Formación General",
    "Prácticas integrales · Tramo común",
    "Orientación · Científico-Básica",
    "Orientación · Biología Celular y Molecular",
    "Orientación · Diversidad Biológica",
    "Orientación · Reflexión Científica y Formación General",
    "Prácticas integrales · Tramo de orientación",
    "Trabajo final de carrera",
    "Validación de egreso",
  ]);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [77, 44, 84, 42, 39, 83, 175, 319, 64, 50, 1, 1]);
  assert.equal(plan.courses.length, 978);
  assert.equal(plan.rules.length, 897);
  assert.match(pathway.description, /no constituye una mención certificada/i);
  const validation = plan.creditStructure.credentials[0].requiredCourseGroups.find(({ id }) => id === "validacion-final-plan");
  assert.match(validation.label, /Comisión de Carrera/i);
});
