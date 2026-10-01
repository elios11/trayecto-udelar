import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildRegisteredPlanPresentation, isRealCurricularCourse } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const projection = await readJson("app/data/bedelias-generated/bedelias-fing-ingenieria-naval-1997.json");
const reconciliation = await readJson("data/fing/ingenieria-naval-1997-trayectorias.json");
const reconciledPlan = reconciliation.plans.find(({ identity }) => identity === "ingenieria naval:1997");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const courseByCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));

test("D03o reproduce las 45 colocaciones de la currícula sugerida 2017", () => {
  const expected = reconciledPlan.trajectories.find(({ id }) => id === "curricula-sugerida-2017");
  const projected = projection.publishedPathways[expected.id];
  const generatedIdToSourceId = new Map(projection.courses.map((course) => [course.id, course.bedeliasCode ?? course.id]));

  assert.equal(reconciliation.reviewedAt, "2026-09-30");
  assert.equal(expected.periods.length, 11);
  assert.equal(expected.periods.flatMap(({ courseIds }) => courseIds).length, 45);
  assert.deepEqual(projected.periods.map(({ label }) => label), expected.periods.map(({ label }) => label));
  assert.deepEqual(
    projected.periods.map(({ courseIds }) => courseIds.map((id) => generatedIdToSourceId.get(id))),
    expected.periods.map(({ courseIds }) => courseIds),
  );
});

test("representa Estructuras de Buques una sola vez como curso anual de 20 créditos", () => {
  const pathway = projection.publishedPathways["curricula-sugerida-2017"];
  const annualPeriod = pathway.periods.find(({ label }) => /anual/i.test(label));
  const annualCourse = courseByCode.get("2600");

  assert.deepEqual(annualPeriod.courseIds, [annualCourse.id]);
  assert.equal(annualCourse.credits, 20);
  assert.equal(pathway.periods.flatMap(({ courseIds }) => courseIds).filter((id) => id === annualCourse.id).length, 1);
});

test("mantiene 464 créditos vigentes y documenta los 466 de la guía histórica", () => {
  const pathway = projection.publishedPathways["curricula-sugerida-2017"];
  const credits = pathway.periods.flatMap(({ courseIds }) => courseIds)
    .reduce((sum, id) => sum + courseById.get(id).credits, 0);

  assert.equal(courseByCode.get("1810").credits, 10);
  assert.equal(credits, 464);
  assert.match(pathway.description, /466/);
  assert.match(pathway.description, /464/);
});

test("el planificador publica sólo las 45 identidades demostradas", () => {
  const verifiedRealCourses = projection.courses.filter((course) => course.authorityStatus === "verified" && isRealCurricularCourse(course));
  const candidateCourses = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");

  assert.equal(verifiedRealCourses.length, 45);
  assert.equal(candidateCourses.length, 281);
  assert.equal(new Set(verifiedRealCourses.map(({ id }) => id)).size, 45);

  for (const pathwayId of ["curricula-personalizada", "curricula-sugerida-2017"]) {
    const presentation = buildRegisteredPlanPresentation(pathwayId, projection);
    const realCourses = presentation.courses.filter(isRealCurricularCourse);
    assert.equal(presentation.generated, pathwayId === "curricula-personalizada");
    assert.equal(realCourses.length, 45);
    assert.equal(new Set(realCourses.map(({ id }) => id)).size, 45);
    assert.ok(presentation.courses.every(({ authorityStatus }) => authorityStatus !== "candidate"));
  }

  for (const code of ["CP318", "2041", "1087", "1233"]) {
    assert.equal(courseByCode.get(code).authorityStatus, "candidate", code);
  }
});

test("los requisitos nominales sólo referencian identidades publicadas", () => {
  const credential = projection.creditStructure.credentials.find(({ id }) => id === "ingeniero-naval");
  for (const group of credential.requiredCourseGroups) {
    assert.ok(group.courseIds.every((id) => courseById.get(id).authorityStatus === "verified"), group.id);
  }
  assert.deepEqual(
    credential.requiredCourseGroups.find(({ id }) => id === "naval-proyecto-nominal").courseIds
      .map((id) => courseById.get(id).bedeliasCode),
    ["2019"],
  );
});

test("registra autoridad, fecha y huella de los seis artefactos oficiales", () => {
  assert.equal(reconciledPlan.sources.length, 6);
  assert.ok(reconciledPlan.sources.every(({ authority, url, reviewedAt, contentHash }) =>
    authority && url.startsWith("https://") && reviewedAt === "2026-09-30" && /^sha256:[a-f0-9]{64}$/.test(contentHash)));
});
