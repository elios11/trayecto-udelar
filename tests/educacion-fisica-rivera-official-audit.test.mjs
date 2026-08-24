import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cur-licenciatura-en-educacion-fisica-2014.json");
const audit = registry.audits.find((entry) => entry.identity === "licenciatura en educacion fisica:2014");

test("conserva LEFoPE 2014 como plan propio y activo de Rivera", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.conclusion.canonicalModel, "distinct-regional-plan-and-teaching-practice-option");
  assert.equal(audit.conclusion.regionalCurriculumVariant, true);
  assert.equal(projection.plan.degreeTitle, "Licenciado en Educación Física. Opción: Prácticas Educativas");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.campuses, [{
    id: "rivera",
    label: "Rivera",
    official: true,
    defaultPathwayId: "bedelias",
  }]);

  const career = catalog.flatMap((faculty) => faculty.careers)
    .find((candidate) => candidate.label === "Licenciatura en Educación Física - Opción Prácticas Educativas");
  assert.deepEqual(career.plans.map((plan) => plan.label), ["Plan 2014 · vigente"]);
});

test("controla la estructura oficial de 304 créditos obligatorios y 56 opcionales", () => {
  const credential = projection.creditStructure.credentials[0];
  const expected = {
    sports: 64,
    education: 130,
    "body-practices": 34,
    health: 50,
    leisure: 26,
    optional: 56,
  };
  assert.deepEqual(
    Object.fromEntries(credential.nodeRequirements.map((entry) => [entry.nodeId, entry.minCredits])),
    expected,
  );
  assert.equal(Object.values(expected).reduce((sum, credits) => sum + credits, 0), 360);

  const mandatory = projection.courses.filter((course) => [
    "sports",
    "education",
    "body-practices",
    "health",
    "leisure",
  ].includes(course.eligibleRequirementIds[0]));
  assert.equal(mandatory.length, 33);
  assert.equal(mandatory.reduce((sum, course) => sum + course.credits, 0), 304);
  const core = credential.requiredCourseGroups.find((group) => group.id === "mandatory-core");
  assert.deepEqual([core.minCompleted, core.courseIds.length], [33, 33]);

  const optional = projection.courses.filter((course) => course.eligibleRequirementIds.includes("optional"));
  assert.equal(optional.length, 406);
  assert.ok(optional.reduce((sum, course) => sum + course.credits, 0) > 56);
  assert.match(projection.plan.notice, /Bedelía debe validar/i);
});

test("ordena la malla obligatoria en ocho semestres y mantiene las prácticas anuales", () => {
  assert.deepEqual(projection.pathways.bedelias.periods.slice(0, 11).map((period) => period.label), [
    "Semestre 1",
    "Semestre 2",
    "Semestre 3",
    "Semestre 4",
    "Anual (semestres 3 y 4)",
    "Semestre 5",
    "Semestre 6",
    "Anual (semestres 5 y 6)",
    "Semestre 7",
    "Semestre 8",
    "Anual (semestres 7 y 8)",
  ]);
  const mandatoryPeriods = projection.pathways.bedelias.periods.slice(0, 11);
  assert.equal(mandatoryPeriods.flatMap((period) => period.courseIds).length, 33);

  const validation = projection.creditStructure.credentials[0].requiredCourseGroups
    .find((group) => group.id === "validacion-final-plan");
  assert.equal(validation.minCompleted, 1);
  assert.match(validation.label, /40% vinculados con Educación/i);
  assert.match(validation.label, /10 créditos de extensión/i);
});
