import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildRegisteredPlanPresentation, isRealCurricularCourse } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const planId = "bedelias-fing-ingenieria-en-sistemas-de-comunicacion-2018";

const projection = await readJson(`app/data/bedelias-generated/${planId}.json`);
const reconciliation = await readJson("data/fing/ingenieria-sistemas-comunicacion-2018-trayectorias.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const reconciledPlan = reconciliation.plans.find(({ id }) => id === planId);
const inventoryPlan = inventory.plans.find(({ planId: candidate }) => candidate === planId);
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const pathwayIds = reconciledPlan.trajectories.map(({ id }) => id);

test("D03r reproduce exactamente 221 colocaciones en cinco trayectorias oficiales", () => {
  const generatedIdToSourceId = new Map(projection.courses.map((course) => [
    course.id,
    course.bedeliasCode ?? course.id.replace(/^fing-/, ""),
  ]));
  let placements = 0;

  for (const pathwayId of pathwayIds) {
    const expected = reconciledPlan.trajectories.find(({ id }) => id === pathwayId);
    const projected = projection.publishedPathways[pathwayId];
    assert.deepEqual(projected.periods.map(({ label }) => label), expected.periods.map(({ label }) => label));
    assert.deepEqual(
      projected.periods.map(({ courseIds }) => courseIds.map((id) => generatedIdToSourceId.get(id))),
      expected.periods.map(({ courseIds }) => courseIds),
    );
    placements += expected.periods.reduce((sum, { courseIds }) => sum + courseIds.length, 0);
  }

  assert.equal(placements, 221);
});

test("mantiene diez semestres, once con Matemática Inicial y Proyecto anual una sola vez", () => {
  for (const pathwayId of pathwayIds) {
    const pathway = projection.publishedPathways[pathwayId];
    const expectedSemesters = pathwayId === "curricula-con-matematica-inicial" ? 11 : 10;
    assert.equal(pathway.periods.filter(({ label }) => /^Semestre \d+$/.test(label)).length, expectedSemesters);
    assert.equal(pathway.periods.filter(({ label }) => /^Proyecto anual/.test(label)).length, 1);
    assert.equal(pathway.periods.flatMap(({ courseIds }) => courseIds).filter((id) => courseById.get(id).bedeliasCode === "2061").length, 1);
    assert.ok(pathway.catalogCourseIds.some((id) => courseById.get(id).bedeliasCode === "2062"));
  }
});

test("Matemática Inicial altera sólo la secuencia y no crea plan, título ni sede", () => {
  const mi = projection.courses.find(({ bedeliasCode }) => bedeliasCode === "MI2");
  const miPath = projection.publishedPathways["curricula-con-matematica-inicial"];
  assert.ok(miPath.periods.find(({ label }) => label === "Semestre 1").courseIds.includes(mi.id));
  for (const pathwayId of pathwayIds.filter((id) => id !== "curricula-con-matematica-inicial")) {
    assert.ok(!projection.publishedPathways[pathwayId].periods.flatMap(({ courseIds }) => courseIds).includes(mi.id));
  }
  assert.equal(projection.creditStructure.credentials.length, 1);
  assert.ok(pathwayIds.every((id) => projection.publishedPathways[id].credentialId === "ingeniero-sistemas-comunicacion"));
  assert.ok(pathwayIds.every((id) => projection.publishedPathways[id].campusIds.join() === "montevideo"));
});

test("el catálogo estricto publica 84 materias reales verificadas y ningún candidato", () => {
  const verifiedRealIds = projection.courses
    .filter((course) => course.authorityStatus === "verified" && isRealCurricularCourse(course))
    .map(({ id }) => id)
    .sort();
  assert.equal(verifiedRealIds.length, 84);

  for (const pathwayId of pathwayIds) {
    const presentation = buildRegisteredPlanPresentation(pathwayId, projection);
    assert.equal(presentation.generated, false);
    assert.deepEqual(presentation.courses.filter(isRealCurricularCourse).map(({ id }) => id).sort(), verifiedRealIds);
    assert.ok(presentation.courses.every(({ authorityStatus }) => authorityStatus === "verified"));
    assert.equal(new Set(presentation.courses.map(({ id }) => id)).size, presentation.courses.length);
  }
});

test("conserva bloques flexibles y tres identidades oficiales sin inventar códigos Bedelías", () => {
  const sourceBlocks = reconciledPlan.additionalCourses.filter(({ curricularBlock }) => curricularBlock);
  assert.equal(sourceBlocks.length, 26);
  assert.equal(new Set(sourceBlocks.map(({ id }) => id)).size, 26);
  for (const block of sourceBlocks) {
    const projected = projection.courses.find(({ id }) => id.endsWith(`-${block.id}`));
    assert.equal(projected.curricularBlock, true);
    assert.equal(projected.credits, 0);
    assert.equal(projected.authorityStatus, "verified");
  }

  const sourceOnly = reconciledPlan.additionalCourses.filter(({ curricularBlock }) => !curricularBlock);
  assert.equal(sourceOnly.length, 3);
  for (const course of sourceOnly) {
    const projected = projection.courses.find(({ id }) => id.endsWith(`-${course.id}`));
    assert.equal(projected.name, course.name);
    assert.equal(projected.bedeliasCode, undefined);
    assert.equal(projected.authorityStatus, "verified");
  }
});

test("preserva los créditos nominados y demuestra la reproducción en el inventario", () => {
  const expectedNamedCredits = {
    "perfil-general-personalizado": 383,
    "curricula-con-matematica-inicial": 387,
    "perfil-electronica-comunicaciones": 406,
    "perfil-redes-telecomunicaciones": 405,
    "perfil-procesamiento-informacion-senales": 416,
  };
  for (const [pathwayId, credits] of Object.entries(expectedNamedCredits)) {
    const actual = projection.publishedPathways[pathwayId].periods
      .flatMap(({ courseIds }) => courseIds)
      .reduce((sum, id) => sum + courseById.get(id).credits, 0);
    assert.equal(actual, credits);
  }
  assert.equal(inventoryPlan.state, "official-trajectory-reproduced");
  assert.equal(inventoryPlan.evidence.expectedCoursePlacements, 221);
  assert.equal(inventoryPlan.evidence.matchedCoursePlacements, 221);
  assert.deepEqual(inventoryPlan.scope.pathwayIds, pathwayIds);
});
