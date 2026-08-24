import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cur-tecnicatura-en-gestion-de-recursos-naturales-2011.json");
const audit = registry.audits.find((entry) => entry.identity === "tecnicatura en gestion de recursos naturales:2011");

test("normaliza la tecnicatura como título propio de Facultad de Ciencias en Rivera", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-plan-one-offering-flexible-by-axes");
  assert.equal(projection.plan.degreeTitle, "Técnico en Gestión de Recursos Naturales y Desarrollo Sustentable");
  assert.equal(projection.plan.durationMonths, 30);
  assert.equal(projection.plan.minCredits, 195);
  assert.deepEqual(projection.campuses.map((campus) => campus.label), ["Rivera"]);

  const faculty = catalog.find((candidate) => candidate.label === "Facultad de Ciencias");
  const career = faculty.careers.find((candidate) => candidate.label === "Tecnicatura en Gestión de Recursos Naturales");
  assert.deepEqual(career.plans.map((plan) => plan.label), ["Plan 2011 · vigente"]);
  assert.ok(audit.conclusion.normalization.some((line) => /no otorgar automáticamente|no.*intermedia automática/i.test(line)));
});

test("controla los tres mínimos, el Trabajo Final y los 195 créditos", () => {
  const credential = projection.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements, [
    { nodeId: "conceptual-operational", minCredits: 50 },
    { nodeId: "diagnosis", minCredits: 50 },
    { nodeId: "application", minCredits: 50 },
    { nodeId: "final-work", minCredits: 35 },
  ]);
  assert.equal(credential.minTotalCredits, 195);
  const finalWork = credential.requiredCourseGroups.find((group) => group.id === "mandatory-final-work");
  assert.deepEqual([finalWork.minCompleted, finalWork.courseIds.length], [1, 1]);
  const course = projection.courses.find((candidate) => candidate.bedeliasCode === "RN205");
  assert.equal(course.credits, 35);
  assert.ok(finalWork.courseIds.includes(course.id));
});

test("mantiene el catálogo flexible y hace explícito el máximo optativo", () => {
  assert.equal(projection.courses.filter((course) => course.dataStatus !== "manual-validation").length, 75);
  assert.ok(projection.courses.reduce((sum, course) => sum + course.credits, 0) > 195);
  assert.deepEqual(projection.pathways.bedelias.periods.slice(0, 5).map((period) => period.label), [
    "CONCEPTUALES - OPERATIVAS",
    "DIAGNÓSTICO",
    "APLICACIÓN",
    "OPTATIVAS",
    "TRABAJO FINAL",
  ]);
  const validation = projection.creditStructure.credentials[0].requiredCourseGroups
    .find((group) => group.id === "validacion-final-plan");
  assert.match(validation.label, /máximo 10 créditos optativos/i);
  assert.match(projection.plan.notice, /catálogo|currículo|máximo de 10 créditos optativos/i);
});
