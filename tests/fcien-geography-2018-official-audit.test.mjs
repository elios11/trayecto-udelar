import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-geografia-2018.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en geografia:2018");

test("normaliza un único Plan 2018 de Geografía en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-one-flexible-geography-pathway");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Geografía", 48, 360]);
  assert.deepEqual(plan.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "trayectoria-flexible",
  }]);
  assert.deepEqual(audit.offerings.map(({ serviceCode }) => serviceCode), ["FCIEN"]);
  assert.deepEqual(Object.keys(plan.pathways), ["trayectoria-flexible"]);
});

test("controla los cinco mínimos, optativas, extensión y tesina por 360 créditos", () => {
  const credential = plan.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements, [
    { nodeId: "basic-general-knowledge", minCredits: 60 },
    { nodeId: "theoretical-methodological", minCredits: 45 },
    { nodeId: "socio-spatial", minCredits: 45 },
    { nodeId: "environmental-systems", minCredits: 40 },
    { nodeId: "geographic-information-technologies", minCredits: 30 },
    { nodeId: "electives", minCredits: 90 },
    { nodeId: "extension-community", minCredits: 10 },
    { nodeId: "thesis", minCredits: 40 },
  ]);
  assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
  const validation = credential.requiredCourseGroups.find(({ id }) => id === "validacion-final-plan");
  assert.match(validation.label, /propuesta de tesina.*mínimos de las cinco áreas/i);
});

test("mantiene el catálogo por bloques y una sola trayectoria de énfasis personal", () => {
  const pathway = plan.pathways["trayectoria-flexible"];
  assert.deepEqual(pathway.periods.map(({ label }) => label), [
    "Conocimientos básicos y generales",
    "Teórico-metodológica",
    "Socioespacial",
    "Sistemas ambientales",
    "Tecnologías de la Información Geográfica",
    "Optativas",
    "Extensión y actividades en el medio",
    "Tesina",
    "Validación de egreso",
  ]);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [38, 15, 18, 29, 11, 35, 20, 1, 1]);
  assert.equal(plan.courses.length, 168);
  assert.equal(plan.rules.length, 148);
  assert.match(pathway.description, /no fija orientaciones, menciones ni perfiles certificados/i);
  assert.match(audit.officialPlan.curriculum.pathwayDescription, /no prescribe semestres/i);
});
