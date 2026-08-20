import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fcea-tecnologo-en-gestion-universitaria-2018.json");
const audit = audits.audits.find((entry) => entry.identity === "tecnologo en gestion universitaria:2018");

test("publica un único Tecnólogo en Gestión Universitaria vigente en Montevideo", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Tecnólogo en Gestión Universitaria")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fcea");
  assert.equal(matches[0].career.plans[0].label, "Plan 2018 · vigente");
  assert.equal(projection.plan.degreeTitle, "Tecnólogo en Gestión Universitaria");
  assert.equal(projection.plan.durationMonths, 30);
  assert.equal(projection.plan.minCredits, 225);
  assert.deepEqual(projection.campuses.map(({ id, label }) => ({ id, label })), [
    { id: "montevideo", label: "Montevideo" },
  ]);
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});

test("aplica los mínimos vigentes de 2026 sin contar dos veces la libre elección", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.deepEqual([
    "tgu-csh",
    "tgu-administracion",
    "tgu-juridica",
    "tgu-contable",
    "tgu-integradora",
    "tgu-metodos",
    "tgu-libre",
  ].map((id) => requirements.get(id)), [40, 90, 20, 10, 20, 10, 35]);
  assert.equal([...requirements.values()].slice(1).reduce((sum, credits) => sum + credits, 0), 225);

  const mandatoryIds = new Set(projection.creditStructure.credentials[0].requiredCourseGroups
    .find((group) => group.id === "tgu-nucleo-obligatorio").courseIds);
  const allocatedMandatory = (requirementId) => projection.courses
    .filter((course) => mandatoryIds.has(course.id) && course.eligibleRequirementIds.includes(requirementId))
    .reduce((sum, course) => sum + course.credits, 0);
  assert.deepEqual([
    "tgu-csh",
    "tgu-administracion",
    "tgu-juridica",
    "tgu-contable",
    "tgu-integradora",
    "tgu-metodos",
  ].map(allocatedMandatory), [40, 90, 20, 10, 10, 10]);
});

test("separa los cinco semestres del catálogo flexible y exige una sola UPC", () => {
  assert.deepEqual(projection.pathways.bedelias.periods.map((period) => period.label), [
    "Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5",
  ]);
  assert.deepEqual(projection.pathways.bedelias.periods.map((period) => period.courseIds.length), [5, 4, 3, 4, 5]);
  assert.equal(projection.pathways.bedelias.catalogCourseIds.length, 24);
  assert.ok(projection.pathways.bedelias.catalogCourseIds.every((id) => {
    const course = projection.courses.find((entry) => entry.id === id);
    return course?.eligibleRequirementIds[0] === "tgu-libre";
  }));
  assert.ok(!projection.courses.some((course) => /Cargos y Remuneraciones|Transformación Cultural/.test(course.name)));

  const [mandatory, practice] = projection.creditStructure.credentials[0].requiredCourseGroups;
  assert.deepEqual([mandatory.minCompleted, mandatory.courseIds.length], [19, 19]);
  assert.deepEqual([practice.minCompleted, practice.courseIds.length], [1, 2]);
  assert.deepEqual(practice.courseIds.map((id) => projection.courses.find((course) => course.id === id).credits), [20, 10]);
});

test("documenta las previaturas sin inferirlas del orden semestral", () => {
  assert.equal(projection.rules.length, 0);
  assert.match(projection.plan.notice, /Autogestión/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "prerequisites").resolution, /no infiere correlatividades/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "creditMinimums").resolution, /40 CSH y 35 libres/i);
});
