import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fq-licenciatura-en-quimica-2016.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en quimica:2016");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "licenciado-en-quimica");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const courseByCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));

const creditsInPeriods = (pathway) => pathway.periods
  .flatMap(({ courseIds }) => courseIds)
  .reduce((sum, id) => sum + courseById.get(id).credits, 0);

test("publica un único Plan 2016 con Montevideo completo y Salto sólo como primer año", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-current-degree-montevideo-complete-salto-first-year");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(projection.plan.degreeTitle, "Licenciado en Química");
  assert.equal(projection.plan.year, "2016");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 320);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), ["montevideo", "salto"]);
  assert.equal(projection.plan.campuses.find(({ id }) => id === "salto").defaultPathwayId, "salto-primer-ano");
  assert.deepEqual(Object.keys(projection.pathways), ["montevideo", "salto-primer-ano"]);
});

test("traslada el damero 2026 y conserva los 174 créditos obligatorios exactos", () => {
  const montevideo = projection.pathways.montevideo;
  assert.deepEqual(montevideo.periods.map(({ label }) => label), [
    "Primer semestre", "Segundo semestre", "Tercer semestre", "Cuarto semestre", "Quinto semestre",
    "Sexto semestre", "Semestres 7 y 8", "Validación de egreso",
  ]);
  assert.deepEqual(montevideo.periods.map(({ courseIds }) => courseIds.reduce((sum, id) => sum + courseById.get(id).credits, 0)), [
    26, 34, 39, 29, 46, 0, 40, 0,
  ]);
  assert.equal(creditsInPeriods(montevideo), 214);
  assert.equal(montevideo.periods.flatMap(({ courseIds }) => courseIds).filter((id) => courseById.get(id).bedeliasCode === "922").length, 1);
  assert.equal(courseByCode.get("190").credits, 10);
  assert.equal(courseByCode.get("512").credits, 5);
  assert.ok(montevideo.periods.find(({ label }) => label === "Quinto semestre").courseIds.includes(courseByCode.get("512").id));
  assert.ok(!montevideo.periods.flatMap(({ courseIds }) => courseIds).includes(courseByCode.get("505").id));

  const selectedIds = new Set(montevideo.periods.flatMap(({ courseIds }) => courseIds));
  const allocated = (nodeId) => [...selectedIds].reduce((sum, id) => (
    sum + (courseById.get(id).creditAllocations.find((allocation) => allocation.nodeId === nodeId)?.credits ?? 0)
  ), 0);
  assert.deepEqual([allocated("lq-no-quimicas"), allocated("lq-quimicas"), allocated("lq-tesis")], [80, 94, 40]);
});

test("controla por separado flexibilidad, vinculación y Proyecto Específico de Título", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.deepEqual(requirements, {
    "lq-formacion-basica": 174,
    "lq-no-quimicas": 80,
    "lq-quimicas": 94,
    "lq-complementaria": 86,
    "lq-flexibles": 76,
    "lq-optativas": 56,
    "lq-avm": 10,
    "lq-pet": 60,
    "lq-pet-especificas": 20,
    "lq-tesis": 40,
  });
  assert.equal(credential.minTotalCredits, 320);
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), ["lq-tesis-nominal", "validacion-final-plan"]);
  assert.deepEqual(credential.requiredCourseGroups[0].courseIds.map((id) => courseById.get(id).bedeliasCode), ["922"]);
  const nodes = new Map(projection.creditStructure.nodes.map((node) => [node.id, node]));
  assert.equal(nodes.get("lq-optativas").parentId, "lq-flexibles");
  assert.equal(nodes.get("lq-electivas").parentId, "lq-flexibles");
  assert.equal(nodes.get("lq-flexibles").parentId, "lq-complementaria");
  assert.equal(nodes.get("lq-avm").parentId, "lq-complementaria");
  assert.ok(audit.anomalies.some(({ field }) => field === "projectPrerequisite"));
});

test("restringe Salto a la oferta regional explícita y no simula carrera completa", () => {
  const salto = projection.pathways["salto-primer-ano"];
  assert.deepEqual(salto.campusIds, ["salto"]);
  assert.match(salto.description, /primer año/i);
  assert.match(salto.description, /continúa en Montevideo/i);
  assert.deepEqual(salto.periods.map(({ label }) => label), ["Orientación del recorrido"]);
  assert.equal(creditsInPeriods(salto), 0);
  assert.deepEqual(salto.catalogCourseIds.map((id) => courseById.get(id).bedeliasCode), [
    "CENURLN-CBB22", "CENURLN-CBB24", "CENURLN-CIO10", "CENURLN-SRN08", "CENURLN-SRN05",
  ]);
  assert.ok(salto.catalogCourseIds.every((id) => courseById.get(id).bedeliasCode.startsWith("CENURLN-")));
  assert.ok(!salto.catalogCourseIds.includes(courseByCode.get("922").id));
  assert.ok(!salto.periods.flatMap(({ courseIds }) => courseIds).some((id) => courseById.get(id).name.includes("Validación")));
});

test("preserva composición, previaturas y referencias internas consistentes", () => {
  assert.equal(projection.courses.length, 326);
  assert.equal(projection.rules.length, 125);
  assert.equal(projection.plan.noPublishedRule, 91);
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 322);
  assert.equal(audit.bedeliasComparison.normalizedCourseCount, 320);
  for (const pathway of Object.values(projection.pathways)) {
    for (const id of [...pathway.periods.flatMap(({ courseIds }) => courseIds), ...(pathway.catalogCourseIds ?? [])]) {
      assert.ok(courseById.has(id), id);
    }
  }
  for (const group of credential.requiredCourseGroups) {
    assert.ok(group.courseIds.every((id) => courseById.has(id)), group.id);
  }
});

test("registra una sola carrera en FQ y avanza la cola al siguiente plan", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-fq");
  const careers = faculty.careers.filter(({ label }) => label === "Licenciatura en Química");
  assert.equal(careers.length, 1);
  assert.equal(careers[0].plans.length, 1);
  assert.equal(careers[0].plans[0].id, "bedelias-fq-licenciatura-en-quimica-2016");
  assert.equal(careers[0].plans[0].defaultTrajectoryId, "montevideo");
  assert.equal(careers[0].plans[0].defaultCredentialId, "licenciado-en-quimica");
  assert.ok(!queue.queue.some(({ identity }) => identity === "licenciatura en quimica:2016"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 172);
  assert.equal(queue.counts.pendingCanonicalIdentities, 5);
  assert.equal(queue.queue[0].identity, "licenciatura en tecnologias de la quimica:2022");
});
