import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const plan = JSON.parse(await readFile(new URL("../app/data/bedelias-generated/bedelias-fmed-tecnicatura-en-anatomia-patologica-2006.json", import.meta.url), "utf8"));

test("Anatomía Patológica conserva un solo Plan 2006 en ambas sedes", () => {
  assert.equal(plan.plan.degreeTitle, "Técnico en Anatomía Patológica");
  assert.equal(plan.plan.durationMonths, 36);
  assert.deepEqual(plan.campuses.map((campus) => campus.id), ["montevideo", "paysandu"]);
  assert.deepEqual(Object.keys(plan.pathways), ["bedelias"]);
});

test("proyecta las 13 unidades oficiales y las rotaciones sin créditos ficticios", () => {
  assert.equal(plan.plan.compositionAvailable, true);
  assert.equal(plan.plan.minCredits, 0);
  assert.equal(plan.courses.length, 13);
  assert.ok(plan.courses.every((course) => course.credits === 0));
  assert.deepEqual(plan.pathways.bedelias.periods.map(({ label, courseIds }) => [label, courseIds.length]), [
    ["Primer año", 7],
    ["Segundo año", 2],
    ["Tercer año", 4],
  ]);
  assert.ok(plan.courses.some((course) => course.name.startsWith("Curso I")));
  assert.ok(plan.courses.some((course) => course.name.startsWith("Curso II")));
  assert.ok(plan.courses.some((course) => course.name === "Rotaciones Prácticas"));
});
