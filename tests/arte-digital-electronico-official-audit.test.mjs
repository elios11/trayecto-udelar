import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fartes-licenciatura-en-arte-digital-y-electronico-2013.json");

test("normaliza Arte Digital como Plan 2014 de seis años y 480 créditos", () => {
  const audit = registry.audits.find((entry) => entry.identity === "licenciatura en arte digital y electronico:2013");
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.officialPlan.planYear, "2014");
  assert.deepEqual([plan.plan.durationMonths, plan.plan.minCredits], [72, 480]);
  assert.deepEqual(plan.campuses.map((campus) => campus.label), ["Montevideo"]);

  const faculty = catalog.find((candidate) => candidate.label === "Facultad de Artes");
  const career = faculty.careers.find((candidate) => candidate.label === "Licenciatura en Arte Digital y Electrónico");
  assert.deepEqual(career.plans.map((candidate) => candidate.label), ["Plan 2014 · vigente"]);
});

test("proyecta los 18 bloques oficiales sin exigir el catálogo histórico", () => {
  assert.equal(plan.courses.length, 18);
  assert.equal(plan.courses.reduce((sum, course) => sum + course.credits, 0), 480);
  assert.deepEqual(plan.pathways.bedelias.periods.map((period) => [period.label, period.courseIds.length]), [
    ["1.er año", 2],
    ["2.º año", 2],
    ["3.er año", 2],
    ["4.º año", 4],
    ["5.º año", 4],
    ["6.º año", 4],
  ]);
  assert.equal(plan.rules.length, 0);
  assert.ok(!plan.courses.some((course) => /Taller (?:Alejandro|Alonso|Bruzzone|Delgado|Kühne)/i.test(course.name)));

  const credential = plan.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]), [
    ["year-1", 80],
    ["year-2", 80],
    ["year-3", 80],
    ["year-4", 80],
    ["year-5", 80],
    ["year-6", 80],
  ]);
  const required = credential.requiredCourseGroups.find((group) => group.id === "official-curriculum");
  assert.deepEqual([required.minCompleted, required.courseIds.length], [18, 18]);
});

test("restaura optativas por año y exige el trabajo final", () => {
  const optionalBlocks = plan.courses.filter((course) => /Actividades optativas y electivas/.test(course.name));
  assert.deepEqual(optionalBlocks.map((course) => course.credits), [15, 15, 15, 15, 15]);
  const finalProject = plan.courses.find((course) => /Trabajo Final de Egreso/.test(course.name));
  assert.equal(finalProject.credits, 20);
  assert.deepEqual(finalProject.eligibleRequirementIds, ["year-6"]);
  assert.match(plan.plan.notice, /seis años y 480 créditos/i);
});
