import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fq-bioquimico-clinico-2015.json");
const audit = registry.audits.find(({ identity }) => identity === "bioquimico clinico:2015");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "bioquimico-clinico");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const courseByCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));

const creditsInPeriods = (pathway) => pathway.periods
  .flatMap(({ courseIds }) => courseIds)
  .reduce((sum, id) => sum + courseById.get(id).credits, 0);

test("publica un único Plan 2015 con Montevideo completo y Salto sólo como primer año", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-current-degree-montevideo-complete-salto-first-year");
  assert.equal(projection.plan.degreeTitle, "Bioquímico Clínico");
  assert.equal(projection.plan.year, "2015");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 450);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), ["montevideo", "salto"]);
  assert.equal(projection.plan.campuses.find(({ id }) => id === "salto").defaultPathwayId, "salto-primer-ano");
  assert.deepEqual(Object.keys(projection.pathways), ["montevideo", "salto-primer-ano"]);
  assert.ok(Object.values(projection.pathways).every(({ credentialId }) => credentialId === credential.id));
});

test("traslada sin ajustes el damero vigente 2026 y cuenta una sola vez el Practicantado", () => {
  const montevideo = projection.pathways.montevideo;
  assert.deepEqual(montevideo.periods.map(({ label }) => label), [
    "Primer semestre", "Segundo semestre", "Tercer semestre", "Cuarto semestre", "Quinto semestre",
    "Sexto semestre", "Séptimo semestre", "Octavo semestre", "Semestres 9 y 10", "Validación de egreso",
  ]);
  assert.deepEqual(montevideo.periods.map(({ courseIds }) => courseIds.reduce((sum, id) => sum + courseById.get(id).credits, 0)), [
    26, 40, 46, 37, 46, 38, 43, 47, 55, 0,
  ]);
  assert.equal(creditsInPeriods(montevideo), 378);
  assert.equal(montevideo.periods.flatMap(({ courseIds }) => courseIds).filter((id) => courseById.get(id).bedeliasCode === "966X").length, 1);
  assert.equal(courseByCode.get("190").credits, 10);
  assert.equal(courseByCode.get("512").credits, 5);
  assert.ok(montevideo.periods.find(({ label }) => label === "Quinto semestre").courseIds.includes(courseByCode.get("512").id));
  assert.ok(!montevideo.periods.flatMap(({ courseIds }) => courseIds).includes(courseByCode.get("505").id));
});

test("controla todos los mínimos oficiales y el Practicantado nominal", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.deepEqual(requirements, {
    "bcl-formacion-basica": 219,
    "bcl-biologicas": 69,
    "bcl-fisicomatematicas": 42,
    "bcl-quimicas": 108,
    "bcl-profesional": 104,
    "bcl-flexibles": 72,
    "bcl-optativas": 60,
    "bcl-practicantado": 55,
  });
  assert.equal(credential.minTotalCredits, 450);
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), ["bcl-practicantado-nominal", "validacion-final-plan"]);
  assert.deepEqual(credential.requiredCourseGroups[0].courseIds.map((id) => courseById.get(id).bedeliasCode), ["966X"]);

  const selectedIds = new Set(projection.pathways.montevideo.periods.flatMap(({ courseIds }) => courseIds));
  const allocated = (nodeId) => [...selectedIds].reduce((sum, id) => (
    sum + (courseById.get(id).creditAllocations.find((allocation) => allocation.nodeId === nodeId)?.credits ?? 0)
  ), 0);
  assert.deepEqual([
    allocated("bcl-biologicas"), allocated("bcl-fisicomatematicas"), allocated("bcl-quimicas"),
    allocated("bcl-profesional"), allocated("bcl-practicantado"),
  ], [69, 42, 108, 104, 55]);
});

test("restringe Salto a 17 alternativas regionales y no simula egreso ni carrera completa", () => {
  const salto = projection.pathways["salto-primer-ano"];
  assert.deepEqual(salto.campusIds, ["salto"]);
  assert.match(salto.description, /primer año/i);
  assert.match(salto.description, /continúa en Montevideo/i);
  assert.deepEqual(salto.periods.map(({ label }) => label), ["Orientación del recorrido"]);
  assert.equal(creditsInPeriods(salto), 0);
  assert.deepEqual(salto.catalogCourseIds.map((id) => courseById.get(id).bedeliasCode), [
    "CENURLN-SRN21", "CENURLN-SRN07", "CENURLN-SRN15", "CENURLN-CBB22", "CENURLN-CBB24",
    "CENURLN-SRN03", "CENURLN-SRN10", "CENURLN-SRN02", "CENURLN-SRN09", "CENURLN-REF04",
    "CENURLN-SRN11", "CENURLN-CIO10", "CENURLN-CIO20", "CENURLN-SRN31", "CENURLN-SRN08",
    "CENURLN-SRN05", "CENURLN-SRN12",
  ]);
  assert.ok(salto.catalogCourseIds.every((id) => courseById.get(id).bedeliasCode.startsWith("CENURLN-")));
  assert.ok(!salto.catalogCourseIds.includes(courseByCode.get("966X").id));
  assert.ok(!salto.periods.flatMap(({ courseIds }) => courseIds).some((id) => courseById.get(id).name.includes("Validación")));
});

test("preserva composición, previaturas y referencias internas consistentes", () => {
  assert.equal(projection.courses.length, 455);
  assert.equal(projection.rules.length, 397);
  assert.equal(projection.plan.noPublishedRule, 149);
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 453);
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
  const careers = faculty.careers.filter(({ label }) => label === "Bioquímico Clínico");
  assert.equal(careers.length, 1);
  assert.equal(careers[0].plans.length, 1);
  assert.equal(careers[0].plans[0].id, "bedelias-fq-bioquimico-clinico-2015");
  assert.equal(careers[0].plans[0].defaultTrajectoryId, "montevideo");
  assert.equal(careers[0].plans[0].defaultCredentialId, "bioquimico-clinico");
  assert.ok(!queue.queue.some(({ identity }) => identity === "bioquimico clinico:2015"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 177);
  assert.equal(queue.counts.pendingCanonicalIdentities, 0);
  assert.equal(queue.queue.length, 0);
});
