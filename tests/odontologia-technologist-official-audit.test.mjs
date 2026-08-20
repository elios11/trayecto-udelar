import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const assistant = await readJson("app/data/bedelias-generated/bedelias-odon-asistente-en-odontologia-2017.json");
const hygienist = await readJson("app/data/bedelias-generated/bedelias-odon-higienista-en-odontologia-2017.json");

test("proyecta las dos carreras tecnológicas completas y su primer año común", () => {
  for (const projection of [assistant, hygienist]) {
    assert.equal(projection.plan.minCredits, 160);
    assert.equal(projection.plan.durationMonths, 24);
    assert.equal(projection.courses.length, 22);
    assert.equal(projection.courses.reduce((sum, course) => sum + course.credits, 0), 160);
    assert.deepEqual(projection.pathways.bedelias.periods.map((period) => period.courseIds.length), [7, 7, 5, 3]);
    assert.equal(projection.campuses.length, 1);
    assert.equal(projection.campuses[0].label, "Montevideo · Facultad de Odontología");
  }
  assert.deepEqual(
    assistant.pathways.bedelias.periods.slice(0, 2).map((period) => period.courseIds),
    hygienist.pathways.bedelias.periods.slice(0, 2).map((period) => period.courseIds),
  );
});

test("conserva los doce créditos optativos o electivos sin volverlos obligatorios nominales", () => {
  for (const projection of [assistant, hygienist]) {
    const requirement = projection.creditStructure.nodes.find((node) => node.id === "odontologia-optativas-electivas");
    assert.equal(requirement.minCredits, 12);
    const flexible = projection.courses.filter((course) => course.curricularBlock);
    assert.equal(flexible.reduce((sum, course) => sum + course.credits, 0), 12);
    const required = projection.creditStructure.credentials[0].requiredCourseGroups[0].courseIds;
    assert.ok(flexible.every((course) => !required.includes(course.id)));
  }
});

test("distingue aprobación de curso y aprobación de evaluación final en las previaturas", () => {
  const clinical = assistant.rules.find((rule) => rule.target.code === "odon-procedimientos-tecnicos-clinicos");
  assert.ok(clinical.expression.children.some((child) => child.options[0]?.assessment === "course"));
  assert.ok(clinical.expression.children.some((child) => child.options[0]?.assessment === "exam"));
  const service = hygienist.rules.find((rule) => rule.target.code === "odon-practica-servicios");
  assert.ok(service.expression.children.some((child) => child.options[0]?.code === "odon-programacion-atencion-actividad-clinica"));
  assert.ok(service.expression.children.some((child) => child.options[0]?.code === "odon-instrumental-odontologico" && child.options[0].assessment === "exam"));
  assert.ok(assistant.courses.filter((course) => assistant.rules.some((rule) => rule.target.code === course.id)).every((course) => course.ruleCoverage === "published"));
  assert.ok(hygienist.courses.filter((course) => hygienist.rules.some((rule) => rule.target.code === course.id)).every((course) => course.ruleCoverage === "published"));
});

test("no convierte una práctica en el interior en una sede completa", () => {
  for (const identity of ["asistente en odontologia:2017", "higienista en odontologia:2017"]) {
    const audit = audits.audits.find((entry) => entry.identity === identity);
    assert.equal(audit.offerings.length, 1);
    assert.deepEqual(audit.offerings[0].locations, ["Montevideo · Facultad de Odontología"]);
    assert.match(audit.bedeliasComparison.interpretation, /no confirman una sede regional completa vigente/i);
  }
  assert.match(hygienist.plan.notice, /no bloquea automáticamente/i);
});
