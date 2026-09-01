import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-ingenieria-quimica-2021.json");
const audit = registry.audits.find(({ identity }) => identity === "ingenieria quimica:2021");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "ingeniero-quimico");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const courseByCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));

test("publica un único Plan 2021 compartido con dos sedes de alcance explícito", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-shared-degree-with-entry-and-partial-regional-pathways");
  assert.equal(projection.plan.year, "2021");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 450);
  assert.equal(projection.plan.degreeTitle, "Ingeniero Químico");
  assert.deepEqual(projection.plan.sharedWith, ["Facultad de Química"]);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), ["montevideo", "salto"]);
  assert.equal(projection.plan.campuses.find(({ id }) => id === "salto").defaultPathwayId, "inicio-salto");
  assert.deepEqual(Object.keys(projection.pathways), ["curricula-personalizada", "ingreso-fing", "ingreso-fq", "inicio-salto"]);
  assert.ok(Object.values(projection.pathways).every(({ credentialId }) => credentialId === credential.id));
});

test("controla los mínimos de grupos y áreas sin convertir sus brechas en bolsas inventadas", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.equal(Object.keys(requirements).length, 12);
  assert.equal(requirements["iq-formacion-basica"], 190);
  assert.equal(requirements["iq-formacion-especifica"], 190);
  assert.equal(requirements["iq-tecnicas-no-especificas"], 30);
  assert.equal(requirements["iq-complementarias-grupo"], 5);
  assert.equal(["iq-matematicas", "iq-fisica", "iq-quimica", "iq-biologicas", "iq-troncales", "iq-avanzadas", "iq-tecnicas", "iq-complementarias"]
    .reduce((sum, id) => sum + requirements[id], 0), 375);
  assert.equal(credential.minTotalCredits, 450);
  assert.match(audit.anomalies.find(({ field }) => field === "minimumGaps").resolution, /forma independiente/i);
});

test("exige las dos partes del Proyecto Final y la validación del currículo individual", () => {
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), [
    "iq-proyecto-industrial-1",
    "iq-proyecto-industrial-2",
    "validacion-final-plan",
  ]);
  assert.deepEqual(credential.requiredCourseGroups[0].courseIds.map((id) => courseById.get(id).bedeliasCode), ["Q80"]);
  assert.deepEqual(credential.requiredCourseGroups[1].courseIds.map((id) => courseById.get(id).bedeliasCode), ["Q85", "Q57"]);
  assert.equal(credential.requiredCourseGroups[1].minCompleted, 1);
});

test("limita el tramo de Salto a las 18 unidades regionales y mantiene el catálogo completo en Montevideo", () => {
  const expectedRegionalCodes = [
    "CENURLN-CIM10", "CENURLN-CIM24", "CENURLN-CH201", "CENURLN-SRN03", "CENURLN-SRN10",
    "CENURLN-SRN02", "CENURLN-SRN09", "CENURLN-SRN11", "CENURLN-REF04", "CENURLN-SRN26",
    "CENURLN-SRN05", "CENURLN-SRN12", "CENURLN-SRN08", "CENURLN-SRN07", "CENURLN-AA808",
    "CENURLN-AA504", "CENURLN-SRN06", "CENURLN-SRN13",
  ];
  const salto = projection.pathways["inicio-salto"];
  const montevideo = projection.pathways["curricula-personalizada"];
  assert.deepEqual(salto.campusIds, ["salto"]);
  assert.match(salto.description, /primer año/i);
  assert.match(salto.description, /continúa en Montevideo/i);
  assert.deepEqual(salto.catalogCourseIds.map((id) => courseById.get(id).bedeliasCode), expectedRegionalCodes);
  assert.equal(montevideo.catalogCourseIds.length, 375);
  assert.ok(montevideo.catalogCourseIds.some((id) => courseById.get(id).bedeliasCode === "Q80"));
  for (const pathway of Object.values(projection.pathways)) {
    assert.equal(pathway.periods[0].label, "Orientación del recorrido");
    assert.equal(pathway.periods.at(-1).label, "Validación de egreso");
  }
});

test("fusiona Q47 sin duplicar sus cuatro créditos ni perder su doble elegibilidad", () => {
  const q47 = courseByCode.get("Q47");
  assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode === "Q47").length, 1);
  assert.equal(q47.credits, 4);
  assert.deepEqual(q47.eligibleRequirementIds, ["iq-quimica", "iq-avanzadas"]);
  assert.deepEqual(q47.creditAllocations.map(({ nodeId, credits }) => [nodeId, credits]), [
    ["iq-quimica", 4],
    ["iq-avanzadas", 4],
  ]);
  assert.equal(projection.courses.length, 380);
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 376);
  assert.equal(audit.bedeliasComparison.normalizedCourseCount, 375);
});

test("conserva reglas, referencias internas y una sola entrada por facultad compartida", () => {
  assert.equal(projection.rules.length, 168);
  assert.equal(projection.plan.noPublishedRule, 88);
  for (const pathway of Object.values(projection.pathways)) {
    for (const id of [...pathway.periods.flatMap(({ courseIds }) => courseIds), ...(pathway.catalogCourseIds ?? [])]) {
      assert.ok(courseById.has(id), id);
    }
  }
  for (const group of credential.requiredCourseGroups) {
    assert.ok(group.courseIds.every((id) => courseById.has(id)), group.id);
  }
  for (const facultyId of ["bedelias-fing", "bedelias-fq"]) {
    const faculty = catalog.find(({ id }) => id === facultyId);
    const careers = faculty.careers.filter(({ label }) => label === "Ingeniería Química");
    assert.equal(careers.length, 1, facultyId);
    assert.equal(careers[0].plans[0].id, "bedelias-fing-ingenieria-quimica-2021");
    assert.equal(careers[0].plans[0].defaultTrajectoryId, "curricula-personalizada");
  }
});

test("mantiene cerrada Ingeniería Química y avanza la cola vigente", () => {
  assert.ok(!queue.queue.some(({ identity }) => identity === "ingenieria quimica:2021"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 173);
  assert.equal(queue.counts.pendingCanonicalIdentities, 4);
  assert.equal(queue.queue[0].identity, "quimico:2015");
});
