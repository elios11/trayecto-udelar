import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-museologia-2011.json");
const officialAudit = audits.audits.find(({ identity }) => identity === "museologia:2011");
const credential = projection.creditStructure.credentials[0];

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

test("modela un único recorrido histórico y conserva un solo título", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["plan-2011"]);
  assert.equal(projection.creditStructure.credentials.length, 1);
  assert.equal(credential.title, "Técnico Universitario en Museología");
  assert.deepEqual(projection.pathways["plan-2011"].campusIds, ["montevideo"]);
  assert.match(projection.plan.notice, /sin nuevos ingresos desde 2010/i);
  assert.match(projection.plan.notice, /Bienes Culturales/i);
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
  assert.equal(groups.get("museum-language").courseIds.length, 1);
  assert.equal(projection.courses.find(({ id }) => id === groups.get("museum-language").courseIds[0]).curricularBlock, true);
  assert.equal(groups.get("validacion-final-plan").minCompleted, 1);
  assert.ok(groups.get("museum-core").courseIds.some((id) => projection.courses.find((course) => course.id === id)?.bedeliasCode === "M9"));
});

test("presenta los seis semestres y deja la validación al final del recorrido", () => {
  for (const pathway of Object.values(projection.pathways)) {
    for (let semester = 1; semester <= 6; semester += 1) {
      assert.ok(pathway.periods.some(({ label }) => label === `Semestre ${semester}`));
    }
    assert.equal(pathway.periods.at(-1).label, "Validación de egreso");
  }
  const choiceBlocks = projection.courses.filter(({ name }) => /Unidad optativa o electiva/.test(name));
  assert.equal(choiceBlocks.length, 6);
  assert.ok(choiceBlocks.every(({ credits, curricularBlock }) => credits === 0 && curricularBlock));
});

test("mantiene el catálogo histórico oculto y las previaturas publicadas", () => {
  assert.equal(projection.rules.length, 36);
  assert.equal(projection.plan.noPublishedRule, 304);
  assert.equal(officialAudit.bedeliasComparison.compositionMatterCount, 344);
  const visibleIds = new Set(projection.pathways["plan-2011"].periods.flatMap(({ courseIds }) => courseIds));
  assert.ok([...visibleIds].every((id) => projection.courses.find((course) => course.id === id)?.authorityStatus === "verified"));
  assert.ok(projection.courses.some(({ authorityStatus }) => authorityStatus === "candidate"));
  assert.match(officialAudit.anomalies.find(({ field }) => field === "catalogBreadth").resolution, /no convierte todo el catálogo/i);
});

test("mantiene cerrada la identidad al avanzar la cola oficial", () => {
  assert.ok(!queue.queue.some(({ identity }) => identity === "museologia:2011"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 177);
  assert.equal(queue.counts.pendingCanonicalIdentities, 0);
  assert.equal(queue.queue.length, 0);
});
