import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanCourses } from "../app/registered-plan-courses.mjs";
import { validateAtmosphericSciencesSource, validateAtmosphericSciencesProjection } from "../scripts/build-fcien-ciencias-atmosfera-2007.mjs";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const source = await readJson("data/fcien/ciencias-atmosfera-2007-trajectory-review.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-ciencias-de-la-atmosfera-2007.json");
const projection = await readJson(`app/data/bedelias-generated/${source.planId}.json`);
const inventory = (await readJson("data/official-trajectories/inventory.json")).plans.find(({ planId }) => planId === source.planId);

test("D03ay reproduce exactamente ocho semestres del ejemplo departamental y preserva identidades/cargas", () => {
  validateAtmosphericSciencesSource(source, snapshot);
  validateAtmosphericSciencesProjection(source, projection, inventory);
  assert.ok(!inventory.evidence.kind.includes("absence"));
  assert.deepEqual(inventory.evidence.pathways.map(({ periodCount }) => periodCount), [8]);
  assert.equal(inventory.evidence.expectedCoursePlacements, 32);
  assert.ok(!inventory.conflictNotes.some((note) => /no existe.*trayectoria/i.test(note)));
});

test("mantiene nueve materias sólo-fuente sin acreditar asientos cerrados, otra carga o código supuesto", () => {
  const courses = buildRegisteredPlanCourses("curriculo-personalizado", projection);
  assert.equal(courses.length, 47);
  assert.equal(new Set(courses.map(({ id }) => id)).size, 47);
  const protectedCodes = ["FI04", "FI048", "MA402", "MA485", "MA503", "GF02", "GF203", "FI15", "ME21", "MA430", "MA426", "FI184", "FI32"];
  for (const code of protectedCodes) {
    const record = projection.courses.find(({ bedeliasCode }) => bedeliasCode === code);
    assert.ok(record, code);
    assert.equal(record.authorityStatus, "candidate", code);
    assert.ok(!courses.some(({ id }) => id === record.id), code);
    assert.ok(!projection.publishedRules.some((rule) => JSON.stringify(rule).includes(record.id)), code);
  }
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "FI04").credits, 11);
  assert.equal(courses.find(({ sourceCourseId }) => sourceCourseId === "atmosfera-termodinamica").credits, 10);
  assert.equal(courses.find(({ sourceCourseId }) => sourceCourseId === "atmosfera-ingenieria-ambiental").creditsPublished, false);
  assert.ok(courses.every(({ offered }) => offered.length === 0), "Una secuencia no prueba oferta por período");
});

test("conserva cinco cupos optativos y el área de ciencia y sociedad sin inventar cargas ni acumular opciones", () => {
  const courses = buildRegisteredPlanCourses("curriculo-personalizado", projection);
  const blocks = courses.filter(({ curricularBlock, dataStatus }) => curricularBlock && dataStatus !== "manual-validation");
  assert.equal(blocks.length, 6);
  assert.ok(blocks.every(({ credits, creditsPublished }) => credits === 0 && creditsPublished === false));
  assert.equal(courses.filter(({ elective }) => elective).length, 14);
  assert.ok(courses.filter(({ elective }) => elective).every(({ semester }) => semester === "opt"));
  const credential = projection.creditStructure.credentials[0];
  assert.equal(credential.requiredCourseGroups.length, 1, "No convertir las 14 opciones en un núcleo obligatorio");
  assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 279);
  assert.equal(credential.minTotalCredits, 360);
  assert.ok(!projection.campuses.some(({ label }) => /Salto|Paysandú/.test(label)), "El CIO no crea una sede completa");
});

test("bloquea evidencia adulterada, promoción masiva y cambios de progreso", () => {
  const corruptSource = structuredClone(source);
  corruptSource.sourcePortions["department-plan"].rows[0][0] = 2;
  assert.throws(() => validateAtmosphericSciencesSource(corruptSource, snapshot), /Huella/);
  const wrongPeriod = structuredClone(source);
  wrongPeriod.trajectories[0].periods[0].courseIds.reverse();
  assert.throws(() => validateAtmosphericSciencesSource(wrongPeriod, snapshot), /Nombre de fila/);
  const wrongLoad = structuredClone(projection);
  wrongLoad.courses.find(({ bedeliasCode }) => bedeliasCode === "FI04").credits = 10;
  assert.throws(() => validateAtmosphericSciencesProjection(source, wrongLoad, inventory), /No alterar IDs ni cargas/);
  const promoted = structuredClone(projection);
  promoted.courses.find(({ bedeliasCode }) => bedeliasCode === "FI048").authorityStatus = "verified";
  assert.throws(() => validateAtmosphericSciencesProjection(source, promoted, inventory));
});
