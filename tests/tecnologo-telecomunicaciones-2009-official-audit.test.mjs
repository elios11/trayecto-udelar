import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cure-tecnologo-en-telecomunicaciones-2009.json");
const audit = registry.audits.find(({ identity }) => identity === "tecnologo en telecomunicaciones:2009");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "tecnologo-telecomunicaciones");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));

test("publica un único Plan 2009 con carrera completa en Rocha y primer año en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-technologist-with-full-rocha-and-partial-montevideo-pathways");
  assert.equal(projection.source.bedeliasContentHash, "cc07d50f6decf179eff1c2b95ed077120f8849121ee1be06b00ac591ffdefc79");
  assert.equal(projection.plan.year, "2009");
  assert.equal(projection.plan.degreeTitle, "Tecnólogo en Telecomunicaciones");
  assert.equal(projection.plan.durationMonths, 30);
  assert.equal(projection.plan.minCredits, 200);
  assert.deepEqual(projection.plan.sharedWith, ["Centro Universitario Regional del Este"]);
  assert.deepEqual(projection.campuses.map(({ id, defaultPathwayId }) => [id, defaultPathwayId]), [
    ["rocha", "curricula-rocha"],
    ["montevideo", "primer-ano-montevideo"],
  ]);

  const career = catalog.find(({ id }) => id === "bedelias-fing").careers
    .find(({ label }) => label === "Tecnólogo en Telecomunicaciones");
  assert.equal(career.plans.length, 1);
  assert.equal(career.plans[0].id, "bedelias-cure-tecnologo-en-telecomunicaciones-2009");
  assert.equal(career.plans[0].defaultCredentialId, "tecnologo-telecomunicaciones");
});

test("aplica la grilla vigente de Rocha sin presentar Montevideo como carrera completa", () => {
  const rocha = projection.pathways["curricula-rocha"];
  const montevideo = projection.pathways["primer-ano-montevideo"];
  assert.deepEqual(rocha.campusIds, ["rocha"]);
  assert.deepEqual(rocha.periods.map(({ label, courseIds }) => [label, courseIds.length]), [
    ["Semestre 1", 3],
    ["Semestre 2", 3],
    ["Semestre 3", 4],
    ["Semestre 4", 5],
    ["Semestre 5", 5],
    ["Validación de egreso", 1],
  ]);
  const rochaNominalCredits = rocha.periods.flatMap(({ courseIds }) => courseIds)
    .reduce((sum, id) => sum + courseById.get(id).credits, 0);
  assert.equal(rochaNominalCredits, 185);
  assert.ok(rocha.catalogCourseIds.some((id) => courseById.get(id).bedeliasCode === "TTR18"));
  assert.ok(rocha.catalogCourseIds.some((id) => courseById.get(id).bedeliasCode === "TTR19"));

  assert.deepEqual(montevideo.campusIds, ["montevideo"]);
  assert.deepEqual(montevideo.periods.map(({ courseIds }) => courseIds.length), [4, 4]);
  assert.ok(!montevideo.catalogCourseIds);
  assert.ok(montevideo.periods.flatMap(({ courseIds }) => courseIds)
    .every((id) => courseById.get(id).bedeliasCode));
  assert.match(montevideo.description, /continúa.*Rocha/i);
});

test("controla seis mínimos, 200 créditos y una alternativa entre Proyecto y Pasantía", () => {
  assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).length, 37);
  assert.equal(projection.courses.length, 40);
  assert.equal(projection.rules.length, 30);
  assert.equal(projection.plan.noPublishedRule, 9);
  assert.deepEqual(Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits])), {
    "telecom-matematica": 25,
    "telecom-fisica": 18,
    "telecom-informatica": 25,
    "telecom-telecomunicaciones": 60,
    "telecom-humanas": 10,
    "telecom-proyecto-pasantia": 12,
  });
  assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 150);
  assert.equal(credential.minTotalCredits, 200);
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), [
    "telecom-proyecto-o-pasantia",
    "validacion-final-plan",
  ]);
  const alternative = credential.requiredCourseGroups[0].courseIds
    .map((id) => courseById.get(id));
  assert.deepEqual(alternative.map(({ bedeliasCode, credits }) => [bedeliasCode, credits]), [
    ["TTR18", 14],
    ["TTR19", 14],
  ]);
  assert.equal(credential.requiredCourseGroups[0].minCompleted, 1);
  assert.equal(courseById.get(credential.requiredCourseGroups[1].courseIds[0]).dataStatus, "manual-validation");
});

test("cierra la auditoría y avanza a Tecnólogo Industrial Mecánico", () => {
  assert.ok(!queue.queue.some(({ identity }) => identity === "tecnologo en telecomunicaciones:2009"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 174);
  assert.equal(queue.counts.pendingCanonicalIdentities, 3);
  assert.equal(queue.queue[0].identity, "tecnico bach en cs quimicas:2015");
});
