import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-tecnologo-en-informatica-2007.json");
const audit = registry.audits.find(({ identity }) => identity === "tecnologo en informatica:2007");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "tecnologo-informatica");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));

test("publica un único Plan 2007 interinstitucional con cinco sedes", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-joint-technologist-with-five-campus-offerings");
  assert.equal(projection.plan.year, "2007");
  assert.equal(projection.plan.degreeTitle, "Tecnólogo en Informática");
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.plan.minCredits, 252);
  assert.deepEqual(projection.plan.sharedWith, ["Universidad Tecnológica (UTEC)", "DGETP-UTU"]);
  assert.deepEqual(new Set(projection.campuses.map(({ id }) => id)), new Set([
    "montevideo", "florida", "maldonado", "san-jose", "paysandu",
  ]));
  assert.ok(projection.campuses.every(({ defaultPathwayId }) => defaultPathwayId === "curricula-personalizada"));

  const catalogEntries = catalog.flatMap((faculty) => faculty.careers
    .filter(({ label }) => label === "Tecnólogo en Informática")
    .map((career) => ({ facultyId: faculty.id, career })));
  assert.deepEqual(catalogEntries.map(({ facultyId }) => facultyId), ["bedelias-fing"]);
  assert.equal(catalogEntries[0].career.plans[0].defaultCredentialId, "tecnologo-informatica");
});

test("conserva las 57 opciones de Bedelías y controla los siete mínimos", () => {
  assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).length, 57);
  assert.equal(projection.courses.length, 59);
  assert.equal(projection.rules.length, 61);
  assert.equal(projection.plan.noPublishedRule, 3);
  assert.deepEqual(Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits])), {
    "informatica-matematica": 26,
    "informatica-programacion": 44,
    "informatica-arquitectura": 32,
    "informatica-bases-datos": 24,
    "informatica-desarrollo": 12,
    "informatica-humanas": 28,
    "informatica-proyecto-pasantia": 30,
  });
  assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 196);
  assert.equal(credential.minTotalCredits, 252);
  assert.deepEqual(projection.pathways["curricula-personalizada"].periods.map(({ label, courseIds }) => [label, courseIds.length]), [
    ["Orientación del recorrido", 1],
    ["Matemática", 4],
    ["Programación", 21],
    ["Arquitectura, Sistemas Operativos y Redes", 9],
    ["Bases de Datos y Sistemas de Información", 7],
    ["Desarrollo de Software", 3],
    ["Ciencias Humanas y Sociales", 11],
    ["Proyecto y Pasantía Laboral", 2],
    ["Validación de egreso", 1],
  ]);
});

test("exige Pasantía, Proyecto y validación sin duplicar sus créditos", () => {
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), [
    "informatica-pasantia-obligatoria",
    "informatica-proyecto-final",
    "validacion-final-plan",
  ]);
  const [internship, project, validation] = credential.requiredCourseGroups
    .map((group) => courseById.get(group.courseIds[0]));
  assert.equal(internship.bedeliasCode, "TI21");
  assert.equal(internship.credits, 10);
  assert.equal(project.bedeliasCode, "TI27");
  assert.equal(project.credits, 20);
  assert.equal(validation.credits, 0);
  assert.equal(validation.dataStatus, "manual-validation");
  assert.match(projection.plan.notice, /56 restantes/i);
});

test("cierra la auditoría y avanza a Tecnólogo en Telecomunicaciones", () => {
  assert.ok(!queue.queue.some(({ identity }) => identity === "tecnologo en informatica:2007"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 175);
  assert.equal(queue.counts.pendingCanonicalIdentities, 2);
  assert.equal(queue.queue[0].identity, "tecnicatura en guardavidas:2025");
});
