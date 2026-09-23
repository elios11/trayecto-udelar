import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-correccion-de-estilo-2014.json");
const officialAudit = audits.audits.find(({ identity }) => identity === "correccion de estilo:2014");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const publishedPathway = projection.publishedPathways["plan-flexible"];
const credential = projection.creditStructure.credentials[0];

test("publica una sola TUCE Plan 2014 vigente en Montevideo", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => /Corrección de Estilo/i.test(career.label))
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fhum");
  assert.deepEqual(matches[0].career.plans, [{
    id: "bedelias-fhum-correccion-de-estilo-2014",
    label: "Plan 2014 · vigente",
    defaultTrajectoryId: "plan-flexible",
    defaultCredentialId: "tecnico-correccion-estilo",
  }]);
  assert.deepEqual(
    [projection.plan.durationMonths, projection.plan.minCredits],
    [24, 180],
  );
  assert.deepEqual(projection.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "plan-flexible",
  }]);
  assert.equal(credential.title, "Técnico Universitario en Corrección de Estilo (lengua española)");
});

test("controla las cuatro áreas oficiales que completan 180 créditos", () => {
  const nodes = new Map(projection.creditStructure.nodes.map((node) => [node.id, node]));
  assert.equal(nodes.get("plan-total").minCredits, 180);
  assert.deepEqual([
    nodes.get("tuce-technical").minCredits,
    nodes.get("tuce-linguistics").minCredits,
    nodes.get("tuce-literature").minCredits,
    nodes.get("tuce-general").minCredits,
  ], [84, 56, 26, 14]);
  assert.equal(84 + 56 + 26 + 14, 180);
  assert.equal(nodes.get("tuce-foreign-language").parentId, "tuce-linguistics");
  assert.equal(nodes.get("tuce-foreign-language").minCredits, 4);
  assert.deepEqual(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]), [
    ["tuce-technical", 84],
    ["tuce-linguistics", 56],
    ["tuce-foreign-language", 4],
    ["tuce-literature", 26],
    ["tuce-general", 14],
  ]);
});

test("presenta la trayectoria oficial por cuatro semestres y conserva el área en cada materia", () => {
  assert.deepEqual(publishedPathway.periods.map(({ label }) => label), [
    "1.er semestre",
    "2.º semestre",
    "3.er semestre",
    "4.º semestre",
  ]);
  const visibleIds = publishedPathway.periods.flatMap(({ courseIds }) => courseIds);
  assert.equal(visibleIds.length, 20);
  assert.equal(new Set(visibleIds).size, 20);
  assert.ok(visibleIds.every((id) => courseById.get(id)?.authorityStatus === "verified"));
  assert.deepEqual(publishedPathway.periods.map(({ courseIds }) => (
    courseIds.reduce((total, id) => total + courseById.get(id).credits, 0)
  )), [46, 47, 55, 45]);
  assert.equal(publishedPathway.catalogCourseIds?.length ?? 0, 0);
  assert.equal(officialAudit.conclusion.canonicalModel, "one-technical-degree-one-flexible-path");
  assert.match(officialAudit.anomalies.find(({ field }) => field === "suggestedGridCredits").resolution, /193 créditos/);
});

test("oculta variantes anteriores y entradas de Bedelías que la malla vigente no publica", () => {
  const statuses = projection.courses.reduce((counts, course) => ({
    ...counts,
    [course.authorityStatus]: (counts[course.authorityStatus] ?? 0) + 1,
  }), {});
  assert.deepEqual(statuses, { candidate: 155, verified: 20, "historical-equivalent": 8 });
  const visibleIds = new Set(publishedPathway.periods.flatMap(({ courseIds }) => courseIds));
  for (const code of ["IVA", "BAS2", "LI179", "LI176", "LI136", "LI110", "COE6", "PECLA"]) {
    const course = projection.courses.find((candidate) => candidate.bedeliasCode === code);
    assert.equal(course.authorityStatus, "historical-equivalent", code);
    assert.equal(visibleIds.has(course.id), false, code);
  }
});

test("exige el núcleo vigente y conserva equivalencias administrativas", () => {
  const groups = new Map(credential.requiredCourseGroups.map((group) => [group.id, group]));
  assert.deepEqual(groups.get("tuce-academic-writing").courseIds.sort(), ["fhum-coe10-2", "fhum-coe6-2"]);
  assert.deepEqual(groups.get("tuce-informatics").courseIds, ["fhum-coe5-2"]);
  assert.deepEqual(courseById.get("fhum-coe5-2").equivalentCourseIds.sort(), ["fhum-coe5a-2", "fhum-coe5f-2", "fhum-coe8-2"]);
  assert.deepEqual(groups.get("tuce-production").courseIds.sort(), ["fhum-coe7-2", "fhum-pecla-2"]);
  assert.deepEqual(groups.get("tuce-workshop-1").courseIds, ["fhum-coe2-2"]);
  assert.deepEqual(groups.get("tuce-workshop-2").courseIds, ["fhum-coe3-2"]);
  assert.deepEqual(groups.get("tuce-internship").courseIds, ["fhum-coe4-2"]);
  assert.equal(groups.get("tuce-foreign-course").courseIds.length, 11);
  assert.ok(groups.get("tuce-foreign-course").courseIds.includes("fhum-tuce-foreign-reading"));
  assert.ok([...groups.values()].flatMap(({ courseIds }) => courseIds).every((id) => courseById.has(id)));
});

test("mantiene la evidencia de previaturas y publica sólo las verificadas", () => {
  assert.equal(projection.rules.length, 36);
  assert.equal(projection.plan.publishedRules, 5);
  assert.equal(projection.plan.noPublishedRule, 144);
  const fourthSemester = publishedPathway.periods.find(({ label }) => label === "4.º semestre");
  assert.ok(fourthSemester.courseIds.includes("fhum-coe4-2"));
  assert.equal(courseById.get("fhum-coe4-2").credits, 15);
  assert.match(officialAudit.anomalies.find(({ field }) => field === "prerequisites").resolution, /36 reglas/);
});
