import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fartes-licenciatura-en-artes-artes-plasticas-y-visuales-2002.json");

test("normaliza la Licenciatura en Artes Plásticas y Visuales a seis años y 330 créditos", () => {
  const audit = registry.audits.find((entry) => entry.identity === "licenciatura en artes artes plasticas y visuales:2002");
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-option-degree-six-years-official-credit-blocks");
  assert.deepEqual([plan.plan.year, plan.plan.durationMonths, plan.plan.minCredits], ["2002", 72, 330]);
  assert.deepEqual(plan.campuses.map((campus) => campus.label), ["Montevideo"]);
});

test("proyecta diez bloques oficiales y no suma talleres alternativos", () => {
  assert.equal(plan.courses.length, 10);
  assert.equal(plan.courses.reduce((sum, course) => sum + course.credits, 0), 330);
  assert.deepEqual(plan.pathways.bedelias.periods.map((period) => [period.label, period.courseIds.length]), [
    ["1.er año", 1],
    ["2.º año", 1],
    ["3.er año", 1],
    ["4.º año", 2],
    ["5.º año", 2],
    ["6.º año", 3],
  ]);
  assert.equal(plan.rules.length, 0);
  assert.ok(!plan.courses.some((course) => /Taller (?:Alejandro|Alonso|Bruzzone|Delgado|Kühne)/i.test(course.name)));

  const credential = plan.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]), [
    ["year-1", 55],
    ["year-2", 55],
    ["year-3", 55],
    ["year-4", 55],
    ["year-5", 55],
    ["year-6", 55],
  ]);
  const required = credential.requiredCourseGroups.find((group) => group.id === "official-curriculum");
  assert.deepEqual([required.minCompleted, required.courseIds.length], [10, 10]);
});

test("mantiene la orientación flexible y exige el Trabajo Final", () => {
  const workshopCredits = plan.courses
    .filter((course) => /Taller Paralelo de Libre Orientación/.test(course.name))
    .map((course) => course.credits);
  assert.deepEqual(workshopCredits, [50, 50, 30]);
  const finalProject = plan.courses.find((course) => /Trabajo Final de Egreso/.test(course.name));
  assert.equal(finalProject.credits, 20);
  assert.deepEqual(finalProject.eligibleRequirementIds, ["year-6"]);
  assert.match(plan.plan.notice, /no exige todas las cátedras históricas/i);
});
