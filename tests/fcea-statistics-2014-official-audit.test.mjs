import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcea-licenciatura-en-estadistica-2014.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en estadistica:2014");

test("audita Estadística como un título con cuatro perfiles de especialización", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-four-specialization-profiles");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Estadística", 48, 360]);
  assert.deepEqual(Object.keys(plan.pathways), ["actuarial-demografico", "bioestadistico", "economia", "tecnologico"]);
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.equal(plan.creditStructure.credentials.length, 4);
  assert.ok(plan.creditStructure.credentials.every(({ title }) => title.startsWith("Licenciado en Estadística · Perfil ")));
});

test("aplica a cada perfil los 290 créditos mínimos por áreas y 70 de libre distribución", () => {
  for (const credential of plan.creditStructure.credentials) {
    assert.deepEqual(credential.nodeRequirements.map(({ minCredits }) => minCredits), [85, 85, 30, 60, 10, 20, 70]);
    assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
  }
  assert.ok(plan.courses.every(({ eligibleRequirementIds }) => eligibleRequirementIds.includes("free-distribution")));
  assert.ok(plan.courses.every(({ eligibleRequirementIds }) => !eligibleRequirementIds.includes("plan-total")));
});

test("cada perfil conserva su grilla y deja disponible el catálogo completo", () => {
  assert.equal(plan.courses.length, 263);
  const allCourseIds = new Set(plan.courses.map(({ id }) => id));
  const grids = [];

  for (const pathway of Object.values(plan.pathways)) {
    const gridIds = pathway.periods.flatMap(({ courseIds }) => courseIds);
    const availableIds = new Set([...gridIds, ...(pathway.catalogCourseIds ?? [])]);
    assert.deepEqual(availableIds, allCourseIds);
    assert.equal(new Set(gridIds).size + pathway.catalogCourseIds.length, allCourseIds.size);
    grids.push([...new Set(gridIds)].sort());
  }

  assert.equal(new Set(grids.map((ids) => JSON.stringify(ids))).size, 4);
});
