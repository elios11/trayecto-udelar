import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const rivera = await readJson("app/data/bedelias-generated/bedelias-cur-tecnicatura-en-artes-plasticas-y-visuales-2017.json");
const rocha = await readJson("app/data/bedelias-generated/bedelias-cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013.json");

test("presenta una sola carrera con planes territoriales distintos", () => {
  const faculty = catalog.find((candidate) => candidate.label === "Facultad de Artes");
  const careers = faculty.careers.filter((candidate) => candidate.label === "Tecnicatura en Artes Plásticas y Visuales");
  assert.equal(careers.length, 1);
  assert.deepEqual(careers[0].plans.map((plan) => plan.label), ["Plan 2017 · vigente", "Plan 2013 · vigente"]);
  assert.deepEqual(rivera.campuses.map((campus) => campus.label), ["Rivera"]);
  assert.deepEqual(rocha.campuses.map((campus) => campus.label), ["Rocha"]);
  assert.ok([rivera, rocha].every((plan) => plan.plan.durationMonths === 36 && plan.plan.minCredits === 240));

  const audits = registry.audits.filter((entry) => [
    "tecnicatura en artes plasticas y visuales:2017",
    "tecnicatura en artes artes plasticas y visuales:2013",
  ].includes(entry.identity));
  assert.equal(audits.length, 2);
  assert.ok(audits.every((audit) => audit.conclusion.canonicalModel === "one-career-distinct-site-plan"));
});

test("el Plan 2017 exige un solo seminario alternativo en tercer semestre", () => {
  const credential = rivera.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]), [
    ["semester-1", 40],
    ["semester-2", 40],
    ["semester-3", 40],
    ["semester-4", 40],
    ["semester-5", 40],
    ["semester-6", 40],
  ]);
  const mandatory = credential.requiredCourseGroups.find((group) => group.id === "mandatory-curriculum");
  const seminar = credential.requiredCourseGroups.find((group) => group.id === "third-semester-seminar");
  assert.deepEqual([mandatory.minCompleted, mandatory.courseIds.length], [14, 14]);
  assert.deepEqual([seminar.minCompleted, seminar.courseIds.length], [1, 2]);
  assert.deepEqual(
    seminar.courseIds.map((id) => rivera.courses.find((course) => course.id === id)?.bedeliasCode).sort(),
    ["SEMI", "SPAF"],
  );
  assert.match(rivera.plan.notice, /elegí un seminario de 5 créditos/i);
});

test("el Plan 2013 no cuenta las dos entradas complementarias como requisitos", () => {
  const credential = rocha.creditStructure.credentials[0];
  const mandatory = credential.requiredCourseGroups.find((group) => group.id === "mandatory-curriculum");
  assert.deepEqual([mandatory.minCompleted, mandatory.courseIds.length], [15, 15]);
  assert.equal(rocha.courses.filter((course) => course.credits > 0).reduce((sum, course) => sum + course.credits, 0), 240);
  for (const code of ["INUNI", "AP16"]) {
    const course = rocha.courses.find((candidate) => candidate.bedeliasCode === code);
    assert.equal(course.credits, 0);
    assert.deepEqual(course.eligibleRequirementIds, ["supplementary-offer"]);
    assert.ok(!mandatory.courseIds.includes(course.id));
  }
  assert.match(rocha.plan.notice, /no sustituyen las 15 unidades/i);
});
