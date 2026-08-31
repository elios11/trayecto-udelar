import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-licenciatura-en-computacion-2025.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en computacion:2025");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const credentialById = new Map(projection.creditStructure.credentials.map((credential) => [credential.id, credential]));

test("publica un único Plan 2025 en cinco sedes sin duplicar la carrera", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-degree-with-intermediate-title-flexible-curriculum-and-multiple-campus-offerings");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(projection.plan.year, "2025");
  assert.equal(projection.plan.degreeTitle, "Licenciado en Computación");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), ["montevideo", "tacuarembo", "colonia", "salto", "paysandu"]);
  assert.deepEqual(Object.keys(projection.pathways), ["curricula-personalizada"]);
  assert.deepEqual(projection.pathways["curricula-personalizada"].campusIds, ["montevideo", "tacuarembo", "colonia", "salto", "paysandu"]);

  const catalogEntries = catalog.flatMap((faculty) => faculty.careers
    .filter(({ label }) => label === "Licenciatura en Computación")
    .map((career) => ({ facultyId: faculty.id, career })));
  assert.equal(catalogEntries.length, 1);
  assert.equal(catalogEntries[0].facultyId, "bedelias-fing");
  assert.equal(catalogEntries[0].career.plans[0].defaultCredentialId, "licenciado-computacion");
});

test("conserva la currícula flexible y todos los mínimos oficiales del título final", () => {
  const credential = credentialById.get("licenciado-computacion");
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.equal(credential.title, "Licenciado en Computación");
  assert.equal(credential.minTotalCredits, 360);
  assert.equal(requirements["liccomp-basic"], 90);
  assert.equal(requirements["liccomp-math"], 30);
  assert.equal(requirements["liccomp-foundations"], 50);
  assert.equal(requirements["liccomp-tech"], 130);
  assert.equal(requirements["liccomp-systems"], 30);
  assert.equal(requirements["liccomp-software"], 10);
  assert.equal(requirements["liccomp-data"], 10);
  assert.equal(requirements["liccomp-integrating"], 30);
  assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).length, 44);
  assert.equal(projection.courses.length, 47);
  assert.equal(projection.rules.length, 26);
  assert.equal(projection.plan.noPublishedRule, 2);
  assert.deepEqual(projection.pathways["curricula-personalizada"].periods.map(({ label, courseIds }) => [label, courseIds.length]), [
    ["Orientación del recorrido", 1],
    ["Matemática y Ciencias Experimentales", 29],
    ["Fundamentos de la Computación", 5],
    ["Computación Aplicada", 2],
    ["Actividades Integradoras", 2],
    ["Ingeniería y Sociedad", 6],
    ["Trabajo final", 1],
    ["Validación de egreso", 1],
  ]);
  assert.equal(projection.pathways["curricula-personalizada"].catalogCourseIds, undefined);
});

test("modela Analista como título intermedio sin exigir el trabajo final de Licenciatura", () => {
  const analyst = credentialById.get("analista-computacion");
  assert.equal(analyst.title, "Analista en Computación");
  assert.equal(analyst.minTotalCredits, 270);
  assert.deepEqual(Object.fromEntries(analyst.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits])), {
    "liccomp-math": 20,
    "liccomp-foundations": 40,
    "liccomp-systems": 20,
    "liccomp-software": 10,
    "liccomp-data": 10,
    "liccomp-integrating": 15,
  });
  assert.deepEqual(analyst.requiredCourseGroups, []);
});

test("exige el trabajo final de 20 créditos y la validación sólo para la Licenciatura", () => {
  const credential = credentialById.get("licenciado-computacion");
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), ["liccomp-trabajo-final", "validacion-final-plan"]);
  const thesis = courseById.get(credential.requiredCourseGroups[0].courseIds[0]);
  const validation = courseById.get(credential.requiredCourseGroups[1].courseIds[0]);
  assert.equal(thesis.name, "Trabajo final integrador de la Licenciatura");
  assert.equal(thesis.credits, 20);
  assert.deepEqual(thesis.eligibleRequirementIds, ["liccomp-integrating"]);
  assert.equal(validation.credits, 0);
  assert.equal(validation.dataStatus, "manual-validation");
});

test("cierra la auditoría y avanza a Tecnólogo en Cartografía", () => {
  assert.ok(!queue.queue.some(({ identity }) => identity === "licenciatura en computacion:2025"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 165);
  assert.equal(queue.counts.pendingCanonicalIdentities, 12);
  assert.equal(queue.queue[0].identity, "tecnologo en cartografia:2011");
});
