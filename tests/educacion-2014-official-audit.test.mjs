import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-educacion-2014.json");
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
  assert.match(projection.plan.notice, /título es siempre Licenciado en Educación/);
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

test("cada trayectoria muestra su área y conserva el catálogo flexible", () => {
  const paths = Object.values(projection.pathways);
  for (const pathway of paths) {
    const labels = pathway.periods.map(({ label }) => label);
    assert.equal(labels.filter((label) => label === "Lengua extranjera").length, 1);
    assert.ok(labels.includes("Formación específica y profundización metodológica"));
    assert.ok(labels.includes("Integración interdisciplinaria"));
    assert.ok(labels.includes("Validación de egreso"));
    assert.ok(pathway.catalogCourseIds.length > 0);
  }
  const validation = projection.courses.find(({ name }) => /^Validación final/.test(name));
  assert.equal(validation.curricularBlock, true);
  assert.ok(paths.every(({ periods }) => periods.some(({ courseIds }) => courseIds.includes(validation.id))));
});

test("conserva sólo las previaturas publicadas y neutraliza filas sin crédito", () => {
  assert.equal(projection.courses.length, 300);
  assert.equal(projection.rules.length, 75);
  assert.equal(projection.plan.publishedRules, 75);
  assert.equal(projection.plan.noPublishedRule, 227);
  assert.equal(projection.courses.filter(({ credits }) => credits === 0).length, 55);
  assert.ok(projection.courses.filter(({ credits }) => credits === 0)
    .every(({ creditAllocations }) => creditAllocations.every(({ credits }) => credits === 0)));
  assert.match(officialAudit.anomalies.find(({ field }) => field === "zeroCreditRows").resolution, /No suman/);
});
