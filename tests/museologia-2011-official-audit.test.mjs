import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-museologia-2011.json");
const officialAudit = audits.audits.find(({ identity }) => identity === "museologia:2011");
const credential = projection.creditStructure.credentials[0];

const expectedPathways = [
  "historia-del-uruguay",
  "historia-americana",
  "ciencia-y-tecnologia",
  "arte",
  "antropologia-social-y-cultural",
  "arqueologia",
];

test("conserva Museología para escolaridades existentes sin presentarla como ingreso vigente", () => {
  assert.equal(officialAudit.status, "official-evidence-complete");
  assert.equal(officialAudit.publicationEligible, true);
  assert.equal(officialAudit.offerings[0].admissionStatus, "no-new-admissions-since-2010");
  assert.match(officialAudit.uiNotice, /no abre nuevos ingresos desde 2010/i);
  assert.equal(projection.plan.degreeTitle, "Técnico Universitario en Museología");
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.plan.minCredits, 211);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), ["montevideo"]);
});

test("modela seis opciones temáticas del mismo título y no seis carreras", () => {
  assert.deepEqual(Object.keys(projection.pathways), expectedPathways);
  assert.equal(projection.creditStructure.credentials.length, 1);
  assert.equal(credential.title, "Técnico Universitario en Museología");
  for (const [pathwayId, pathway] of Object.entries(projection.pathways)) {
    assert.deepEqual(pathway.campusIds, ["montevideo"]);
    assert.match(pathway.description, /mismo título/);
    const thematicPeriods = pathway.periods.filter(({ label }) => label.startsWith("Opción temática ·"));
    assert.equal(thematicPeriods.length, 1, pathwayId);
  }
});

test("controla exactamente los tres mínimos oficiales que suman 211 créditos", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.deepEqual(requirements, {
    "museum-technical": 133,
    "museum-thematic": 39,
    "museum-complementary": 39,
  });
  assert.equal(Object.values(requirements).reduce((sum, credits) => sum + credits, 0), 211);
});

test("exige el núcleo, una lengua, la pasantía y la validación final", () => {
  const groups = new Map(credential.requiredCourseGroups.map((group) => [group.id, group]));
  assert.equal(groups.get("museum-core").minCompleted, 9);
  assert.equal(groups.get("museum-core").courseIds.length, 9);
  assert.equal(groups.get("museum-language").minCompleted, 1);
  assert.equal(groups.get("museum-language").courseIds.length, 9);
  assert.equal(groups.get("validacion-final-plan").minCompleted, 1);
  assert.ok(groups.get("museum-core").courseIds.some((id) => projection.courses.find((course) => course.id === id)?.bedeliasCode === "M9"));
});

test("presenta los seis semestres y deja la validación al final de cada opción", () => {
  for (const pathway of Object.values(projection.pathways)) {
    for (let semester = 1; semester <= 6; semester += 1) {
      assert.ok(pathway.periods.some(({ label }) => label === `Semestre ${semester}`));
    }
    assert.equal(pathway.periods.at(-1).label, "Validación de egreso");
  }
  const choiceBlocks = projection.courses.filter(({ name }) => /entre semestres 4 y 5/.test(name));
  assert.equal(choiceBlocks.length, 4);
  assert.ok(choiceBlocks.every(({ credits, curricularBlock }) => credits === 0 && curricularBlock));
});

test("mantiene el catálogo por opción y las previaturas publicadas sin volver todo obligatorio", () => {
  assert.equal(projection.courses.length, 392);
  assert.equal(projection.rules.length, 36);
  assert.equal(projection.plan.noPublishedRule, 304);
  assert.equal(officialAudit.bedeliasComparison.compositionMatterCount, 344);
  assert.match(officialAudit.anomalies.find(({ field }) => field === "catalogBreadth").resolution, /no convierte todo el catálogo/i);
});

test("mantiene cerrada la identidad al avanzar la cola oficial", () => {
  assert.ok(!queue.queue.some(({ identity }) => identity === "museologia:2011"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 156);
  assert.equal(queue.counts.pendingCanonicalIdentities, 21);
  assert.equal(queue.queue[0].identity, "ingenieria de alimentos:2003");
});
