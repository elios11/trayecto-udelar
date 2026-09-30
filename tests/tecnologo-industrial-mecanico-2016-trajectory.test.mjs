import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildRegisteredPlanPresentation, isRealCurricularCourse } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-tecnologo-industrial-mecanico-2016.json");
const reconciliation = await readJson("data/fing/tecnologo-industrial-mecanico-2016-trayectorias.json");
const audit = registry.audits.find(({ identity }) => identity === "tecnologo industrial mecanico:2016");
const reconciledPlan = reconciliation.plans.find(({ identity }) => identity === audit.identity);
const courseById = new Map(projection.courses.map((course) => [course.id, course]));

test("D03m reproduce la colocación exacta de los cuatro perfiles en seis semestres", () => {
  assert.equal(audit.reviewedAt, "2026-09-30");
  const generatedIdToSourceId = new Map(projection.courses.map((course) => [
    course.id,
    course.bedeliasCode ?? course.id.replace(/^fing-/, ""),
  ]));

  for (const pathwayId of ["perfil-fluidos-energia", "perfil-diseno-materiales", "perfil-planta", "perfil-produccion"]) {
    const expected = reconciledPlan.trajectories.find(({ id }) => id === pathwayId);
    const projected = projection.publishedPathways[pathwayId];
    assert.deepEqual(projected.periods.map(({ label }) => label), expected.periods.map(({ label }) => label));
    assert.deepEqual(projected.periods.map(({ courseIds }) => courseIds.map((id) => generatedIdToSourceId.get(id))), expected.periods.map(({ courseIds }) => courseIds));
    assert.ok(projected.periods.flatMap(({ courseIds }) => courseIds).every((id) => courseById.get(id).authorityStatus === "verified"));
  }
});

test("los perfiles ofrecen las 43 unidades verificadas sin IDs duplicados", () => {
  const verifiedRealIds = projection.courses
    .filter((course) => course.authorityStatus === "verified" && isRealCurricularCourse(course))
    .map(({ id }) => id)
    .sort();
  assert.equal(verifiedRealIds.length, 43);
  assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).length, 44);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "TIM82").authorityStatus, "candidate");

  for (const pathwayId of ["perfil-fluidos-energia", "perfil-diseno-materiales", "perfil-planta", "perfil-produccion"]) {
    const presentation = buildRegisteredPlanPresentation(pathwayId, projection);
    assert.equal(presentation.generated, false);
    assert.equal(presentation.label, "Trayectoria oficial");
    assert.deepEqual(presentation.courses.filter(isRealCurricularCourse).map(({ id }) => id).sort(), verifiedRealIds);
    assert.equal(new Set(presentation.courses.map(({ id }) => id)).size, presentation.courses.length);
    assert.ok(!presentation.courses.some(({ bedeliasCode }) => bedeliasCode === "TIM82"));
  }
});

test("la currícula personalizada conserva la candidata recuperable sin conteo oficial", () => {
  const personalized = buildRegisteredPlanPresentation("curricula-personalizada", projection);
  assert.equal(personalized.generated, true);
  assert.match(personalized.description, /provisorio/i);
  const recoverable = personalized.courses.find(({ bedeliasCode }) => bedeliasCode === "TIM82");
  assert.equal(recoverable.provisional, true);
  assert.deepEqual(recoverable.creditAllocations, []);
  assert.deepEqual(recoverable.eligibleRequirementIds, []);
});

test("documenta las discrepancias sin ajustar aritméticamente los créditos", () => {
  const anomalyByField = new Map(audit.anomalies.map((anomaly) => [anomaly.field, anomaly.resolution]));
  assert.match(anomalyByField.get("materialsMinimum"), /42.*40/);
  assert.match(anomalyByField.get("instrumentationCredits"), /8.*10/);
  assert.match(anomalyByField.get("gasInstallationsCredits"), /10.*12/);
  assert.match(anomalyByField.get("campusElectives"), /no una disponibilidad idéntica/i);
  assert.match(anomalyByField.get("catalogBoundary"), /TIM82/);
});
