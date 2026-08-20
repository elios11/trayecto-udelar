import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cut-tecnico-operador-de-alimentos-2011.json");
const audit = audits.audits.find((entry) => entry.identity === "tecnico operador de alimentos:2011");

test("publica una sola carrera de Escuela de Nutrición en Tacuarembó", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Tecnico Operador de Alimentos")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-enut");
  assert.equal(matches[0].career.plans[0].label, "Plan 2011 · vigente");
  assert.equal(projection.plan.degreeTitle, "Técnico Operador de Alimentos");
  assert.equal(projection.plan.durationMonths, 24);
  assert.equal(projection.plan.minCredits, 160);
  assert.deepEqual(projection.campuses.map(({ id, label }) => ({ id, label })), [
    { id: "tacuarembo", label: "Tacuarembó" },
  ]);
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.equal(projection.pathways.bedelias.label, "Malla vigente");
});

test("conserva la distribución normativa exacta de los 160 créditos", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.deepEqual([
    "toa-disciplinares", "toa-optativas", "toa-electivas", "toa-practica",
  ].map((id) => requirements.get(id)), [111, 12, 5, 32]);
  assert.equal([111, 12, 5, 32].reduce((total, credits) => total + credits, 0), 160);

  const mandatory = projection.courses.filter((course) => course.eligibleRequirementIds.includes("toa-disciplinares"));
  assert.equal(mandatory.length, 15);
  assert.equal(mandatory.reduce((total, course) => total + course.credits, 0), 111);
  const mandatoryGroup = projection.creditStructure.credentials[0].requiredCourseGroups
    .find((group) => group.id === "toa-cursos-talleres-obligatorios");
  assert.equal(mandatoryGroup.minCompleted, 15);
  assert.equal(mandatoryGroup.courseIds.length, 15);
});

test("presenta la oferta optativa como catálogo y mantiene el bloque electivo separado", () => {
  const optatives = projection.courses.filter((course) => course.eligibleRequirementIds.includes("toa-optativas"));
  assert.equal(optatives.length, 7);
  assert.equal(optatives.reduce((total, course) => total + course.credits, 0), 36);
  assert.ok(optatives.every((course) => course.name.includes("optativa")));
  assert.ok(optatives.every((course) => /nutricion\.edu\.uy/.test(course.creditAllocations[0].sourceUrl)));

  const elective = projection.courses.find((course) => course.id === "cut-electivas");
  assert.equal(elective.credits, 5);
  assert.equal(elective.curricularBlock, true);
  assert.deepEqual(elective.eligibleRequirementIds, ["toa-electivas"]);
  assert.match(projection.plan.notice, /catálogo elegible/i);
});

test("automatiza sólo la aprobación requerida para ingresar a la práctica final", () => {
  assert.equal(projection.rules.length, 1);
  const rule = projection.rules[0];
  assert.equal(rule.target.code, "cut-practica-campo");
  assert.equal(rule.expression.children.length, 15);
  assert.ok(rule.expression.children.every((child) => child.options[0]?.assessment === "course"));
  assert.match(rule.sourceUrl, /Reglamento-Plan-Estudios-TOA/);
  assert.match(audit.anomalies.find((entry) => entry.field === "prerequisites").resolution, /no se convierten en bloqueos más estrictos/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "areas").resolution, /no orientaciones ni trayectorias/i);
});
