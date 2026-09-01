import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-tecnologo-en-cartografia-2011.json");
const audit = registry.audits.find(({ identity }) => identity === "tecnologo en cartografia:2011");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "tecnologo-cartografia");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));

test("publica un único Plan 2011 compartido por Ingeniería y Ciencias", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-shared-technologist-with-flexible-curriculum");
  assert.deepEqual(audit.officialPlan.catalogFacultyCodes, ["FING", "FCIEN"]);
  assert.equal(projection.plan.year, "2011");
  assert.equal(projection.plan.degreeTitle, "Tecnólogo en Cartografía");
  assert.equal(projection.plan.durationMonths, 24);
  assert.equal(projection.plan.minCredits, 180);
  assert.deepEqual(projection.plan.sharedWith, ["Facultad de Ciencias"]);
  assert.deepEqual(projection.campuses.map(({ label }) => label), ["Montevideo"]);

  const catalogEntries = catalog.flatMap((faculty) => faculty.careers
    .filter(({ label }) => label === "Tecnólogo en Cartografía")
    .map((career) => ({ facultyId: faculty.id, career })));
  assert.deepEqual(catalogEntries.map(({ facultyId }) => facultyId).sort(), ["bedelias-fcien", "bedelias-fing"]);
  assert.equal(new Set(catalogEntries.map(({ career }) => career.plans[0].id)).size, 1);
  assert.ok(catalogEntries.every(({ career }) => career.plans[0].defaultCredentialId === "tecnologo-cartografia"));
});

test("conserva las 102 opciones de Bedelías y los ocho mínimos oficiales", () => {
  assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).length, 102);
  assert.equal(projection.courses.length, 104);
  assert.equal(projection.rules.length, 55);
  assert.equal(projection.plan.noPublishedRule, 30);
  assert.deepEqual(Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits])), {
    "cartografia-matematicas": 30,
    "cartografia-geodesia": 16,
    "cartografia-analisis-territorial": 18,
    "cartografia-geomatica": 24,
    "cartografia-humanistica": 9,
    "cartografia-taller": 27,
    "cartografia-pasantia": 10,
    "cartografia-proyecto": 10,
  });
  assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 144);
  assert.equal(credential.minTotalCredits, 180);
  assert.deepEqual(projection.pathways["curricula-personalizada"].periods.map(({ label, courseIds }) => [label, courseIds.length]), [
    ["Orientación del recorrido", 1],
    ["Matemáticas", 15],
    ["Geodesia", 7],
    ["Análisis Territorial", 26],
    ["Geomática", 25],
    ["Humanística", 16],
    ["Taller de Cartografía Digital", 11],
    ["Pasantía", 1],
    ["Proyecto", 1],
    ["Validación de egreso", 1],
  ]);
});

test("exige Pasantía, Proyecto y validación sin duplicar sus créditos", () => {
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), [
    "cartografia-pasantia-obligatoria",
    "cartografia-proyecto-final",
    "validacion-final-plan",
  ]);
  const [internship, project, validation] = credential.requiredCourseGroups
    .map((group) => courseById.get(group.courseIds[0]));
  assert.equal(internship.bedeliasCode, "TCI21");
  assert.equal(internship.credits, 10);
  assert.equal(project.bedeliasCode, "TCI26");
  assert.equal(project.credits, 10);
  assert.equal(validation.credits, 0);
  assert.equal(validation.dataStatus, "manual-validation");
  assert.match(projection.plan.notice, /36 créditos adicionales/i);
});

test("cierra la auditoría y avanza a Tecnólogo en Informática", () => {
  assert.ok(!queue.queue.some(({ identity }) => identity === "tecnologo en cartografia:2011"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 173);
  assert.equal(queue.counts.pendingCanonicalIdentities, 4);
  assert.equal(queue.queue[0].identity, "quimico:2015");
});
