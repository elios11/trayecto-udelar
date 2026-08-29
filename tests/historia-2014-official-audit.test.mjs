import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-historia-2014.json");
const officialAudit = audits.audits.find(({ identity }) => identity === "historia:2014");
const credentials = new Map(projection.creditStructure.credentials.map((credential) => [credential.id, credential]));

test("publica una sola Licenciatura en Historia y un único título", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Historia")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fhum");
  assert.deepEqual(matches[0].career.plans, [{
    id: "bedelias-fhum-historia-2014",
    label: "Plan 2014 · vigente",
    defaultTrajectoryId: "ingreso-general",
    defaultCredentialId: "licenciado-historia",
  }]);
  assert.deepEqual(
    [projection.plan.degreeTitle, projection.plan.durationMonths, projection.plan.minCredits],
    ["Licenciado en Historia", 48, 360],
  );
  assert.deepEqual(projection.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "ingreso-general",
  }]);
});

test("ofrece ingreso general y continuidad CFE para la misma titulación", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["ingreso-general", "continuidad-cfe"]);
  assert.equal(projection.pathways["ingreso-general"].credentialId, "licenciado-historia");
  assert.equal(projection.pathways["continuidad-cfe"].credentialId, "licenciado-historia-cfe");
  assert.ok([...credentials.values()].every(({ title }) => title === "Licenciado en Historia"));
  assert.equal(officialAudit.conclusion.canonicalModel, "one-degree-general-and-cfe-pathways");
  assert.match(projection.plan.notice, /mismo título/);
});

test("controla nueve mínimos que suman exactamente 360 créditos", () => {
  const nodes = projection.creditStructure.nodes.filter(({ id }) => id !== "plan-total");
  assert.deepEqual(nodes.map(({ minCredits }) => minCredits), [13, 65, 2, 39, 78, 50, 8, 65, 40]);
  assert.equal(nodes.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
  for (const credential of credentials.values()) {
    assert.equal(credential.minTotalCredits, 360);
    assert.deepEqual(
      credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]),
      nodes.map(({ id, minCredits }) => [id, minCredits]),
    );
  }
});

test("el ingreso general exige las catorce unidades obligatorias de las cuatro áreas", () => {
  const groups = new Map(credentials.get("licenciado-historia").requiredCourseGroups
    .map((group) => [group.id, group]));
  const core = [
    "hist-techniques", "hist-historiography", "hist-theory",
    "hist-ancient", "hist-medieval", "hist-modern", "hist-contemporary", "hist-art",
    "hist-american-1", "hist-american-2", "hist-american-3",
    "hist-uruguay-1", "hist-uruguay-2", "hist-uruguay-3",
  ];
  assert.ok(core.every((id) => groups.get(id).minCompleted === 1));
  assert.ok(core.every((id) => groups.get(id).courseIds.length >= 1));
  for (const id of [
    "hist-university-introduction",
    "hist-language-course",
    "hist-thesis-seminar",
    "hist-degree-thesis",
    "validacion-final-plan",
  ]) assert.equal(groups.get(id).minCompleted, 1);
});

test("la vía CFE acredita 245 créditos y exige sólo cuatro unidades de área adicionales", () => {
  const pathway = projection.pathways["continuidad-cfe"];
  const recognitionPeriod = pathway.periods.find(({ label }) => label === "Reconocimiento CFE");
  const recognitionCourses = recognitionPeriod.courseIds
    .map((id) => projection.courses.find((course) => course.id === id));
  assert.equal(recognitionCourses.length, 5);
  assert.equal(recognitionCourses.reduce((sum, { credits }) => sum + credits, 0), 245);
  assert.ok(recognitionCourses.every(({ curricularBlock }) => curricularBlock));
  assert.equal(projection.pathways["ingreso-general"].periods.some(({ label }) => label === "Reconocimiento CFE"), false);

  const cfeGroups = new Map(credentials.get("licenciado-historia-cfe").requiredCourseGroups
    .map((group) => [group.id, group]));
  assert.deepEqual([
    cfeGroups.get("hist-cfe-europe").minCompleted,
    cfeGroups.get("hist-cfe-uruguay").minCompleted,
    cfeGroups.get("hist-cfe-america").minCompleted,
    cfeGroups.get("hist-cfe-theory").minCompleted,
  ], [1, 1, 1, 1]);
  assert.equal(245 + 52 + 2 + 13 + 8 + 15 + 25, 360);
});

test("conserva sólo las previaturas publicadas y neutraliza créditos desconocidos", () => {
  assert.equal(projection.courses.length, 206);
  assert.equal(projection.rules.length, 21);
  assert.equal(projection.plan.publishedRules, 21);
  assert.equal(projection.plan.noPublishedRule, 174);
  assert.equal(projection.courses.filter(({ credits }) => credits === 0).length, 56);
  assert.ok(projection.courses.filter(({ credits }) => credits === 0)
    .every(({ creditAllocations }) => creditAllocations.every(({ credits }) => credits === 0)));
  assert.match(officialAudit.anomalies.find(({ field }) => field === "zeroCreditRows").resolution, /No suman/);
});
