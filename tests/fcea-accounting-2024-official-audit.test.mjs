import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcea-contador-publico-2024.json");
const source = await readJson("data/fcea/contador-publico-2024-trayectorias.json");
const audit = registry.audits.find(({ identity }) => identity === "contador publico:2024");

const pathwayIds = [
  "asesoria-financiera",
  "aspectos-tributarios-y-juridicos",
  "controller-y-transformacion-digital",
  "reportes-externos-y-atestiguamiento",
  "sector-publico",
];
const nodesById = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));
const coursesByCode = new Map(plan.courses.map((course) => [course.bedeliasCode, course]));
const expectedPlacements = new Map([
  ["asesoria-financiera", 47],
  ["aspectos-tributarios-y-juridicos", 43],
  ["controller-y-transformacion-digital", 50],
  ["reportes-externos-y-atestiguamiento", 46],
  ["sector-publico", 46],
]);

test("audita Contador Público como un título con cinco perfiles certificados", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-five-certified-profiles");
  assert.deepEqual([audit.officialPlan.durationMonths, audit.officialPlan.semesters, audit.officialPlan.minimumCredits], [48, 8, 360]);
  assert.deepEqual(audit.officialPlan.trajectories.map(({ id }) => id), pathwayIds);
  assert.ok(audit.officialPlan.curriculum.credentials.every(({ title }) => title.startsWith("Contador Público · constancia Perfil")));
  assert.equal(plan.plan.degreeTitle, "Contador Público");
});

test("controla 260+10+60+30 y el mínimo interno 40+20 de cada perfil", () => {
  assert.deepEqual(Object.keys(plan.pathways), pathwayIds);
  assert.deepEqual(plan.creditStructure.credentials.map(({ id }) => id), pathwayIds);
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);

  for (const credential of plan.creditStructure.credentials) {
    const roots = credential.nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId === "plan-total");
    const children = credential.nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId !== "plan-total");
    assert.equal(roots.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
    assert.deepEqual(children.map(({ minCredits }) => minCredits), [40, 20]);
  }
  assert.ok(plan.courses.every((course) => !course.eligibleRequirementIds.includes("plan-total")));
});

test("reproduce exactamente las cinco grillas oficiales de ocho semestres", () => {
  assert.deepEqual(Object.keys(plan.publishedPathways), pathwayIds);
  assert.deepEqual(source.trajectories.map(({ id }) => id), pathwayIds);

  for (const sourcePathway of source.trajectories) {
    const projected = plan.publishedPathways[sourcePathway.id];
    assert.equal(projected.credentialId, sourcePathway.id);
    assert.deepEqual(projected.periods.map(({ label }) => label), [
      "Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4",
      "Semestre 5", "Semestre 6", "Semestre 7", "Semestre 8",
    ]);
    assert.deepEqual(projected.periods.map((period) => ({
      label: period.label,
      courseIds: period.courseIds.map((courseId) => plan.courses.find(({ id }) => id === courseId).bedeliasCode),
    })), sourcePathway.periods);
    assert.equal(projected.periods.flatMap(({ courseIds }) => courseIds).length, expectedPlacements.get(sourcePathway.id));
  }
});

test("publica sólo 101 identidades verificadas y conserva los IDs de progreso", () => {
  assert.equal(plan.courses.length, 101);
  assert.ok(plan.courses.every(({ authorityStatus }) => authorityStatus === "verified"));
  assert.ok(plan.courseAuthority.records.every(({ status }) => status === "rejected"));
  assert.equal(plan.courseAuthority.records.length, 27);
  assert.equal(coursesByCode.get("C10").id, "fcea-c10-2");
  assert.equal(coursesByCode.get("MC72").id, "fcea-mc72-2");

  const everyCourseId = [...plan.courses.map(({ id }) => id)].sort();
  for (const pathway of Object.values(plan.publishedPathways)) {
    const periodIds = pathway.periods.flatMap(({ courseIds }) => courseIds);
    assert.equal(new Set(periodIds).size, periodIds.length);
    assert.deepEqual([...new Set([...periodIds, ...pathway.catalogCourseIds])].sort(), everyCourseId);
  }
});

test("conserva alternativas y opciones flexibles sin convertirlas en obligaciones acumulativas", () => {
  const controllerRequired = plan.courses.filter(({ eligibleRequirementIds }) => eligibleRequirementIds.includes("controller-required"));
  assert.deepEqual(controllerRequired.map(({ bedeliasCode }) => bedeliasCode).sort(), ["A81", "C76N", "C87N", "I75N", "I88N", "MC72"]);
  assert.equal(controllerRequired.reduce((sum, { credits }) => sum + credits, 0), 40);
  for (const code of ["I137", "I138"]) {
    assert.deepEqual(coursesByCode.get(code).eligibleRequirementIds, ["free-electives"]);
  }
  assert.deepEqual(coursesByCode.get("MC46").eligibleRequirementIds, ["free-electives", "controller-optional"]);
  assert.deepEqual(coursesByCode.get("MC47").eligibleRequirementIds, ["free-electives", "controller-optional"]);

  const firstSemesterCodes = plan.publishedPathways["asesoria-financiera"].periods[0].courseIds
    .map((courseId) => plan.courses.find(({ id }) => id === courseId).bedeliasCode);
  assert.ok(["E10", "E11", "MC10", "114A"].every((code) => firstSemesterCodes.includes(code)));
  const secondSemesterCodes = plan.publishedPathways["asesoria-financiera"].periods[1].courseIds
    .map((courseId) => plan.courses.find(({ id }) => id === courseId).bedeliasCode);
  assert.ok(secondSemesterCodes.includes("128A"));

  const placedCodes = new Set(Object.values(plan.publishedPathways)
    .flatMap(({ periods }) => periods.flatMap(({ courseIds }) => courseIds))
    .map((courseId) => plan.courses.find(({ id }) => id === courseId).bedeliasCode));
  assert.equal(placedCodes.has("J44"), false);
  for (const code of ["UPC10", "UPC15", "UPC20"]) assert.ok(coursesByCode.has(code));
});
