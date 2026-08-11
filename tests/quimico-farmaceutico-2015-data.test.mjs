import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const initial = JSON.parse(await readFile(new URL("../app/data/quimico-farmaceutico-2015-fq.json", import.meta.url), "utf8"));
const catalog = JSON.parse(await readFile(new URL("../app/data/quimico-farmaceutico-2015-electivas.json", import.meta.url), "utf8"));
const source = JSON.parse(await readFile(new URL("../data/fq/quimico-farmaceutico-2015-trayectoria.json", import.meta.url), "utf8"));
const snapshot = JSON.parse(await readFile(new URL("../data/bedelias/fq-quimica-farmaceutica-2015.json", import.meta.url), "utf8"));
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

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
  assert.equal(initial.courses.reduce((sum, course) => sum + course.credits, 0), 379);
  assert.equal(initial.courses.find((course) => course.name === "Practicantado")?.credits, 55);
});

test("builds the ten-semester damero updated by Facultad de Química", () => {
  const trajectory = initial.trajectories.suggested;
  assert.equal(trajectory.semesters.length, 10);
  assert.equal(trajectory.semesters.flat().length, 48);
  const ids = new Set(initial.courses.map((course) => course.id));
  for (const id of trajectory.semesters.flat()) assert.ok(ids.has(id), id);
  assert.ok(initial.courses.some((course) => course.name === "Bioquímica Opción II" && course.credits === 10));
  assert.ok(initial.courses.some((course) => course.name === "Laboratorio de Bioquímica" && course.credits === 5));
  assert.ok(initial.courses.some((course) => course.name === "Sistemas de Gestión" && course.credits === 4));
  assert.equal(initial.source.suggestedCurriculum, source.source.suggestedCurriculum);
});

test("keeps the complete Bedelias composition and modeled rules behind deferred plan chunks", () => {
  assert.equal(initial.plan.bedeliasCompositionCourses, snapshot.plan.courses.length);
  assert.equal(initial.plan.localCourses + initial.plan.externalEquivalences, snapshot.plan.courses.length);
  assert.equal(initial.courses.length + catalog.courses.length, snapshot.plan.courses.length);
  assert.equal(initial.rules.length + catalog.rules.length, initial.plan.publishedRules);
  assert.equal(initial.plan.partialRules, snapshot.prerequisites.filter((rule) => rule.expression && hasRawNode(rule.expression)).length);
  assert.match(pageSource, /import\("\.\/data\/quimico-farmaceutico-2015-fq\.json"\)/);
  assert.match(pageSource, /import\("\.\/data\/quimico-farmaceutico-2015-electivas\.json"\)/);
  assert.doesNotMatch(pageSource, /import qf2015DataJson from/);
});

test("preserves official provenance and never projects raw prerequisite nodes", () => {
  assert.equal(initial.source.planDocument, source.source.planDocument);
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
