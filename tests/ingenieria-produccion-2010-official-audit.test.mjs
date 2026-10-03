import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildRegisteredPlanPresentation, isRealCurricularCourse } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const PLAN_ID = "bedelias-fing-ingenieria-de-produccion-2010";
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson(`app/data/bedelias-generated/${PLAN_ID}.json`);
const reconciliation = await readJson("data/fing/ingenieria-produccion-2010-trayectorias.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const audit = registry.audits.find(({ identity }) => identity === "ingenieria de produccion:2010");
const reconciledPlan = reconciliation.plans.find(({ id }) => id === PLAN_ID);
const inventoryPlan = inventory.plans.find(({ planId }) => planId === PLAN_ID);
const credential = projection.creditStructure.credentials.find(({ id }) => id === "ingeniero-produccion");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const courseByCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));
const sourceIdForGeneratedId = (id) => courseById.get(id)?.bedeliasCode ?? id.replace(/^fing-/, "");

test("D03q publica una sola Ingeniería de Producción con siete opciones territoriales", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-degree-with-central-and-regional-initial-trajectories");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(projection.plan.degreeTitle, "Ingeniero de Producción");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 450);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), [
    "montevideo",
    "maldonado",
    "paysandu",
    "rivera",
    "rocha",
    "salto",
    "tacuarembo",
  ]);
  assert.deepEqual(Object.keys(projection.publishedPathways), reconciledPlan.trajectories.map(({ id }) => id));
});

test("reproduce exactamente la currícula sugerida vigente y representa el Proyecto anual una sola vez", () => {
  const expected = reconciledPlan.trajectories.find(({ id }) => id === "montevideo-curricula-sugerida");
  const projected = projection.publishedPathways[expected.id];

  assert.deepEqual(projected.periods.map(({ label }) => label), expected.periods.map(({ label }) => label));
  assert.deepEqual(
    projected.periods.map(({ courseIds }) => courseIds.map(sourceIdForGeneratedId)),
    expected.periods.map(({ courseIds }) => courseIds),
  );
  assert.equal(expected.periods.slice(1, -1).length, 19);
  assert.equal(expected.periods.slice(1, -1).flatMap(({ courseIds }) => courseIds).length, 65);
  assert.deepEqual(expected.periods.find(({ label }) => label === "Semestre 2 · obligatorias").courseIds.at(-1), "1375");
  assert.ok(expected.periods.find(({ label }) => label === "Semestre 6 · electivas sugeridas").courseIds.includes("2044"));
  assert.ok(expected.periods.find(({ label }) => label === "Semestre 8 · obligatorias").courseIds.includes("2039B"));
  assert.ok(!expected.periods.flatMap(({ courseIds }) => courseIds).includes("Q94"));

  const projectPeriods = projected.periods.filter(({ label }) => /Proyecto anual/i.test(label));
  assert.equal(projectPeriods.length, 1);
  assert.deepEqual(projectPeriods[0].courseIds.map((id) => courseById.get(id).bedeliasCode), ["2099"]);
  assert.equal(courseByCode.get("2099").credits, 30);
});

test("reproduce sólo los tramos regionales demostrados y conserva la continuidad explícita", () => {
  const expectations = [
    ["maldonado-inicial", 2, 8, /tercer semestre.*Montevideo/i],
    ["paysandu-inicial", 4, 17, /quinto semestre.*Montevideo/i],
    ["rivera-inicial", 2, 8, /tercer semestre.*Montevideo/i],
    ["rocha-inicial", 2, 8, /tercer semestre.*Montevideo/i],
    ["salto-inicial", 4, 17, /quinto semestre.*Montevideo/i],
    ["tacuarembo-inicial", 4, 16, /quinto semestre.*Montevideo/i],
  ];

  for (const [pathwayId, officialPeriodCount, officialPlacementCount, continuity] of expectations) {
    const expected = reconciledPlan.trajectories.find(({ id }) => id === pathwayId);
    const projected = projection.publishedPathways[pathwayId];
    assert.deepEqual(projected.campusIds, expected.campusIds);
    assert.deepEqual(projected.periods.map(({ label }) => label), expected.periods.map(({ label }) => label));
    assert.deepEqual(
      projected.periods.map(({ courseIds }) => courseIds.map(sourceIdForGeneratedId)),
      expected.periods.map(({ courseIds }) => courseIds),
    );
    assert.equal(expected.periods.slice(1, -1).length, officialPeriodCount);
    assert.equal(expected.periods.slice(1, -1).flatMap(({ courseIds }) => courseIds).length, officialPlacementCount);
    assert.match(projected.description, continuity);
    assert.ok(expected.periods.slice(1, -1).every(({ label }) => !/Montevideo/i.test(label)));
  }
  assert.match(projection.publishedPathways["paysandu-inicial"].description, /Paysandú y Salto/i);
  assert.match(projection.publishedPathways["salto-inicial"].description, /Salto y Paysandú/i);
});

