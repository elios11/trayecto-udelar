import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-biologia-humana-2004.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-biologia-humana-2004.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura biologia humana:2004");

test("normaliza Biología Humana como un solo título interservicios con cinco sedes", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-shared-degree-one-personalized-curriculum-multiple-locations");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Biología Humana", 48, 360]);
  assert.equal(snapshot.plan.metadata.duration, "60 meses");
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo", "Salto", "Paysandú", "Rivera", "Tacuarembó"]);
  assert.ok(plan.campuses.every(({ defaultPathwayId }) => defaultPathwayId === "curriculo-personalizado"));

  const faculty = catalog.find(({ label }) => label === "Facultad de Ciencias");
  const career = faculty.careers.find(({ label }) => label === "Licenciatura en Biología Humana");
  assert.deepEqual(career.plans.map(({ label }) => label), ["Plan 2004 · vigente"]);
});

test("controla los cuatro mínimos oficiales que completan los 360 créditos", () => {
  const credential = plan.creditStructure.credentials[0];
  assert.equal(credential.minTotalCredits, 360);
  assert.deepEqual(
    Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits])),
    {
      "basic-sciences": 79,
      "biological-sciences": 133,
      "social-humanistic-sciences": 29,
      "specific-orientation": 119,
    },
  );
  assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);

  const officialCourses = plan.courses.filter(({ dataStatus }) => dataStatus !== "manual-validation");
  assert.equal(officialCourses.length, 2032);
  assert.ok(officialCourses.every(({ eligibleRequirementIds }) => eligibleRequirementIds.length === 1));
  assert.ok(officialCourses.every(({ eligibleRequirementIds }) => eligibleRequirementIds[0] !== "plan-total"));
});

test("presenta un currículo personal por áreas y exige la pasantía validada", () => {
  assert.deepEqual(Object.keys(plan.pathways), ["curriculo-personalizado"]);
  const pathway = plan.pathways["curriculo-personalizado"];
  assert.deepEqual(pathway.periods.map(({ label }) => label), [
    "CIENCIAS BASICAS",
    "CIENCIAS BIOLOGICAS",
    "CS. SOCIALES Y HUMANISTICAS",
    "ORIENTACION ESPECIFICA",
    "Validación de egreso",
  ]);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [385, 711, 365, 571, 1]);
  assert.deepEqual(pathway.campusIds, ["montevideo", "salto", "paysandu", "rivera", "tacuarembo"]);

  const validation = plan.creditStructure.credentials[0].requiredCourseGroups.find(({ id }) => id === "validacion-final-plan");
  assert.equal(validation.minCompleted, 1);
  assert.match(validation.label, /pasantía mínima de 120 horas/i);
  const validationCourse = plan.courses.find(({ id }) => validation.courseIds.includes(id));
  assert.equal(validationCourse.dataStatus, "manual-validation");
  assert.equal(validationCourse.credits, 0);
});

test("conserva únicamente las previaturas publicadas y no inventa perfiles", () => {
  assert.equal(plan.rules.length, 88);
  assert.ok(plan.rules.every(({ expression }) => expression.parserStatus === "parsed"));
  assert.equal(plan.pathways["curriculo-personalizado"].label, "Currículo personalizado");
  assert.match(plan.pathways["curriculo-personalizado"].description, /no es una mención prefijada/i);
  assert.match(plan.plan.notice, /Comisión Curricular/i);
});
