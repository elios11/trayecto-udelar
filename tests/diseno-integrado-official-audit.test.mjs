import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cenurln-licenciatura-en-diseno-integrado-2012.json");
const audit = audits.audits.find((entry) => entry.identity === "licenciatura en diseno integrado:2012");

test("publica Diseño Integrado una sola vez bajo FADU", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Diseño Integrado")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fadu");
  assert.equal(matches[0].career.plans.length, 1);
  assert.equal(matches[0].career.plans[0].label, "Plan 2012 · vigente");
  assert.equal(projection.plan.degreeTitle, "Licenciado en Diseño Integrado");
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.plan.durationMonths, 48);
});

test("modela los dos perfiles oficiales sin convertirlos en títulos distintos", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["desarrollo-local", "eficiencia-energetica"]);
  assert.deepEqual(projection.campuses.map((campus) => campus.label), ["Salto"]);
  assert.ok(Object.values(projection.pathways).every((pathway) => pathway.campusIds[0] === "salto"));
  assert.ok(Object.values(projection.pathways).every((pathway) => pathway.periods.length === 8));

  const local = projection.pathways["desarrollo-local"].periods.flatMap((period) => period.courseIds);
  const energy = projection.pathways["eficiencia-energetica"].periods.flatMap((period) => period.courseIds);
  assert.ok(local.includes("cenurln-gestion-local-habitat"));
  assert.ok(!local.includes("cenurln-gestion-energia"));
  assert.ok(energy.includes("cenurln-gestion-energia"));
  assert.ok(!energy.includes("cenurln-gestion-local-habitat"));
  for (const sharedId of ["cenurln-introduccion-vida-universitaria", "cenurln-diseno-1", "cenurln-proyecto-practica"]) {
    assert.ok(local.includes(sharedId));
    assert.ok(energy.includes(sharedId));
  }
  assert.equal(audit.officialPlan.title, "Licenciado en Diseño Integrado");
});

test("conserva los mínimos oficiales y la obligatoriedad del núcleo común", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.equal(requirements.get("ldi-basico"), 90);
  assert.equal(requirements.get("ldi-desarrollo"), 180);
  assert.equal(requirements.get("ldi-desarrollo-optativas"), 20);
  assert.equal(requirements.get("ldi-egreso"), 90);
  assert.equal(requirements.get("ldi-egreso-proyecto"), 50);
  assert.equal(requirements.get("ldi-egreso-optativas"), 40);
  const required = projection.creditStructure.credentials[0].requiredCourseGroups[0];
  assert.equal(required.minCompleted, 30);
  assert.equal(required.courseIds.length, 30);
  const introduction = projection.courses.find((course) => course.id === "cenurln-introduccion-vida-universitaria");
  const project = projection.courses.find((course) => course.id === "cenurln-proyecto-practica");
  assert.equal(introduction.credits, 0);
  assert.equal(project.credits, 50);
  assert.match(project.name, /anual/i);
});

test("proyecta las previaturas vigentes y el umbral del proyecto final", () => {
  assert.equal(projection.rules.length, 36);
  const project = projection.rules.find((rule) => rule.target.code === "cenurln-proyecto-practica");
  assert.equal(project.expression.children.at(-1).creditRequirement.minimum, 270);
  assert.ok(project.expression.children.some((child) => child.options.some((option) => option.code === "cenurln-diseno-6")));
  const disenoTres = projection.rules.find((rule) => rule.target.code === "cenurln-diseno-3");
  assert.ok(disenoTres.expression.children.some((child) => child.options.some((option) => option.code === "cenurln-introduccion-vida-universitaria")));
});
