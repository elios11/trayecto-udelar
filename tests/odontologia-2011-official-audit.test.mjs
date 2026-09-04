import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const curriculumQueue = await readJson("data/bedelias/inventory/ui-curriculum-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-odon-odontologia-2011.json");
const audit = registry.audits.find(({ identity }) => identity === "odontologia:2011");
const pathway = projection.pathways.bedelias;
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const courseByCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));
const credential = projection.creditStructure.credentials.find(({ id }) => id === "doctor-odontologia");

const period = (label) => pathway.periods.find((candidate) => candidate.label === label);
const periodCredits = (label) => period(label).courseIds.reduce((sum, id) => sum + courseById.get(id).credits, 0);

test("publica una única Odontología Plan 2011 vigente y completa en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-current-plan-montevideo-with-official-core-and-flexible-catalog");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(projection.plan.degreeTitle, "Doctor en Odontología");
  assert.equal(projection.plan.year, "2011");
  assert.equal(projection.plan.durationMonths, 66);
  assert.equal(projection.plan.minCredits, 495);
  assert.deepEqual(projection.campuses.map(({ id, defaultPathwayId }) => [id, defaultPathwayId]), [["montevideo", "bedelias"]]);
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.match(projection.plan.notice, /40 unidades troncales/i);
  assert.match(projection.plan.notice, /30 créditos flexibles/i);
});

test("ordena las 40 unidades troncales por año y suma 465 créditos antes de la flexibilidad", () => {
  const yearLabels = ["Primer año", "Segundo año", "Tercer año", "Cuarto año", "Quinto año", "Sexto año — semestre 11"];
  assert.deepEqual(pathway.periods.slice(0, 6).map(({ label }) => label), yearLabels);
  assert.deepEqual(pathway.periods.slice(0, 6).map(({ courseIds }) => courseIds.length), [10, 8, 9, 5, 6, 2]);
  assert.deepEqual(yearLabels.map(periodCredits), [91, 89, 88, 73, 84, 40]);

  const core = credential.requiredCourseGroups.find(({ id }) => id === "odontologia-nucleo-troncal");
  assert.equal(core.minCompleted, 40);
  assert.equal(core.courseIds.length, 40);
  assert.equal(core.courseIds.reduce((sum, id) => sum + courseById.get(id).credits, 0), 465);
  assert.ok(core.courseIds.includes(courseByCode.get("5080").id));
});

test("controla 495 créditos entre el núcleo operativo y 30 créditos flexibles", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.deepEqual(requirements, {
    "odontologia-salud-colectiva": 40,
    "odontologia-bases-biologicas": 90,
    "odontologia-patologia": 37,
    "odontologia-clinico-profesional": 230,
    "odontologia-servicios-comunidad": 50,
    "odontologia-general-academica": 18,
    "odontologia-flexible": 30,
  });
  assert.equal(Object.values(requirements).reduce((sum, credits) => sum + credits, 0), 495);
  assert.equal(credential.minTotalCredits, 495);
  assert.deepEqual(credential.requiredCourseGroups.map(({ id, minCompleted, courseIds }) => [id, minCompleted, courseIds.length]), [
    ["odontologia-nucleo-troncal", 40, 40],
    ["validacion-final-plan", 1, 1],
  ]);

  const flexibleCourses = projection.courses.filter((course) => course.eligibleRequirementIds.includes("odontologia-flexible"));
  assert.ok(flexibleCourses.length > 300);
  assert.ok(flexibleCourses.some(({ name }) => /Electiva/i.test(name)));
  assert.equal(courseById.get(credential.requiredCourseGroups[1].courseIds[0]).curricularBlock, true);
});

test("evita doble conteo de agregados y versiones sustituidas", () => {
  for (const code of ["1021", "1022", "1600", "2014", "2017", "2021"]) {
    assert.equal(courseByCode.get(code).credits, 0, code);
    assert.equal(courseByCode.get(code).eligibleRequirementIds.includes("odontologia-flexible"), true, code);
  }
  for (const code of ["1021A", "1021B", "1021C", "1022A", "1022B", "1022C", "1601", "2016", "2022"]) {
    assert.ok(courseByCode.get(code).credits > 0, code);
  }
});

test("conserva las 112 previaturas sin referencias rotas después de normalizar IDs", () => {
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 376);
  assert.equal(audit.bedeliasComparison.normalizedCourseCount, 332);
  assert.equal(audit.bedeliasComparison.prerequisiteRuleCount, 323);
  assert.equal(audit.bedeliasComparison.publishedRuleCount, 112);
  assert.equal(audit.bedeliasComparison.noPublishedRuleCount, 211);
  assert.equal(projection.rules.length, 112);

  const knownCodes = new Set(projection.courses.flatMap((course) => [course.id, course.bedeliasCode].filter(Boolean)));
  const referenced = [];
  const visit = (expression) => {
    for (const option of expression?.options ?? []) referenced.push(option.code);
    for (const child of expression?.children ?? []) visit(child);
  };
  for (const rule of projection.rules) visit(rule.expression);
  assert.deepEqual([...new Set(referenced.filter((code) => code && !knownCodes.has(code)))], []);

  const periodCourseIds = pathway.periods.flatMap(({ courseIds }) => courseIds);
  assert.equal(periodCourseIds.length, projection.courses.length);
  assert.equal(new Set(periodCourseIds).size, projection.courses.length);
});

test("cierra las colas global y curricular sin duplicar la carrera", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-odon");
  const careers = faculty.careers.filter(({ label }) => label === "Odontología");
  assert.equal(careers.length, 1);
  assert.equal(careers[0].plans.length, 1);
  assert.equal(careers[0].plans[0].id, "bedelias-odon-odontologia-2011");
  assert.equal(careers[0].plans[0].defaultTrajectoryId, "bedelias");
  assert.equal(careers[0].plans[0].defaultCredentialId, "doctor-odontologia");
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 177);
  assert.equal(queue.counts.pendingCanonicalIdentities, 0);
  assert.deepEqual(queue.queue, []);
  assert.equal(curriculumQueue.counts.curriculumReady, 139);
  assert.equal(curriculumQueue.counts.curriculumPending, 0);
  assert.deepEqual(curriculumQueue.queue, []);
});
