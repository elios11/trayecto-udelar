import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const plan = JSON.parse(await readFile(new URL("../app/data/bedelias-generated/bedelias-fmed-licenciatura-en-imagenologia-2006.json", import.meta.url), "utf8"));

test("Imagenología conserva un plan con sedes completas y tramo avanzado explícitos", () => {
  assert.equal(plan.plan.year, "2006");
  assert.equal(plan.plan.degreeTitle, "Licenciado en Imagenología");
  assert.equal(plan.plan.durationMonths, 48);
  assert.deepEqual(plan.campuses.map(({ id, label }) => ({ id, label })), [
    { id: "montevideo-carrera-completa", label: "Montevideo · Carrera Completa" },
    { id: "paysandu-carrera-completa", label: "Paysandú · Carrera Completa" },
    { id: "rio-negro-3-er-y-4-ano", label: "Río Negro · 3.er y 4.º Año" },
  ]);
  assert.deepEqual(Object.keys(plan.pathways), ["bedelias"]);
});

test("proyecta exclusivamente las 29 unidades oficiales sin convertir horas a créditos", () => {
  assert.equal(plan.plan.compositionAvailable, true);
  assert.equal(plan.plan.minCredits, 0);
  assert.equal(plan.courses.length, 29);
  assert.ok(plan.courses.every((course) => course.credits === 0));
  assert.deepEqual(plan.pathways.bedelias.periods.map(({ label, courseIds }) => [label, courseIds.length]), [
    ["Primer año", 13],
    ["Segundo año", 7],
    ["Tercer año", 6],
    ["Cuarto año", 3],
  ]);
  assert.ok(plan.courses.some((course) => course.name === "Protección radiológica y control de calidad"));
  assert.ok(plan.courses.some((course) => course.name === "Internado"));
  assert.ok(plan.courses.some((course) => course.name === "Monografía"));
  assert.match(plan.source.planDocument, /fmed\.edu\.uy/);
});
