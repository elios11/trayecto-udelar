import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcea-tecnico-en-administracion-2014.json");
const audit = registry.audits.find(({ identity }) => identity === "tecnico en administracion:2014");
const coursesById = new Map(plan.courses.map((course) => [course.id, course]));
const codes = (courseIds) => courseIds.map((id) => coursesById.get(id).bedeliasCode);

test("audita Técnico en Administración como una tecnicatura semiabierta de cinco semestres", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-semi-open-technical-degree-one-suggested-grid");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Técnico en Administración", 30, 225]);
  assert.deepEqual(Object.keys(plan.pathways), ["grilla-vigente"]);
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.equal(plan.creditStructure.credentials.length, 1);
});

test("controla seis mínimos por área y 40 créditos de libre distribución", () => {
  const credential = plan.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements.map(({ minCredits }) => minCredits), [60, 50, 20, 10, 30, 15, 40]);
  assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 225);
  assert.ok(plan.courses.every(({ eligibleRequirementIds }) => eligibleRequirementIds.includes("free-distribution")));
  assert.ok(plan.courses.every(({ eligibleRequirementIds }) => !eligibleRequirementIds.includes("plan-total")));
});

test("la grilla vigente orienta cinco semestres sin ocultar la oferta flexible", () => {
  const pathway = plan.pathways["grilla-vigente"];
  assert.deepEqual(pathway.periods.map(({ label }) => label), ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5"]);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [6, 3, 5, 14, 11]);
  const availableIds = new Set([...pathway.periods.flatMap(({ courseIds }) => courseIds), ...pathway.catalogCourseIds]);
  assert.deepEqual(availableIds, new Set(plan.courses.map(({ id }) => id)));
  assert.equal(plan.courses.length, 198);
});

test("exige las unidades obligatorias y modela correctamente las dos equivalencias", () => {
  const groups = new Map(plan.creditStructure.credentials[0].requiredCourseGroups.map((group) => [group.id, group]));
  assert.deepEqual([groups.get("ta-core-required").minCompleted, groups.get("ta-core-required").courseIds.length], [15, 15]);
  assert.deepEqual(codes(groups.get("ta-economics-required").courseIds), ["E10", "E11"]);
  assert.deepEqual(codes(groups.get("ta-calculus-first-half").courseIds), ["MC10", "114A"]);
  assert.deepEqual(codes(groups.get("ta-calculus-second-half").courseIds), ["MC10", "128A"]);
  assert.equal(groups.get("ta-calculus-first-half").courseIds[0], groups.get("ta-calculus-second-half").courseIds[0]);
});
