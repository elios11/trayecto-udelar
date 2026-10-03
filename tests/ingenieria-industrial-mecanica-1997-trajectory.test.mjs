import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildRegisteredPlanPresentation, isRealCurricularCourse } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const PLAN_ID = "bedelias-fing-ingenieria-industrial-mecanica-1997";
const projection = await readJson(`app/data/bedelias-generated/${PLAN_ID}.json`);
const reconciliation = await readJson("data/fing/ingenieria-industrial-mecanica-1997-trayectorias.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const reconciledPlan = reconciliation.plans.find(({ id }) => id === PLAN_ID);
const inventoryPlan = inventory.plans.find(({ planId }) => planId === PLAN_ID);
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const courseByCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));
const sourceIdForGeneratedId = (id) => courseById.get(id)?.bedeliasCode ?? id.replace(/^fing-/, "");

test("D03p reproduce exactamente los tres perfiles guía 2016 sin repetir el Proyecto anual", () => {
  for (const pathwayId of ["perfil-fluidos-energia", "perfil-diseno-materiales", "perfil-ingenieria-planta"]) {
    const expected = reconciledPlan.trajectories.find(({ id }) => id === pathwayId);
    const projected = projection.publishedPathways[pathwayId];
    const projectedIds = projected.periods.flatMap(({ courseIds }) => courseIds);

    assert.equal(expected.periods.length, 11);
    assert.deepEqual(projected.periods.map(({ label }) => label), expected.periods.map(({ label }) => label));
    assert.deepEqual(
      projected.periods.map(({ courseIds }) => courseIds.map(sourceIdForGeneratedId)),
      expected.periods.map(({ courseIds }) => courseIds),
    );
    assert.equal(new Set(projectedIds).size, projectedIds.length);
    assert.equal(projectedIds.filter((id) => courseById.get(id)?.bedeliasCode === "2054").length, 1);
    assert.ok(projectedIds.every((id) => courseById.get(id)?.authorityStatus === "verified"));
  }
});

test("conserva por separado totales impresos, sumas de filas y créditos vigentes", () => {
  const expectations = [
    ["perfil-fluidos-energia", 436, 443, 439],
    ["perfil-diseno-materiales", 419, 426, 422],
    ["perfil-ingenieria-planta", 443, 450, 448],
  ];
  for (const [pathwayId, printed, rowSum, current] of expectations) {
    const pathway = projection.publishedPathways[pathwayId];
    const credits = pathway.periods.flatMap(({ courseIds }) => courseIds)
      .reduce((sum, id) => sum + courseById.get(id).credits, 0);
    assert.equal(credits, current);
    assert.match(pathway.description, new RegExp(`imprime ${printed}`));
    assert.match(pathway.description, new RegExp(`filas suman ${rowSum}`));
    assert.match(pathway.description, new RegExp(`vigentes suma ${current}`));
  }
  assert.equal(courseByCode.get("1810").credits, 10);
  assert.equal(courseByCode.get("1814").credits, 10);
  assert.equal(courseByCode.get("CP135").credits, 10);
});

test("reproduce sólo los tramos regionales demostrados y conserva la repetición de Tacuarembó como evidencia", () => {
  for (const pathwayId of ["paysandu-inicial", "tacuarembo-inicial"]) {
    const expected = reconciledPlan.trajectories.find(({ id }) => id === pathwayId);
    const projected = projection.publishedPathways[pathwayId];
    assert.deepEqual(projected.periods.map(({ label }) => label), expected.periods.map(({ label }) => label));
    assert.deepEqual(
      projected.periods.map(({ courseIds }) => courseIds.map(sourceIdForGeneratedId)),
      expected.periods.map(({ courseIds }) => courseIds),
    );
  }

  const paysandu = projection.publishedPathways["paysandu-inicial"];
  const tacuarembo = projection.publishedPathways["tacuarembo-inicial"];
  const tacuaremboSource = reconciledPlan.trajectories.find(({ id }) => id === "tacuarembo-inicial");
  const administrationId = projection.courses.find(({ name }) => name === "Administración y Gestión de las Organizaciones I (TAC)").id;

  assert.deepEqual(paysandu.periods.map(({ courseIds }) => courseIds.length), [5, 4, 5, 4]);
  assert.deepEqual(tacuarembo.periods.map(({ courseIds }) => courseIds.length), [5, 4, 4]);
  assert.equal(tacuarembo.periods.flatMap(({ courseIds }) => courseIds).filter((id) => id === administrationId).length, 1);
  assert.deepEqual(tacuaremboSource.documentedRepeatedPlacements[0].publishedPeriodLabels, [
    "Semestre 1 · Tacuarembó",
    "Semestre 3 · Tacuarembó",
  ]);
  assert.match(paysandu.description, /continúa en Montevideo/i);
  assert.match(tacuarembo.description, /cuentan una sola vez|cuenta una sola vez/i);
});

test("publica sólo las 84 identidades reales demostradas y conserva el resto como candidato", () => {
  const verifiedRealCourses = projection.courses.filter((course) => course.authorityStatus === "verified" && isRealCurricularCourse(course));
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");

  assert.equal(verifiedRealCourses.length, 84);
  assert.equal(candidates.length, 374);
  assert.equal(new Set(verifiedRealCourses.map(({ id }) => id)).size, 84);
  for (const code of ["2041", "1087", "1233", "2004"]) {
    assert.equal(courseByCode.get(code).authorityStatus, "candidate", code);
  }

  const presentation = buildRegisteredPlanPresentation("perfil-fluidos-energia", projection);
  assert.equal(presentation.generated, false);
  assert.equal(presentation.courses.filter(isRealCurricularCourse).length, 84);
  assert.equal(new Set(presentation.courses.map(({ id }) => id)).size, presentation.courses.length);
  assert.ok(presentation.courses.every(({ authorityStatus }) => authorityStatus === "verified"));

  const personalized = buildRegisteredPlanPresentation("curricula-personalizada", projection);
  assert.equal(personalized.generated, true);
  assert.ok(personalized.courses.every(({ authorityStatus }) => authorityStatus === "verified"));
});

test("los requisitos nominales sólo referencian identidades publicadas", () => {
  const credential = projection.creditStructure.credentials.find(({ id }) => id === "ingeniero-industrial-mecanico");
  for (const group of credential.requiredCourseGroups) {
    assert.ok(group.courseIds.every((id) => courseById.get(id).authorityStatus === "verified"), group.id);
  }
  assert.deepEqual(
    credential.requiredCourseGroups.find(({ id }) => id === "iim-proyecto-nominal").courseIds
      .map((id) => courseById.get(id).bedeliasCode),
    ["2054"],
  );
});

test("registra seis fuentes con fecha y huella y demuestra 157 colocaciones", () => {
  assert.equal(reconciliation.reviewedAt, "2026-10-01");
  assert.equal(reconciledPlan.sources.length, 6);
  assert.ok(reconciledPlan.sources.every(({ authority, url, reviewedAt, contentHash }) =>
    authority && url.startsWith("https://") && reviewedAt === "2026-10-01" && /^sha256:[a-f0-9]{64}$/.test(contentHash)));
  assert.equal(inventoryPlan.state, "official-trajectory-reproduced");
  assert.equal(inventoryPlan.evidence.expectedCoursePlacements, 157);
  assert.equal(inventoryPlan.evidence.matchedCoursePlacements, 157);
  assert.equal(inventoryPlan.scope.pathwayIds.length, 5);
});
