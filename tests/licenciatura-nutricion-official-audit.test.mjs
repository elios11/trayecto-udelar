import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-enut-licenciatura-en-nutricion-2014.json");
const pageSource = await readFile(new URL("app/page.tsx", root), "utf8");
const audit = audits.audits.find((entry) => entry.identity === "licenciatura en nutricion:2014");

test("publica una sola Licenciatura en Nutrición y distingue la oferta parcial de Paysandú", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Nutrición")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-enut");
  assert.equal(matches[0].career.plans[0].label, "Plan 2014 · vigente");
  assert.equal(projection.plan.degreeTitle, "Licenciado en Nutrición");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.campuses.map(({ id, label }) => ({ id, label })), [
    { id: "montevideo", label: "Montevideo" },
    { id: "paysandu-solo-ciclo-iv", label: "Paysandú · Sólo Ciclo IV" },
  ]);
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.match(projection.plan.notice, /únicamente el Ciclo IV/i);
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});

test("conserva los 360 créditos oficiales por modalidad y los ocho semestres", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.deepEqual([
    "nut-disciplinares",
    "nut-optativas",
    "nut-electivas",
    "nut-practicas-articuladoras",
    "nut-desempeno-profesional",
  ].map((id) => requirements.get(id)), [190, 30, 10, 40, 90]);
  assert.equal([...requirements.values()].slice(1).reduce((sum, credits) => sum + credits, 0), 360);
  assert.equal(projection.pathways.bedelias.periods.length, 8);
  assert.equal(projection.courses.length, 33);

  const allocated = (requirementId) => projection.courses
    .filter((course) => course.eligibleRequirementIds.includes(requirementId))
    .reduce((sum, course) => sum + course.credits, 0);
  assert.equal(allocated("nut-disciplinares"), 190);
  assert.equal(allocated("nut-practicas-articuladoras"), 40);
  assert.equal(allocated("nut-desempeno-profesional"), 90);
});

test("muestra optativas y electivas como catálogo flexible y no como noveno semestre", () => {
  assert.deepEqual(projection.pathways.bedelias.catalogCourseIds, [
    "enut-creditos-optativos",
    "enut-creditos-electivos",
  ]);
  assert.ok(projection.pathways.bedelias.periods.every((period) => period.label !== "Catálogo flexible"));
  assert.ok(projection.pathways.bedelias.catalogCourseIds.every((id) => projection.courses.find((course) => course.id === id)?.curricularBlock));
  assert.match(pageSource, /catalogIds\.has\(course\.id\) \? "opt"/);
});

test("automatiza sólo las previaturas que el estado académico puede representar fielmente", () => {
  assert.equal(projection.rules.length, 13);
  const pa1 = projection.rules.find((rule) => rule.target.code === "enut-practica-articuladora-1");
  assert.deepEqual(pa1.expression.children[0].options.map((option) => option.code), ["enut-metodologia-practicas"]);

  const cycleThree = [
    "enut-etica-alimentacion",
    "enut-nutricion-poblacional",
    "enut-diseno-alimentos",
    "enut-nutricion-clinica-1",
    "enut-nutricion-clinica-2",
    "enut-gestion-alimentacion-colectiva",
    "enut-practica-articuladora-4",
    "enut-practica-articuladora-5",
  ];
  for (const targetId of cycleThree) {
    const rule = projection.rules.find((entry) => entry.target.code === targetId);
    const minimum = rule.expression.children.find((child) => child.groupCreditRequirement)?.groupCreditRequirement;
    assert.deepEqual(minimum, {
      minimum: 56,
      groupCode: "nut-ciclo-1-ucobs",
      groupName: "unidades obligatorias del Ciclo I",
    });
  }
  assert.equal(projection.requirementCourseGroups["nut-ciclo-1-ucobs"].length, 10);
  assert.match(pageSource, /requirementCourseGroups\?\.\[groupCode\]/);

  const professionalPractice = projection.rules.find((rule) => rule.target.code === "enut-practica-profesional");
  assert.equal(professionalPractice.expression.children.length, 24);
  const finalWork = projection.rules.find((rule) => rule.target.code === "enut-trabajo-final-grado");
  assert.equal(finalWork.expression.children.length, 19);
  assert.match(audit.anomalies.find((entry) => entry.field === "cycleTwoEnrollment").resolution, /no registra intentos no aprobados/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "finalWorkDefense").resolution, /condición de defensa/i);
});
