import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const plan = JSON.parse(await readFile(new URL("../app/data/bedelias-generated/bedelias-fmed-tecnicatura-en-hemoterapia-2006.json", import.meta.url), "utf8"));

test("Hemoterapia conserva el Plan 2006 sólo en las sedes vigentes", () => {
  assert.equal(plan.plan.degreeTitle, "Técnico en Hemoterapia");
  assert.equal(plan.plan.durationMonths, 36);
  assert.deepEqual(plan.campuses.map((campus) => campus.id), ["montevideo", "paysandu"]);
  assert.ok(!plan.campuses.some((campus) => campus.id === "rocha"));
  assert.deepEqual(Object.keys(plan.pathways), ["bedelias"]);
});

test("proyecta las 21 unidades oficiales sin créditos ficticios", () => {
  assert.equal(plan.plan.compositionAvailable, true);
  assert.equal(plan.plan.minCredits, 0);
  assert.equal(plan.courses.length, 21);
  assert.ok(plan.courses.every((course) => course.credits === 0));
  assert.deepEqual(plan.pathways.bedelias.periods.map(({ label, courseIds }) => [label, courseIds.length]), [
    ["Primer año", 11],
    ["Segundo año", 8],
    ["Tercer año", 2],
  ]);
  assert.ok(plan.courses.some((course) => course.name === "Inmunología y genética"));
  assert.ok(plan.courses.some((course) => course.name === "Hemoterapia IV"));
});
