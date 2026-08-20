import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const plan = JSON.parse(await readFile(new URL("../app/data/bedelias-generated/bedelias-fmed-licenciatura-en-laboratorio-clinico-2006.json", import.meta.url), "utf8"));

test("Laboratorio Clínico conserva un solo Plan 2006 en ambas sedes", () => {
  assert.equal(plan.plan.degreeTitle, "Licenciado en Laboratorio Clínico");
  assert.equal(plan.plan.durationMonths, 48);
  assert.deepEqual(plan.campuses.map((campus) => campus.id), ["montevideo", "paysandu"]);
  assert.deepEqual(Object.keys(plan.pathways), ["bedelias"]);
});

test("proyecta las 28 unidades oficiales sin convertir horas en créditos", () => {
  assert.equal(plan.plan.compositionAvailable, true);
  assert.equal(plan.plan.minCredits, 0);
  assert.equal(plan.courses.length, 28);
  assert.ok(plan.courses.every((course) => course.credits === 0));
  assert.deepEqual(plan.pathways.bedelias.periods.map(({ label, courseIds }) => [label, courseIds.length]), [
    ["Primer año", 13],
    ["Segundo año", 7],
    ["Tercer año", 5],
    ["Cuarto año", 3],
  ]);
  assert.ok(plan.courses.some((course) => course.name === "Bioquímica Clínica"));
  assert.ok(plan.courses.some((course) => course.name === "Internado"));
  assert.ok(plan.courses.some((course) => course.name === "Monografía"));
});
