import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fq-ingenieria-de-alimentos-2003.json");
const audit = registry.audits.find(({ identity }) => identity === "ingenieria de alimentos:2003");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "ingeniero-alimentario");
const pathway = projection.pathways["trayectoria-flexible"];

test("publica un único Plan 2003 conjunto con el título y la sede vigentes", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-joint-degree-flexible-individual-curriculum");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(projection.plan.degreeTitle, "Ingeniero Alimentario");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 450);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), ["montevideo"]);
  assert.deepEqual(projection.plan.sharedWith, [
    "FACULTAD DE AGRONOMÍA",
    "FACULTAD DE INGENIERÍA",
    "FACULTAD DE VETERINARIA",
  ]);
});

test("no convierte el primer año de Salto en sede completa ni en otra trayectoria", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["trayectoria-flexible"]);
  assert.deepEqual(pathway.campusIds, ["montevideo"]);
  assert.match(projection.plan.notice, /primer año puede cursarse en Salto/i);
  assert.match(projection.plan.notice, /continúa en Montevideo/i);
  assert.match(audit.anomalies.find(({ field }) => field === "regionalFirstYear").resolution, /no se presenta como sede completa/i);
});

test("controla simultáneamente los mínimos de grupo y de materia sin sumarlos dos veces", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.deepEqual(requirements, {
    "food-integrative": 35,
    "food-basic": 180,
    "food-biology": 25,
    "food-physics": 30,
    "food-informatics": 5,
    "food-mathematics": 45,
    "food-chemistry": 45,
    "food-complementary": 35,
    "food-legal": 4,
    "food-professional": 150,
    "food-quality": 12,
    "food-process-engineering": 55,
    "food-microbiology": 15,
    "food-food-chemistry": 20,
    "food-technology": 20,
  });
  assert.equal(requirements["food-integrative"] + requirements["food-basic"] + requirements["food-complementary"] + requirements["food-professional"], 400);
  assert.equal(credential.minTotalCredits - 400, 50);
  assert.equal(requirements["food-basic"] - 150, 30);
  assert.equal(requirements["food-complementary"] - requirements["food-legal"], 31);
  assert.equal(requirements["food-professional"] - 122, 28);
});

test("muestra el catálogo acreditable completo sin fingir 389 obligaciones", () => {
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 389);
  assert.equal(projection.courses.length, 394);
  assert.equal(projection.rules.length, 155);
  assert.equal(projection.plan.noPublishedRule, 103);
  assert.equal(new Set(projection.courses.map(({ id }) => id)).size, projection.courses.length);
  assert.equal(pathway.periods.find(({ label }) => label === "Orientación del recorrido").courseIds.length, 4);
  assert.equal(pathway.periods.at(-1).label, "Validación de egreso");
  assert.equal(credential.requiredCourseGroups[0].id, "validacion-final-plan");
  assert.ok(projection.courses.every(({ creditAllocations }) => creditAllocations?.length > 0));
});

test("ubica la carrera bajo FQ y cierra la cola de auditoría", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-fq");
  const career = faculty.careers.find(({ label }) => label === "Ingeniería de Alimentos");
  assert.equal(career.plans[0].id, "bedelias-fq-ingenieria-de-alimentos-2003");
  assert.equal(career.plans[0].defaultTrajectoryId, "trayectoria-flexible");
  assert.ok(!queue.queue.some(({ identity }) => identity === "ingenieria de alimentos:2003"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 172);
  assert.equal(queue.counts.pendingCanonicalIdentities, 5);
  assert.equal(queue.queue[0].identity, "licenciatura en tecnologias de la quimica:2022");
});
