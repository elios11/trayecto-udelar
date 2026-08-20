import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const plan = JSON.parse(await readFile(new URL("../app/data/bedelias-generated/bedelias-fmed-licenciatura-en-fisioterapia-2006.json", import.meta.url), "utf8"));

test("Fisioterapia conserva un solo Plan 2006 en Montevideo y Paysandú", () => {
  assert.equal(plan.plan.year, "2006");
  assert.equal(plan.plan.degreeTitle, "Licenciado en Fisioterapia");
  assert.equal(plan.plan.durationMonths, 48);
  assert.deepEqual(plan.campuses.map((campus) => campus.id), ["montevideo", "paysandu"]);
  assert.deepEqual(Object.keys(plan.pathways), ["bedelias"]);
  assert.deepEqual(plan.pathways.bedelias.campusIds, ["montevideo", "paysandu"]);
});

test("proyecta las 29 unidades oficiales sin inventar créditos del plan futuro", () => {
  assert.equal(plan.plan.compositionAvailable, true);
  assert.equal(plan.plan.minCredits, 0);
  assert.equal(plan.plan.publishedMinCredits, null);
  assert.equal(plan.courses.length, 29);
  assert.ok(plan.courses.every((course) => course.credits === 0));
  assert.deepEqual(plan.pathways.bedelias.periods.map(({ label, courseIds }) => [label, courseIds.length]), [
    ["Primer año", 13],
    ["Segundo año", 5],
    ["Tercer año", 5],
    ["Cuarto año", 6],
  ]);
  assert.deepEqual(plan.creditStructure.credentials[0].requiredCourseGroups.map(({ minCompleted, courseIds }) => [minCompleted, courseIds.length]), [
    [13, 13],
    [5, 5],
    [5, 5],
    [6, 6],
  ]);
  assert.ok(plan.courses.some((course) => course.name === "Internado (Fisioterapia)"));
  assert.ok(plan.courses.some((course) => course.name === "Monografía"));
  assert.match(plan.source.planDocument, /fmed\.edu\.uy/);
});