test("controla mínimos, 50 créditos electivos y requisitos nominales de egreso", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.equal(requirements["production-basic"] + requirements["production-specific"] + requirements["production-industrial"] + requirements["production-integrative"], 400);
  assert.equal(credential.minTotalCredits - 400, 50);
  assert.equal(requirements["production-basic"] - (70 + 50 + 16 + 16), 8);
  assert.equal(requirements["production-specific"] - (60 + 30 + 20), 10);
  assert.equal(requirements["production-industrial"] - (7 * 5), 25);
  assert.equal(requirements["production-integrative"], 22 + 8 + 30);
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), [
    "validacion-final-plan",
    "produccion-pasantia-nominal",
    "produccion-proyecto-nominal",
  ]);
  assert.deepEqual(
    credential.requiredCourseGroups.find(({ id }) => id === "produccion-pasantia-nominal").courseIds.map((id) => courseById.get(id).bedeliasCode),
    ["2098"],
  );
  assert.deepEqual(
    credential.requiredCourseGroups.find(({ id }) => id === "produccion-proyecto-nominal").courseIds.map((id) => courseById.get(id).bedeliasCode),
    ["2099"],
  );
});

test("publica sólo 145 identidades reales verificadas y conserva 112 candidatos fuera del planificador", () => {
  const verifiedRealCourses = projection.courses.filter((course) => course.authorityStatus === "verified" && isRealCurricularCourse(course));
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");

  assert.equal(projection.courses.length, 262);
  assert.equal(projection.rules.length, 201);
  assert.equal(verifiedRealCourses.length, 145);
  assert.equal(candidates.length, 112);
  assert.equal(new Set(projection.courses.map(({ id }) => id)).size, projection.courses.length);
  assert.ok(projection.courses.every(({ creditAllocations }) => creditAllocations?.length > 0));

  for (const pathwayId of Object.keys(projection.publishedPathways)) {
    const presentation = buildRegisteredPlanPresentation(pathwayId, projection);
    assert.equal(presentation.generated, false);
    assert.equal(presentation.courses.filter(isRealCurricularCourse).length, 145);
    assert.equal(new Set(presentation.courses.map(({ id }) => id)).size, presentation.courses.length);
    assert.ok(presentation.courses.every(({ authorityStatus }) => authorityStatus === "verified"));
  }
});

test("traza las discrepancias vigentes sin promover códigos reemplazados", () => {
  assert.equal(courseByCode.get("1036").credits, 5);
  assert.equal(courseByCode.get("MI2").name, "Matemática Inicial");
  assert.equal(courseByCode.get("2039B").authorityStatus, "verified");
  assert.equal(courseByCode.get("2039").authorityStatus, "candidate");
  assert.equal(courseByCode.get("1322").authorityStatus, "candidate");
  assert.equal(courseByCode.get("1023").authorityStatus, "candidate");
  assert.equal(courseByCode.get("Q94").authorityStatus, "verified");

  const uncoded = projection.courses.find(({ name }) => name === "Aplicaciones solidarias basadas en sistemas de gestión de contenido");
  assert.equal(uncoded.credits, 4);
  assert.equal(uncoded.authorityStatus, "verified");
  assert.equal(uncoded.bedeliasCode, undefined);
});

test("registra diez fuentes con fecha y huella y demuestra 174 colocaciones", () => {
  assert.equal(reconciliation.reviewedAt, "2026-10-02");
  assert.equal(reconciledPlan.sources.length, 10);
  assert.ok(reconciledPlan.sources.every(({ authority, url, reviewedAt, contentHash }) =>
    authority && url.startsWith("https://") && reviewedAt === "2026-10-02" && /^sha256:[a-f0-9]{64}$/.test(contentHash)));
  assert.equal(inventoryPlan.state, "official-trajectory-reproduced");
  assert.equal(inventoryPlan.evidence.expectedCoursePlacements, 174);
  assert.equal(inventoryPlan.evidence.matchedCoursePlacements, 174);
  assert.equal(inventoryPlan.scope.pathwayIds.length, 7);
  assert.equal(inventoryPlan.scope.territories.length, 7);
});

test("ubica la carrera bajo FING y la mantiene cerrada al avanzar la cola", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-fing");
  const career = faculty.careers.find(({ label }) => label === "Ingeniería de Producción");
  assert.equal(career.plans[0].id, PLAN_ID);
  assert.equal(career.plans[0].defaultTrajectoryId, "montevideo-curricula-sugerida");
  assert.ok(!queue.queue.some(({ identity }) => identity === "ingenieria de produccion:2010"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 177);
  assert.equal(queue.counts.pendingCanonicalIdentities, 0);
  assert.equal(queue.queue.length, 0);
});
