import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildRegisteredPlanPresentation, isRealCurricularCourse } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cure-tecnologo-en-telecomunicaciones-2009.json");
const reconciliation = await readJson("data/fing/tecnologo-telecomunicaciones-2009-trayectorias.json");
const audit = registry.audits.find(({ identity }) => identity === "tecnologo en telecomunicaciones:2009");
const reconciledPlan = reconciliation.plans.find(({ identity }) => identity === audit.identity);
const courseById = new Map(projection.courses.map((course) => [course.id, course]));

test("D03n reproduce las 28 colocaciones conocidas sin agregar períodos", () => {
  assert.equal(audit.reviewedAt, "2026-09-30");
  const generatedIdToSourceId = new Map(projection.courses.map((course) => [
    course.id,
    course.bedeliasCode ?? course.id.replace(/^cure-/, ""),
  ]));

  let placements = 0;
  for (const pathwayId of ["curricula-rocha", "primer-ano-montevideo"]) {
    const expected = reconciledPlan.trajectories.find(({ id }) => id === pathwayId);
    const projected = projection.publishedPathways[pathwayId];
    assert.deepEqual(projected.periods.map(({ label }) => label), expected.periods.map(({ label }) => label));
    assert.deepEqual(projected.periods.map(({ courseIds }) => courseIds.map((id) => generatedIdToSourceId.get(id))), expected.periods.map(({ courseIds }) => courseIds));
    placements += expected.periods.flatMap(({ courseIds }) => courseIds).length;
  }

  assert.equal(placements, 28);
  assert.equal(projection.publishedPathways["curricula-rocha"].periods.length, 5);
  assert.equal(projection.publishedPathways["primer-ano-montevideo"].periods.length, 2);
});

test("el planificador reúne las 21 identidades verificadas sin duplicados", () => {
  const verifiedRealIds = projection.courses
    .filter((course) => course.authorityStatus === "verified" && isRealCurricularCourse(course))
    .map(({ id }) => id)
    .sort();
  assert.equal(verifiedRealIds.length, 21);
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length, 16);

  const rocha = buildRegisteredPlanPresentation("curricula-rocha", projection);
  assert.equal(rocha.generated, false);
  assert.equal(rocha.label, "Trayectoria oficial");
  assert.deepEqual(rocha.courses.filter(isRealCurricularCourse).map(({ id }) => id).sort(), verifiedRealIds);
  assert.equal(new Set(rocha.courses.map(({ id }) => id)).size, rocha.courses.length);
  assert.ok(rocha.courses.some(({ bedeliasCode }) => bedeliasCode === "TTR18"));
  assert.ok(rocha.courses.some(({ bedeliasCode }) => bedeliasCode === "TTR19"));
  assert.ok(rocha.courses.every(({ authorityStatus }) => authorityStatus !== "candidate"));

  const montevideo = buildRegisteredPlanPresentation("primer-ano-montevideo", projection);
  assert.equal(montevideo.generated, false);
  assert.equal(new Set(montevideo.courses.map(({ id }) => id)).size, montevideo.courses.length);
  assert.equal(montevideo.courses.filter(isRealCurricularCourse).length, 21);
  assert.equal(montevideo.courses.filter((course) => isRealCurricularCourse(course) && course.semester !== "opt").length, 8);
  assert.ok(montevideo.periods.flatMap(({ courseIds }) => courseIds)
    .every((id) => !["TTR18", "TTR19"].includes(courseById.get(id).bedeliasCode)));
  assert.match(montevideo.description, /continúa.*Rocha/i);
});

test("mantiene 200 créditos aunque la grilla con una actividad final sume 199", () => {
  const rocha = projection.publishedPathways["curricula-rocha"];
  const gridCredits = rocha.periods.flatMap(({ courseIds }) => courseIds)
    .reduce((sum, id) => sum + courseById.get(id).credits, 0);
  assert.equal(gridCredits, 185);

  const alternatives = ["TTR18", "TTR19"].map((code) => projection.courses.find(({ bedeliasCode }) => bedeliasCode === code));
  assert.deepEqual(alternatives.map(({ credits }) => credits), [14, 14]);
  assert.equal(gridCredits + alternatives[0].credits, 199);
  assert.equal(projection.plan.minCredits, 200);
  assert.match(rocha.description, /199.*200|200.*199/i);
});

test("registra autoridad, fecha y huella de los cuatro artefactos oficiales", () => {
  assert.equal(reconciledPlan.sources.length, 4);
  assert.ok(reconciledPlan.sources.every(({ authority, url, reviewedAt, contentHash }) =>
    authority && url.startsWith("https://") && reviewedAt === "2026-09-30" && /^sha256:[a-f0-9]{64}$/.test(contentHash)));
});
