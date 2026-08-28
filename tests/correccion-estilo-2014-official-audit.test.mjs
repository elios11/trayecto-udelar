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
const pathway = projection.pathways["plan-flexible"];
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

test("presenta el catálogo por áreas sin convertir optativas y electivas en obligaciones simultáneas", () => {
  assert.equal(projection.courses.length, 180);
  assert.deepEqual(pathway.periods.map(({ label }) => label), [
    "Técnico-instrumental",
    "Lingüística",
    "Comprensión lectora en lengua extranjera",
    "Literatura",
    "Formación general y académica",
  ]);
  const visibleIds = pathway.periods.flatMap(({ courseIds }) => courseIds);
  assert.equal(visibleIds.length, 180);
  assert.equal(new Set(visibleIds).size, 180);
  assert.ok(visibleIds.every((id) => courseById.has(id)));
  assert.equal(officialAudit.conclusion.canonicalModel, "one-technical-degree-one-flexible-path");
  assert.match(officialAudit.anomalies.find(({ field }) => field === "suggestedGridCredits").resolution, /193 créditos/);
});

test("exige el núcleo vigente y conserva equivalencias administrativas", () => {
  const groups = new Map(credential.requiredCourseGroups.map((group) => [group.id, group]));
  assert.deepEqual(groups.get("tuce-academic-writing").courseIds.sort(), ["fhum-coe10-2", "fhum-coe6-2"]);
  assert.deepEqual(groups.get("tuce-informatics").courseIds.sort(), ["fhum-coe5-2", "fhum-coe5a-2", "fhum-coe5f-2", "fhum-coe8-2"]);
  assert.deepEqual(groups.get("tuce-production").courseIds.sort(), ["fhum-coe7-2", "fhum-pecla-2"]);
  assert.deepEqual(groups.get("tuce-workshop-1").courseIds, ["fhum-coe2-2"]);
  assert.deepEqual(groups.get("tuce-workshop-2").courseIds, ["fhum-coe3-2"]);
  assert.deepEqual(groups.get("tuce-internship").courseIds, ["fhum-coe4-2"]);
  assert.equal(groups.get("tuce-foreign-course").courseIds.length, 10);
  assert.ok([...groups.values()].flatMap(({ courseIds }) => courseIds).every((id) => courseById.has(id)));
});

test("mantiene sólo las previaturas publicadas y la pasantía dentro del área técnica", () => {
  assert.equal(projection.rules.length, 36);
  assert.equal(projection.plan.publishedRules, 36);
  assert.equal(projection.plan.noPublishedRule, 144);
  const technical = pathway.periods.find(({ label }) => label === "Técnico-instrumental");
  assert.ok(technical.courseIds.includes("fhum-coe4-2"));
  assert.equal(courseById.get("fhum-coe4-2").credits, 15);
  assert.match(officialAudit.anomalies.find(({ field }) => field === "prerequisites").resolution, /36 reglas/);
});
