import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-educacion-2014.json");
const report = await readJson("data/bedelias/inventory/ui-extracted-plans.json");
const officialAudit = audits.audits.find(({ identity }) => identity === "educacion:2014");
const credential = projection.creditStructure.credentials[0];

test("publica una sola Licenciatura en Educación y un único título", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Educación")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fhum");
  assert.deepEqual(matches[0].career.plans, [{
    id: "bedelias-fhum-educacion-2014",
    label: "Plan 2014 · vigente",
    defaultTrajectoryId: "historia-filosofia-educacion",
    defaultCredentialId: "licenciado-educacion",
  }]);
  assert.deepEqual(
    [projection.plan.degreeTitle, projection.plan.durationMonths, projection.plan.minCredits],
    ["Licenciado en Educación", 48, 360],
  );
  assert.deepEqual(projection.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "historia-filosofia-educacion",
  }]);
});

test("ofrece tres áreas de profundización vinculadas a la misma credencial", () => {
  assert.deepEqual(Object.keys(projection.pathways), [
    "historia-filosofia-educacion",
    "pedagogia-politica-sociedad",
    "ensenanza-aprendizaje",
  ]);
  assert.ok(Object.values(projection.pathways)
    .every(({ credentialId }) => credentialId === "licenciado-educacion"));
  assert.equal(projection.plan.degreeTitle, "Licenciado en Educación");
  assert.match(projection.plan.notice, /conservan el mismo título/);
  assert.equal(officialAudit.conclusion.canonicalModel, "one-degree-three-research-pathways");
});

test("controla los diez mínimos vigentes que suman 360 créditos", () => {
  const nodes = projection.creditStructure.nodes.filter(({ id }) => id !== "plan-total");
  assert.deepEqual(nodes.map(({ minCredits }) => minCredits), [41, 40, 32, 24, 63, 12, 58, 72, 10, 8]);
  assert.equal(nodes.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
  assert.equal(credential.minTotalCredits, 360);
  assert.deepEqual(
    credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]),
    nodes.map(({ id, minCredits }) => [id, minCredits]),
  );
});

test("exige el núcleo común, los tres talleres, la tesina y una lengua", () => {
  const groups = new Map(credential.requiredCourseGroups.map((group) => [group.id, group]));
  assert.deepEqual([
    groups.get("edu-introductory-core").minCompleted,
    groups.get("edu-university-introduction").minCompleted,
    groups.get("edu-history-philosophy-core").minCompleted,
    groups.get("edu-pedagogy-core").minCompleted,
    groups.get("edu-teaching-core").minCompleted,
    groups.get("edu-language-course").minCompleted,
  ], [3, 1, 4, 3, 2, 1]);
  assert.deepEqual([
    groups.get("edu-workshop-1").minCompleted,
    groups.get("edu-workshop-2").minCompleted,
    groups.get("edu-workshop-3").minCompleted,
    groups.get("edu-thesis").minCompleted,
  ], [1, 1, 1, 1]);
  assert.equal(groups.get("validacion-final-plan").minCompleted, 1);
});

test("las tres áreas reproducen la misma malla oficial de ocho semestres", () => {
  const paths = Object.values(projection.publishedPathways);
  const expectedLabels = Array.from({ length: 8 }, (_, index) => `Semestre ${index + 1}`);
  const expectedSizes = [5, 4, 4, 5, 4, 5, 4, 5];
  for (const pathway of paths) {
    assert.deepEqual(pathway.periods.map(({ label }) => label), expectedLabels);
    assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), expectedSizes);
    assert.equal(pathway.catalogCourseIds?.length ?? 0, 0);
  }
  assert.deepEqual(paths[0].periods, paths[1].periods);
  assert.deepEqual(paths[1].periods, paths[2].periods);
  const validation = projection.courses.find(({ name }) => /^Validación final/.test(name));
  assert.equal(validation.curricularBlock, true);
  assert.ok(paths.every(({ periods }) => periods.some(({ courseIds }) => courseIds.includes(validation.id))));
});

test("conserva candidatos sin publicarlos y registra la reconciliación", () => {
  assert.equal(projection.courses.length, 321);
  assert.equal(projection.rules.length, 75);
  assert.equal(projection.plan.publishedRules, 1);
  assert.equal(projection.plan.noPublishedRule, 227);
  assert.equal(projection.courses.filter(({ credits }) => credits === 0).length, 76);
  assert.ok(projection.courses.filter(({ credits }) => credits === 0)
    .every(({ creditAllocations }) => creditAllocations.every(({ credits }) => credits === 0)));
  const visibleIds = new Set(Object.values(projection.publishedPathways)
    .flatMap(({ periods }) => periods.flatMap(({ courseIds }) => courseIds)));
  assert.ok(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate")
    .every(({ id }) => !visibleIds.has(id)));
  const authority = report.plans.find(({ planId }) => planId === "bedelias-fhum-educacion-2014").authorityReconciliation;
  assert.deepEqual(authority.before, {
    verified: 50,
    candidate: 250,
    "historical-equivalent": 0,
    administrative: 0,
    rejected: 0,
  });
  assert.deepEqual(authority.after, {
    verified: 36,
    candidate: 285,
    "historical-equivalent": 0,
    administrative: 0,
    rejected: 0,
  });
  assert.match(officialAudit.anomalies.find(({ field }) => field === "zeroCreditRows").resolution, /No suman/);
});
