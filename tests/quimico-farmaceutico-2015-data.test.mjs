import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const initial = JSON.parse(await readFile(new URL("../app/data/quimico-farmaceutico-2015-fq.json", import.meta.url), "utf8"));
const catalog = JSON.parse(await readFile(new URL("../app/data/quimico-farmaceutico-2015-electivas.json", import.meta.url), "utf8"));
const source = JSON.parse(await readFile(new URL("../data/fq/quimico-farmaceutico-2015-trayectoria.json", import.meta.url), "utf8"));
const snapshot = JSON.parse(await readFile(new URL("../data/bedelias/fq-quimica-farmaceutica-2015.json", import.meta.url), "utf8"));
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const coursesById = new Map(initial.courses.map((course) => [course.id, course]));

test("projects the current Plan 2015 identity and its only confirmed degree", () => {
  assert.equal(initial.plan.year, "2015");
  assert.equal(initial.plan.current, true);
  assert.equal(initial.plan.minCredits, 450);
  assert.equal(initial.plan.durationMonths, 60);
  assert.equal(initial.creditStructure.credentials.length, 1);
  assert.equal(initial.creditStructure.credentials[0].id, "pharmacist");
  assert.equal(initial.creditStructure.credentials[0].title, "Químico Farmacéutico");
});

test("preserves every official credit minimum without inventing a semester for flexible credits", () => {
  const minima = Object.fromEntries(initial.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.deepEqual(minima, {
    "qf2015-mandatory": 324,
    "qf2015-cfm": 42,
    "qf2015-cq": 108,
    "qf2015-cbb": 69,
    "qf2015-cflg": 105,
    "qf2015-flexible": 71,
    "qf2015-optative": 60,
    "qf2015-elective": 0,
    "qf2015-practicum": 55,
  });
  assert.equal(initial.plan.mandatoryCredits + initial.plan.flexibleCredits + initial.plan.practicumCredits, 450);
  assert.equal(initial.courses.find((course) => course.name === "Practicantado")?.credits, 55);
});

test("offers the current damero and two clearly identified historical references", () => {
  assert.deepEqual(Object.keys(initial.trajectories), ["suggested", "historical-2024", "original-2015"]);
  assert.equal(initial.trajectories.suggested.status, "current");
  assert.equal(initial.trajectories["historical-2024"].status, "historical");
  assert.equal(initial.trajectories["original-2015"].status, "historical");
  assert.match(initial.trajectories["historical-2024"].description, /No representa la distribución vigente/);
  assert.match(initial.trajectories["original-2015"].description, /referencia histórica/);
  assert.equal(initial.trajectories.suggested.sourceUrl, source.source.suggestedCurriculum);
  assert.equal(initial.trajectories["historical-2024"].sourceUrl, source.source.previousSuggestedCurriculum);
  assert.equal(initial.trajectories["original-2015"].sourceUrl, source.source.planDocument);
});

test("validates every damero as a complete ten-semester distribution of 379 scheduled credits", () => {
  const expectedCourseCounts = { suggested: 48, "historical-2024": 47, "original-2015": 45 };
  for (const [id, trajectory] of Object.entries(initial.trajectories)) {
    assert.equal(trajectory.semesters.length, 10, id);
    assert.equal(trajectory.semesters.flat().length, expectedCourseCounts[id], id);
    assert.equal(new Set(trajectory.semesters.flat()).size, expectedCourseCounts[id], id);
    assert.equal(trajectory.semesters.flat().reduce((sum, courseId) => sum + coursesById.get(courseId).credits, 0), 379, id);
    for (const courseId of trajectory.semesters.flat()) assert.ok(coursesById.has(courseId), `${id}: ${courseId}`);
  }
});

test("preserves the defining differences between the three official versions", () => {
  const names = (id) => initial.trajectories[id].semesters.flat().map((courseId) => coursesById.get(courseId).name);
  const current = names("suggested");
  const previous = names("historical-2024");
  const original = names("original-2015");
  assert.ok(current.includes("Bioquímica Opción II"));
  assert.ok(current.includes("Laboratorio de Bioquímica"));
  assert.ok(current.includes("Sistemas de Gestión"));
  assert.ok(previous.includes("Bioquímica Opción III"));
  assert.ok(previous.includes("Unidad curricular del Área Calidad"));
  assert.ok(!previous.includes("Laboratorio de Bioquímica"));
  assert.equal(initial.courses.find((course) => course.name === "Unidad curricular del Área Calidad")?.bedeliasCode, undefined);
  assert.ok(original.includes("Matemática 01"));
  assert.ok(original.includes("Matemática 02"));
  assert.ok(original.includes("Microbiología General"));
  assert.ok(original.includes("Buenas Prácticas y Gestión Integral"));
  assert.ok(!original.includes("Matemática A"));
});

test("keeps the complete Bedelias composition and modeled rules behind deferred plan chunks", () => {
  const localSnapshotCodes = new Set(snapshot.plan.courses.filter((course) => !course.serviceCode).map((course) => course.code));
  const projectedBedeliasCourses = initial.courses.filter((course) => localSnapshotCodes.has(course.bedeliasCode));
  assert.equal(initial.plan.bedeliasCompositionCourses, snapshot.plan.courses.length);
  assert.equal(initial.plan.localCourses + initial.plan.externalEquivalences, snapshot.plan.courses.length);
  assert.equal(projectedBedeliasCourses.length + catalog.courses.length, snapshot.plan.courses.length);
  assert.equal(initial.rules.length + catalog.rules.length, initial.plan.publishedRules);
  assert.equal(initial.plan.partialRules, snapshot.prerequisites.filter((rule) => rule.expression && hasRawNode(rule.expression)).length);
  assert.match(pageSource, /import\("\.\/data\/quimico-farmaceutico-2015-fq\.json"\)/);
  assert.match(pageSource, /import\("\.\/data\/quimico-farmaceutico-2015-electivas\.json"\)/);
  assert.doesNotMatch(pageSource, /import qf2015DataJson from/);
});

test("preserves official provenance and never projects raw prerequisite nodes", () => {
  assert.equal(initial.source.planDocument, source.source.planDocument);
  assert.equal(initial.source.previousSuggestedCurriculumResolution, source.source.previousSuggestedCurriculumResolution);
  assert.equal(initial.source.optativesCatalog, source.source.optativesCatalog);
  assert.equal(catalog.source.electivesCatalog, source.source.electivesCatalog);
  assert.equal(initial.rules.flatMap((rule) => collectRawNodes(rule.expression)).length, 0);
  assert.equal(catalog.rules.flatMap((rule) => collectRawNodes(rule.expression)).length, 0);
});

function hasRawNode(expression) {
  return collectRawNodes(expression).length > 0;
}

function collectRawNodes(expression, output = []) {
  if (!expression) return output;
  if (expression.kind === "requirement" && expression.parserStatus === "raw") output.push(expression.label);
  for (const child of expression.children ?? []) collectRawNodes(child, output);
  return output;
}
