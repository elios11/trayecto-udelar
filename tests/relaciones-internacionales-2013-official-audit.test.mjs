import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fder-licenciatura-en-relaciones-internacionales-2013.json");
const pageSource = await readFile(new URL("app/page.tsx", root), "utf8");
const audit = audits.audits.find(({ identity }) => identity === "licenciatura en relaciones internacionales:2013");
const intermediate = projection.creditStructure.credentials.find(({ id }) => id === "rrii-tecnico-comercio");
const degree = projection.creditStructure.credentials.find(({ id }) => id === "bedelias-degree");
const courseByCode = new Map(projection.courses.map((course) => [course.bedeliasCode, course]));

test("publica una sola Licenciatura en Relaciones Internacionales Plan 2013", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Relaciones Internacionales")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fder");
  assert.deepEqual(matches[0].career.plans, [{
    id: "bedelias-fder-licenciatura-en-relaciones-internacionales-2013",
    label: "Plan 2013 · vigente",
    defaultTrajectoryId: "bedelias",
    defaultCredentialId: "bedelias-degree",
  }]);
  assert.deepEqual([projection.plan.degreeTitle, projection.plan.durationMonths, projection.plan.minCredits], ["Licenciado en Relaciones Internacionales", 60, 320]);
  assert.deepEqual(projection.campuses, [{ id: "montevideo", label: "Montevideo", official: true, defaultPathwayId: "bedelias" }]);
  assert.equal(audit.conclusion.canonicalModel, "one-current-plan-with-intermediate-trade-title");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});

test("expone el título intermedio real sin cambiar el título final predeterminado", () => {
  assert.deepEqual([intermediate.title, intermediate.minTotalCredits], ["Técnico Asesor en Comercio Internacional", 200]);
  assert.deepEqual(intermediate.nodeRequirements, [
    { nodeId: "rrii-initial", minCredits: 60 },
    { nodeId: "rrii-oriented", minCredits: 87 },
    { nodeId: "rrii-optional", minCredits: 53 },
  ]);
  assert.deepEqual(intermediate.requiredCourseGroups.map(({ id, minCompleted }) => [id, minCompleted]), [
    ["rrii-initial-core", 10],
    ["rrii-oriented-core", 14],
  ]);
  assert.equal(degree.title, "Licenciado en Relaciones Internacionales");
  assert.equal(degree.minTotalCredits, 320);
  assert.match(pageSource, /Título intermedio/);
  assert.match(pageSource, /defaultCredentialId/);
});

test("controla los cuatro mínimos operativos sin sumar el catálogo acumulado", () => {
  const requirements = new Map(projection.creditStructure.nodes.map(({ id, minCredits }) => [id, minCredits]));
  assert.deepEqual([
    requirements.get("rrii-initial"),
    requirements.get("rrii-oriented"),
    requirements.get("rrii-professional"),
    requirements.get("rrii-optional"),
  ], [60, 87, 80, 93]);
  assert.equal(60 + 87 + 80 + 93, 320);
  assert.equal(projection.courses.length, 437);
  assert.ok(courseByCode.get("3097U").eligibleRequirementIds.includes("rrii-optional"));
  assert.deepEqual(courseByCode.get("4032").eligibleRequirementIds, ["rrii-extra"]);
  assert.match(audit.anomalies.find(({ field }) => field === "professionalMandatoryCredits").resolution, /Bedelías operacionaliza 60 \+ 87 \+ 80/i);
});

test("ordena la grilla oficial y mantiene optativas y electivas como alternativas", () => {
  assert.deepEqual(projection.pathways.bedelias.periods.slice(0, 9).map(({ label, courseIds }) => [label, courseIds.length]), [
    ["Semestre 1", 5],
    ["Semestre 2", 6],
    ["Semestre 3", 5],
    ["Semestre 4", 4],
    ["Semestre 5", 5],
    ["Semestre 6", 5],
    ["Semestre 7", 4],
    ["Semestre 8", 5],
    ["Modalidades de egreso", 3],
  ]);
  assert.equal(projection.pathways.bedelias.periods.find(({ label }) => label === "Optativas").courseIds.length, 239);
  assert.equal(projection.pathways.bedelias.periods.find(({ label }) => label === "Electivas").courseIds.length, 146);
  assert.match(projection.pathways.bedelias.description, /no materias que deban aprobarse todas/i);
});

test("exige una Función Universitaria y una modalidad de egreso de 30 créditos", () => {
  const functionGroup = degree.requiredCourseGroups.find(({ id }) => id === "rrii-university-function");
  const graduationGroup = degree.requiredCourseGroups.find(({ id }) => id === "rrii-graduation-mode");
  assert.deepEqual([functionGroup.minCompleted, functionGroup.courseIds.length], [1, 3]);
  assert.deepEqual([graduationGroup.minCompleted, graduationGroup.courseIds.length], [1, 3]);
  assert.deepEqual(graduationGroup.courseIds.map((id) => projection.courses.find((course) => course.id === id).credits), [30, 30, 30]);
  assert.ok(degree.requiredCourseGroups.some(({ id }) => id === "validacion-final-plan"));
});

test("aplica sólo las previaturas oficiales y el umbral de egreso", () => {
  assert.equal(projection.rules.length, 28);
  const rules = new Map(projection.rules.map((rule) => [rule.target.code, rule]));
  const statistics = rules.get(courseByCode.get("3114").id);
  assert.equal(statistics.expression.children.length, 2);
  assert.deepEqual(statistics.expression.children.map((child) => child.options[0].code), [courseByCode.get("2015").id, courseByCode.get("3017").id]);

  const monograph = rules.get(courseByCode.get("3112B").id);
  assert.equal(monograph.expression.children.find((child) => child.creditRequirement)?.creditRequirement.minimum, 200);
  assert.equal(monograph.expression.children.filter((child) => child.options.length > 0).length, 5);
  assert.equal(projection.plan.noPublishedRule, 300);
  assert.equal(projection.plan.publishedRules, 28);
});
