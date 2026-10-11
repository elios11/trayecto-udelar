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
    ["semester-5", 45],
    ["semester-6", 35],
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

test("el Plan 2013 conserva dos entradas auxiliares como candidatas fuera de la malla", () => {
  const credential = rocha.creditStructure.credentials[0];
  const mandatory = credential.requiredCourseGroups.find((group) => group.id === "mandatory-core");
  const seminars = credential.requiredCourseGroups.find((group) => group.id === "second-year-seminar-slots");
  const visibleIds = new Set(rocha.publishedPathways.bedelias.periods.flatMap(({ courseIds }) => courseIds));
  const candidates = rocha.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  assert.deepEqual([mandatory.minCompleted, mandatory.courseIds.length], [13, 13]);
  assert.deepEqual([seminars.minCompleted, seminars.courseIds.length], [2, 2]);
  assert.deepEqual(candidates.map(({ bedeliasCode, credits }) => [bedeliasCode, credits]).sort(), [["AP16", 0], ["INUNI", 4]]);
  assert.ok(candidates.every(({ id }) => !visibleIds.has(id)));
  assert.match(rocha.plan.notice, /entradas auxiliares.*no forman parte/i);
});
