import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const plan = JSON.parse(await readFile(new URL("../app/data/bedelias-generated/bedelias-fmed-tecnicatura-en-podologia-2006.json", import.meta.url), "utf8"));

test("Podología conserva un único Plan 2006 para las dos sedes vigentes", () => {
  assert.equal(plan.plan.degreeTitle, "Técnico en Podología");
  assert.equal(plan.plan.durationMonths, 36);
  assert.deepEqual(plan.campuses.map((campus) => campus.id), ["montevideo", "paysandu"]);
  assert.deepEqual(Object.keys(plan.pathways), ["bedelias"]);
});

test("proyecta las 23 unidades oficiales sin créditos ficticios", () => {
  assert.equal(plan.plan.compositionAvailable, true);
  assert.equal(plan.plan.minCredits, 0);
  assert.equal(plan.courses.length, 23);
  assert.ok(plan.courses.every((course) => course.credits === 0));
  assert.deepEqual(plan.pathways.bedelias.periods.map(({ label, courseIds }) => [label, courseIds.length]), [
    ["Primer año", 10],
    ["Segundo año", 8],
    ["Tercer año", 5],
  ]);
  assert.ok(plan.courses.some((course) => course.name === "Introducción a la Práctica Podológica"));
  assert.ok(plan.courses.some((course) => course.name === "Educación Sanitaria y Prácticas Asistenciales"));
});
