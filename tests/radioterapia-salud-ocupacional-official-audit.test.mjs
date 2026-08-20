import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readPlan = async (name) => JSON.parse(await readFile(new URL(`../app/data/bedelias-generated/bedelias-fmed-tecnicatura-en-${name}-2006.json`, import.meta.url), "utf8"));
const radiotherapy = await readPlan("radioterapia");
const occupationalHealth = await readPlan("salud-ocupacional");

test("Radioterapia muestra el título vigente y no reactiva una sede histórica", () => {
  assert.equal(radiotherapy.plan.degreeTitle, "Tecnólogo en Radioterapia");
  assert.equal(radiotherapy.plan.durationMonths, 36);
  assert.deepEqual(radiotherapy.campuses.map((campus) => campus.id), ["montevideo"]);
  assert.equal(radiotherapy.courses.length, 21);
  assert.ok(radiotherapy.courses.every((course) => course.credits === 0));
  assert.deepEqual(radiotherapy.pathways.bedelias.periods.map(({ courseIds }) => courseIds.length), [11, 9, 1]);
  assert.ok(radiotherapy.courses.some((course) => course.name === "Curso Práctico de Radioterapia"));
});

test("Salud Ocupacional comparte una única malla entre Montevideo y Paysandú", () => {
  assert.equal(occupationalHealth.plan.degreeTitle, "Tecnólogo en Salud Ocupacional");
  assert.equal(occupationalHealth.plan.durationMonths, 36);
  assert.deepEqual(occupationalHealth.campuses.map((campus) => campus.id), ["montevideo", "paysandu"]);
  assert.equal(occupationalHealth.courses.length, 20);
  assert.ok(occupationalHealth.courses.every((course) => course.credits === 0));
  assert.deepEqual(occupationalHealth.pathways.bedelias.periods.map(({ courseIds }) => courseIds.length), [11, 3, 6]);
  assert.ok(occupationalHealth.courses.some((course) => course.name === "Monografía"));
});
