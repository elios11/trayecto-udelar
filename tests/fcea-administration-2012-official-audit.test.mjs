import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const source = await readJson("data/fcea/administracion-2012-trayectoria.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcea-licenciatura-en-administracion-2012.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en administracion:2012");
const nodesById = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));
const coursesById = new Map(plan.courses.map((course) => [course.id, course]));
const coursesByCode = new Map(plan.courses.flatMap((course) => course.bedeliasCode ? [[course.bedeliasCode, course]] : []));
const sourceCourseIds = new Map(source.courses.map((course) => [
  course.sourceId,
  course.projectionCourseId ?? coursesByCode.get(course.bedeliasCode)?.id,
]));

const projectSourcePeriods = (trajectory) => trajectory.periods.map(({ label, courseIds }) => ({
  label,
  courseIds: courseIds.map((sourceId) => sourceCourseIds.get(sourceId)),
}));

test("audita Administración como un título flexible con grilla y dos guías sugeridas", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-flexible-degree-one-grid-two-suggested-guides");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Administración", 48, 360]);
  assert.deepEqual(Object.keys(plan.publishedPathways), ["personalizada", "gestion-de-personas", "marketing"]);
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.equal(plan.creditStructure.credentials.length, 1);
  assert.equal(source.source.effectiveAt, "2026-07");
});

test("reproduce exactamente los ocho semestres y no duplica filas de doble dictado", () => {
  for (const trajectory of source.trajectories) {
    assert.deepEqual(plan.publishedPathways[trajectory.id].periods, projectSourcePeriods(trajectory), trajectory.id);
    const projectedIds = plan.publishedPathways[trajectory.id].periods.flatMap(({ courseIds }) => courseIds);
    assert.equal(new Set(projectedIds).size, projectedIds.length, trajectory.id);
  }
  assert.deepEqual(
    source.trajectories.map(({ id, periods }) => [id, periods.length, periods.flatMap(({ courseIds }) => courseIds).length]),
    [["personalizada", 8, 98], ["gestion-de-personas", 8, 28], ["marketing", 8, 27]],
  );
  const activityId = "fcea-actividades-difusion-administracion";
  assert.equal(plan.publishedPathways.personalizada.periods.flatMap(({ courseIds }) => courseIds).filter((id) => id === activityId).length, 1);
  assert.ok(source.mainGrid.periods[2].sourceRows.some(({ gridLabel, canonicalSourceId }) => gridLabel === "UADA5" && canonicalSourceId === "actividades-difusion-administracion"));
});

test("publica sólo las 100 identidades verificadas y preserva IDs de progreso", () => {
  assert.equal(plan.courses.length, 100);
  assert.ok(plan.courses.every(({ authorityStatus }) => authorityStatus === "verified"));
  assert.equal(coursesByCode.get("A10").id, "fcea-a10-2");
  assert.equal(coursesByCode.get("A80").id, "fcea-a80-2");
  assert.ok(audit.officialPlan.curriculum.strictOfficialCourseIds);
  assert.equal(audit.officialPlan.curriculum.verifiedCourseIds.length, 98);
  assert.equal(audit.officialPlan.curriculum.excludedSourceCourseIds.length, 306);

  const allCourseIds = new Set(plan.courses.map(({ id }) => id));
  for (const pathway of Object.values(plan.publishedPathways)) {
    const availableIds = new Set([...pathway.periods.flatMap(({ courseIds }) => courseIds), ...pathway.catalogCourseIds]);
    assert.deepEqual(availableIds, allCourseIds);
  }
});

test("mantiene las alternativas fuera del núcleo obligatorio acumulativo", () => {
  const credential = plan.creditStructure.credentials[0];
  const fixed = credential.requiredCourseGroups.find(({ id }) => id === "administracion-obligatorias-fijas");
  assert.equal(fixed.minCompleted, 22);
  assert.equal(fixed.courseIds.length, 22);
  for (const code of ["MC10", "114A", "128A", "E10", "E11"]) assert.ok(!fixed.courseIds.includes(coursesByCode.get(code).id), code);
  assert.deepEqual(source.mainGrid.periods[0].blocks.map(({ id, courseIds }) => [id, courseIds.length]), [
    ["obligatorias", 2],
    ["alternativas", 5],
  ]);

  const rootRequirements = credential.nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId === "plan-total");
  assert.deepEqual(rootRequirements.map(({ minCredits }) => minCredits), [120, 60, 45, 40, 20, 20, 15, 40]);
  assert.equal(rootRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
  assert.deepEqual(
    credential.nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId !== "plan-total").map(({ minCredits }) => minCredits),
    [80, 40, 30, 40, 10, 10],
  );
});

test("conserva UADA e I20 como identidades de fuente separadas y explicita la limitación repetible", () => {
  const activity = coursesById.get("fcea-actividades-difusion-administracion");
  const collaborative = coursesById.get("fcea-investigacion-colaborativa-gestion-personas");
  assert.equal(activity.bedeliasCode, undefined);
  assert.equal(collaborative.bedeliasCode, undefined);
  assert.equal(activity.credits, 5);
  assert.equal(collaborative.credits, 5);
  assert.ok(audit.officialPlan.curriculum.excludedSourceCourseIds.includes("UADA4"));
  assert.ok(audit.officialPlan.curriculum.excludedSourceCourseIds.includes("SAI20"));
  assert.match(source.interpretation.repeatableActivityLimitation, /hasta dos veces/);
  assert.match(source.interpretation.repeatableActivityLimitation, /no registra por separado/);
  assert.match(source.interpretation.sourceOnlyIdentity, /sin inventar código Bedelías/);
});
