import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cenurln-licenciatura-en-ciencias-hidricas-aplicadas-2016.json");
const audit = audits.audits.find((entry) => entry.identity === "licenciatura en ciencias hidricas aplicadas:2016");

test("normaliza la identidad histórica a la Licenciatura en Recursos Hídricos y Riego vigente", () => {
  const careers = catalog.flatMap((faculty) => faculty.careers);
  const current = careers.filter((career) => career.label === "Licenciatura en Recursos Hídricos y Riego");
  assert.equal(current.length, 1);
  assert.equal(careers.some((career) => career.label === "Licenciatura en Ciencias Hídricas Aplicadas"), false);
  assert.equal(current[0].plans.length, 1);
  assert.equal(current[0].plans[0].label, "Plan 2017 · vigente");
  assert.equal(projection.plan.year, "2017");
  assert.equal(projection.plan.degreeTitle, "Licenciado en Recursos Hídricos y Riego");
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.plan.durationMonths, 48);
});

test("proyecta la combinación tipo 2024 y la flexibilidad del Plan 2017", () => {
  assert.equal(projection.courses.filter((course) => !course.curricularBlock).length, 36);
  assert.equal(projection.courses.filter((course) => !course.curricularBlock).reduce((sum, course) => sum + course.credits, 0), 377);
  assert.deepEqual(projection.pathways.bedelias.periods.slice(0, 8).map((period) => period.label), [
    "Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4",
    "Semestre 5", "Semestre 6", "Semestre 7", "Semestre 8",
  ]);
  const flexible = projection.courses.find((course) => course.curricularBlock);
  assert.equal(flexible.name, "Créditos de Libre Elección");
  assert.equal(flexible.credits, 55);
  assert.match(projection.plan.notice, /no todas las unidades visibles son obligatorias/i);
});

test("aplica mínimos por área, prácticas obligatorias y las previaturas oficiales", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.equal(requirements.get("rhyr-basicas"), 110);
  assert.equal(requirements.get("rhyr-especificas"), 190);
  assert.equal(requirements.get("rhyr-practica"), 40);
  assert.equal(requirements.get("rhyr-complementarias"), 5);
  assert.equal(requirements.get("rhyr-libre"), 55);
  assert.equal(projection.creditStructure.credentials[0].requiredCourseGroups[0].minCompleted, 2);
  assert.equal(projection.rules.length, 27);
  const pasantia = projection.rules.find((rule) => rule.target.code === "cenurln-pasantia");
  const proyecto = projection.rules.find((rule) => rule.target.code === "cenurln-proyecto-final");
  assert.equal(pasantia.expression.children[0].creditRequirement.minimum, 210);
  assert.equal(proyecto.expression.children[0].creditRequirement.minimum, 250);
  const fluidos = projection.rules.find((rule) => rule.target.code === "cenurln-mecanica-fluidos");
  assert.ok(fluidos.expression.children.some((child) => child.options.some((option) => option.assessment === "course" && option.code === "cenurln-calculo-2")));
  assert.ok(fluidos.expression.children.some((child) => child.options.some((option) => option.assessment === "exam" && option.code === "cenurln-fisica-1")));
});

test("publica Salto como única sede completa sin convertir Concordia en otra sede", () => {
  assert.deepEqual(projection.campuses.map((campus) => campus.label), ["Salto"]);
  assert.deepEqual(projection.pathways.bedelias.campusIds, ["salto"]);
  assert.equal(audit.offerings[0].curriculumVariant, false);
  assert.match(audit.anomalies.find((entry) => entry.field === "courseLocation").resolution, /no como una segunda sede completa/i);
});
