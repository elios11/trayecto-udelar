import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cut-tecnicatura-en-desarrollo-regional-sustentable-2013.json");
const audit = audits.audits.find((entry) => entry.identity === "tecnicatura en desarrollo regional sustentable:2013");

test("publica una sola tecnicatura bajo Ciencias Sociales y en Tacuarembó", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Tecnicatura en Desarrollo Regional Sustentable")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fcs");
  assert.equal(matches[0].career.plans[0].label, "Plan 2013 · vigente");
  assert.equal(projection.plan.degreeTitle, "Técnico en Desarrollo Regional Sustentable");
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.plan.minCredits, 270);
  assert.deepEqual(projection.campuses.map(({ id, label }) => ({ id, label })), [
    { id: "tacuarembo", label: "Tacuarembó" },
  ]);
});

test("conserva los cinco módulos y los 48 créditos de libre elección", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.deepEqual([
    "ted-problemas-desarrollo", "ted-abordajes-teoricos", "ted-herramientas-metodologicas",
    "ted-promocion-gestion", "ted-practica-final",
  ].map((id) => requirements.get(id)), [50, 40, 45, 90, 45]);
  assert.deepEqual([
    "ted-electivas-modulo-1", "ted-electivas-modulo-2", "ted-electivas-modulo-3",
    "ted-electivas-modulo-4", "ted-electivas-modulo-5",
  ].map((id) => requirements.get(id)), [5, 10, 8, 5, 20]);
  assert.equal([5, 10, 8, 5, 20].reduce((total, credits) => total + credits, 0), 48);
});

test("la malla de referencia distribuye exactamente los 270 créditos en seis semestres", () => {
  const courses = new Map(projection.courses.map((course) => [course.id, course]));
  assert.equal(projection.pathways.bedelias.label, "Malla de referencia");
  assert.deepEqual(projection.pathways.bedelias.periods.map((period) => period.courseIds
    .reduce((total, id) => total + courses.get(id).credits, 0)), [38, 45, 44, 46, 42, 55]);
  assert.equal(projection.courses.reduce((total, course) => total + course.credits, 0), 270);
  assert.equal(projection.courses.filter((course) => course.curricularBlock).reduce((total, course) => total + course.credits, 0), 48);
});

test("exige la pasantía sin inventar una tabla de previaturas", () => {
  const required = projection.creditStructure.credentials[0].requiredCourseGroups;
  assert.equal(required.length, 1);
  assert.equal(required[0].minCompleted, 1);
  assert.deepEqual(required[0].courseIds, ["cut-pasantia"]);
  assert.equal(projection.rules.length, 0);
  assert.match(audit.anomalies.find((entry) => entry.field === "prerequisites").resolution, /No se inventan correlatividades/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "curriculumFlexibility").resolution, /orientativa/i);
});
