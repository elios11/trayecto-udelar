import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-filosofia-2010.json");
const officialAudit = audits.audits.find(({ identity }) => identity === "filosofia:2010");
const credential = projection.creditStructure.credentials[0];

test("publica una sola Licenciatura en Filosofía y un único título", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Filosofía")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fhum");
  assert.deepEqual(matches[0].career.plans, [{
    id: "bedelias-fhum-filosofia-2010",
    label: "Plan 2010 · vigente",
    defaultTrajectoryId: "trayectoria-flexible",
    defaultCredentialId: "licenciado-filosofia",
  }]);
  assert.deepEqual(
    [projection.plan.degreeTitle, projection.plan.durationMonths, projection.plan.minCredits],
    ["Licenciado en Filosofía", 48, 360],
  );
  assert.deepEqual(projection.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "trayectoria-flexible",
  }]);
});

test("modela una trayectoria flexible sin inventar menciones", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["trayectoria-flexible"]);
  assert.equal(projection.pathways["trayectoria-flexible"].credentialId, "licenciado-filosofia");
  assert.equal(credential.title, "Licenciado en Filosofía");
  assert.equal(officialAudit.conclusion.canonicalModel, "one-degree-flexible-trajectory");
  assert.match(projection.plan.notice, /Instituto debe avalar la consistencia/);
});

test("controla seis mínimos raíz que suman 360 y tres submínimos flexibles", () => {
  const nodes = new Map(projection.creditStructure.nodes.map((node) => [node.id, node]));
  const roots = [
    "fil-philosophical-required",
    "fil-complementary-required",
    "fil-flexible",
    "fil-integral-workshop",
    "fil-thesis-seminar",
    "fil-thesis",
  ].map((id) => nodes.get(id));
  assert.deepEqual(roots.map(({ minCredits }) => minCredits), [143, 12, 147, 20, 13, 25]);
  assert.equal(roots.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
  assert.deepEqual([
    nodes.get("fil-philosophical-electives").minCredits,
    nodes.get("fil-special-topics").minCredits,
    nodes.get("fil-university-electives").minCredits,
  ], [65, 30, 52]);
  assert.ok([
    "fil-philosophical-electives",
    "fil-special-topics",
    "fil-university-electives",
  ].every((id) => nodes.get(id).parentId === "fil-flexible"));
});

test("exige las once obligatorias filosóficas y las actividades de egreso", () => {
  const groups = new Map(credential.requiredCourseGroups.map((group) => [group.id, group]));
  const philosophicalCore = [
    "fil-history-ancient",
    "fil-history-medieval",
    "fil-history-modern",
    "fil-history-contemporary",
    "fil-ethics",
    "fil-aesthetics",
    "fil-latin-american",
    "fil-theoretical",
    "fil-science-history",
    "fil-methodology",
    "fil-logic",
  ];
  assert.ok(philosophicalCore.every((id) => groups.get(id).minCompleted === 1));
  assert.ok(philosophicalCore.every((id) => groups.get(id).courseIds.length >= 1));
  assert.deepEqual([
    groups.get("fil-university-introduction").minCompleted,
    groups.get("fil-language").minCompleted,
    groups.get("fil-integral-workshop-course").minCompleted,
    groups.get("fil-thesis-seminar-course").minCompleted,
    groups.get("fil-thesis-course").minCompleted,
    groups.get("validacion-final-plan").minCompleted,
  ], [1, 1, 1, 1, 1, 1]);
});

test("muestra los nueve bloques oficiales y una validación final manual", () => {
  const pathway = projection.pathways["trayectoria-flexible"];
  const labels = pathway.periods.map(({ label }) => label);
  for (const label of [
    "Obligatorias filosóficas",
    "Obligatorias complementarias",
    "Electivas filosóficas",
    "Tópicos Especiales",
    "Electivas universitarias",
    "Taller Integral",
    "Seminario de Tesina",
    "Tesina",
    "Validación de egreso",
  ]) assert.ok(labels.includes(label), label);
  const validation = projection.courses.find(({ name }) => /^Validación final/.test(name));
  assert.equal(validation.curricularBlock, true);
  assert.ok(pathway.periods.some(({ courseIds }) => courseIds.includes(validation.id)));
});

test("conserva sólo las previaturas publicadas y neutraliza créditos desconocidos", () => {
  assert.equal(projection.courses.length, 283);
  assert.equal(projection.rules.length, 46);
  assert.equal(projection.plan.publishedRules, 46);
  assert.equal(projection.plan.noPublishedRule, 228);
  assert.equal(projection.courses.filter(({ credits }) => credits === 0).length, 91);
  assert.ok(projection.courses.filter(({ credits }) => credits === 0)
    .every(({ creditAllocations }) => creditAllocations.every(({ credits }) => credits === 0)));
  assert.match(officialAudit.anomalies.find(({ field }) => field === "zeroCreditRows").resolution, /No suman/);
});
