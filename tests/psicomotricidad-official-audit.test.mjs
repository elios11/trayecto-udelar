import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const plan = JSON.parse(await readFile(new URL("../app/data/bedelias-generated/bedelias-fmed-licenciatura-en-psicomotricidad-2006.json", import.meta.url), "utf8"));

test("Psicomotricidad conserva un solo Plan 2006 en ambas sedes", () => {
  assert.equal(plan.plan.degreeTitle, "Licenciado en Psicomotricidad");
  assert.equal(plan.plan.durationMonths, 48);
  assert.deepEqual(plan.campuses.map((campus) => campus.id), ["montevideo", "paysandu"]);
  assert.deepEqual(Object.keys(plan.pathways), ["bedelias"]);
});

test("proyecta las 26 unidades oficiales sin convertir horas en créditos", () => {
  assert.equal(plan.plan.compositionAvailable, true);
  assert.equal(plan.plan.minCredits, 0);
  assert.equal(plan.courses.length, 26);
  assert.ok(plan.courses.every((course) => course.credits === 0));
  assert.deepEqual(plan.pathways.bedelias.periods.map(({ label, courseIds }) => [label, courseIds.length]), [
    ["Primer año", 12],
    ["Segundo año", 4],
    ["Tercer año", 4],
    ["Cuarto año", 6],
  ]);
  assert.ok(plan.courses.some((course) => course.name === "Desarrollo psicomotor"));
  assert.ok(plan.courses.some((course) => course.name.startsWith("Psicomotricidad III")));
  assert.ok(plan.courses.some((course) => course.name === "Monografía"));
});
