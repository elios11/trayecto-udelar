import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fartes-licenciatura-en-artes-dibujo-y-pintura-2002.json");

test("publica Dibujo y Pintura como una opción de seis años y 330 créditos", () => {
  const audit = registry.audits.find((entry) => entry.identity === "licenciatura en artes dibujo y pintura:2002");
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-option-degree-six-years-official-credit-blocks");
  assert.deepEqual([plan.plan.year, plan.plan.durationMonths, plan.plan.minCredits], ["2002", 72, 330]);
  assert.equal(plan.plan.degreeTitle, "Licenciado en Artes - Dibujo y Pintura");
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);
});

test("controla diez bloques sin acumular talleres o planes personales", () => {
  assert.equal(plan.courses.length, 10);
  assert.equal(plan.courses.reduce((sum, course) => sum + course.credits, 0), 330);
  assert.deepEqual(plan.pathways.bedelias.periods.map((period) => period.courseIds.length), [1, 1, 1, 2, 2, 3]);
  assert.deepEqual(plan.courses.filter((course) => /Plano en el Espacio/.test(course.name)).map((course) => course.credits), [50, 50, 30]);
  assert.equal(plan.courses.find((course) => /Trabajo Final/.test(course.name)).credits, 20);
  assert.equal(plan.rules.length, 0);
  assert.ok(!plan.courses.some((course) => /Alejandro|Alonso|Delgado|Kühne/i.test(course.name)));
  assert.match(plan.plan.notice, /no crea otra trayectoria o título/i);
});

test("exige seis mínimos anuales y los diez bloques normativos", () => {
  const credential = plan.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]), [
    ["year-1", 55], ["year-2", 55], ["year-3", 55], ["year-4", 55], ["year-5", 55], ["year-6", 55],
  ]);
  const required = credential.requiredCourseGroups.find(({ id }) => id === "official-curriculum");
  assert.deepEqual([required.minCompleted, required.courseIds.length], [10, 10]);
});
