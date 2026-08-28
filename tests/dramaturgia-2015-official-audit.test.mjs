import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-dramaturgia-2015.json");
const officialAudit = audits.audits.find(({ identity }) => identity === "dramaturgia:2015");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const pathway = projection.pathways["plan-flexible"];
const credential = projection.creditStructure.credentials[0];

test("publica una sola TUD Plan 2015 compartida por FHCE y EMAD", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => /Dramaturgia/i.test(career.label))
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fhum");
  assert.deepEqual(matches[0].career.plans, [{
    id: "bedelias-fhum-dramaturgia-2015",
    label: "Plan 2015 · vigente",
    defaultTrajectoryId: "plan-flexible",
    defaultCredentialId: "tecnico-dramaturgia",
  }]);
  assert.deepEqual(
    [projection.plan.degreeTitle, projection.plan.durationMonths, projection.plan.minCredits],
    ["Técnico Universitario en Dramaturgia", 24, 180],
  );
  assert.deepEqual(projection.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "plan-flexible",
  }]);
  assert.match(projection.plan.notice, /FHCE y EMAD/);
  assert.match(projection.plan.notice, /cohortes con cupo/);
});

test("controla 100 + 60 + 20 y todos los submínimos oficiales", () => {
  const nodes = new Map(projection.creditStructure.nodes.map((node) => [node.id, node]));
  assert.equal(nodes.get("plan-total").minCredits, 180);
  assert.deepEqual([
    nodes.get("tud-writing-practice").minCredits,
    nodes.get("tud-theory-practice").minCredits,
    nodes.get("tud-complementary").minCredits,
  ], [100, 60, 20]);
  assert.deepEqual([
    nodes.get("tud-dramaturgy-workshops").minCredits,
    nodes.get("tud-format-workshops").minCredits,
    nodes.get("tud-internships").minCredits,
  ], [60, 15, 25]);
  assert.deepEqual([
    nodes.get("tud-theory-required").minCredits,
    nodes.get("tud-theory-optional").minCredits,
    nodes.get("tud-staging").minCredits,
    nodes.get("tud-humanities").minCredits,
  ], [36, 24, 8, 16]);
  assert.deepEqual([
    nodes.get("tud-foreign-language").minCredits,
    nodes.get("tud-electives").minCredits,
  ], [4, 14]);
  assert.equal(credential.minTotalCredits, 180);
  assert.equal(credential.nodeRequirements.length, 12);
});

test("exige los cuatro talleres troncales sin aceptar versiones breves como 60 créditos", () => {
  const groups = new Map(credential.requiredCourseGroups.map((group) => [group.id, group]));
  for (const number of [1, 2, 3, 4]) {
    const group = groups.get(`tud-workshop-${number}`);
    assert.equal(group.minCompleted, 1);
    assert.ok(group.courseIds.length >= 2);
  }
  const workshopNode = projection.creditStructure.nodes.find(({ id }) => id === "tud-dramaturgy-workshops");
  assert.equal(workshopNode.minCredits, 60);
  assert.deepEqual(groups.get("tud-theory-core").courseIds.map((id) => courseById.get(id).credits), [9, 9, 9, 9]);
  assert.equal(groups.get("tud-theory-core").minCompleted, 4);
});

test("clasifica las optativas teóricas en puesta en escena o humanidades", () => {
  const optional = pathway.periods.find(({ label }) => label === "Teórico-prácticas optativas");
  assert.equal(optional.courseIds.length, 39);
  const assignments = optional.courseIds.map((id) => courseById.get(id).eligibleRequirementIds);
  assert.equal(assignments.filter((ids) => ids.includes("tud-staging")).length, 13);
  assert.equal(assignments.filter((ids) => ids.includes("tud-humanities")).length, 26);
  assert.ok(assignments.every((ids) => ids.length === 1));
  assert.match(officialAudit.anomalies.find(({ field }) => field === "emptyTheorySubgroups").resolution, /vacíos/);
});

test("reemplaza el grupo electivo imposible por dos bloques acreditables 10 + 4", () => {
  const electives = projection.courses.filter(({ name }) => /Electiva [12] acreditada/.test(name));
  assert.deepEqual(electives.map(({ credits }) => credits), [10, 4]);
  assert.ok(electives.every(({ curricularBlock }) => curricularBlock));
  const electiveGroup = credential.requiredCourseGroups.find(({ id }) => id === "tud-elective-blocks");
  assert.equal(electiveGroup.minCompleted, 2);
  assert.deepEqual(electiveGroup.courseIds, electives.map(({ id }) => id));
  assert.equal(projection.courses.some(({ bedeliasCode }) => ["UHD4", "UHD3", "UHD2", "UHD1", "EF158", "IDP", "IEI"].includes(bedeliasCode)), false);
});

test("mantiene la oferta flexible sin inventar previaturas", () => {
  assert.equal(projection.courses.length, 131);
  assert.equal(projection.rules.length, 0);
  assert.equal(projection.plan.publishedRules, 0);
  assert.equal(projection.plan.noPublishedRule, 136);
  const visibleIds = pathway.periods.flatMap(({ courseIds }) => courseIds);
  assert.equal(new Set(visibleIds).size, 131);
  assert.ok(visibleIds.every((id) => courseById.has(id)));
  assert.equal(officialAudit.conclusion.canonicalModel, "one-shared-technical-degree-one-flexible-path");
});
