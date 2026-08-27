import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fartes-licenciatura-en-interpretacion-musical-2005.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en interpretacion musical:2005");

const expectedPathwayIds = [
  "opcion-canto", "opcion-clarinete", "opcion-contrabajo", "opcion-corno", "opcion-fagot",
  "opcion-flauta", "opcion-guitarra", "opcion-oboe", "opcion-organo", "opcion-percusion",
  "opcion-piano", "opcion-saxofon", "opcion-trombon", "opcion-trompeta", "opcion-viola",
  "opcion-violin", "opcion-violoncello",
];
const coursesById = new Map(plan.courses.map((course) => [course.id, course]));
const periodCourseNames = (pathwayId, label) => {
  const period = plan.pathways[pathwayId].periods.find((candidate) => candidate.label === label);
  return (period?.courseIds ?? []).map((courseId) => coursesById.get(courseId)?.name);
};

test("audita Interpretación Musical como un título con diecisiete menciones", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-seventeen-certified-instrument-options");
  assert.equal(audit.officialPlan.durationMonths, 48);
  assert.equal(audit.officialPlan.semesters, 8);
  assert.equal(audit.officialPlan.minimumCredits, 360);
  assert.deepEqual(audit.officialPlan.trajectories.map(({ id }) => id), expectedPathwayIds);
  assert.match(audit.officialPlan.trajectories.find(({ id }) => id === "opcion-corno").description, /continuidad académica/);
  assert.match(audit.officialPlan.trajectories.find(({ id }) => id === "opcion-trombon").description, /no figura.*2026/);
});

test("proyecta los seis mínimos oficiales en cada opción", () => {
  assert.deepEqual([plan.plan.year, plan.plan.durationMonths, plan.plan.minCredits], ["2005", 48, 360]);
  assert.equal(plan.plan.auditStatus, "official-evidence-complete");
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.deepEqual(Object.keys(plan.pathways), expectedPathwayIds);
  assert.deepEqual(
    plan.creditStructure.nodes.slice(1).map(({ id, minCredits }) => [id, minCredits]),
    [
      ["common-core", 138],
      ["degree-core", 18],
      ["option-specific", 152],
      ["electives", 29],
      ["special-projects", 8],
      ["graduation", 15],
    ],
  );
  assert.deepEqual(plan.creditStructure.credentials.map(({ id }) => id), expectedPathwayIds);
  assert.ok(plan.creditStructure.credentials.every(({ minTotalCredits, nodeRequirements }) => (
    minTotalCredits === 360
    && nodeRequirements.reduce((sum, requirement) => sum + requirement.minCredits, 0) === 360
  )));
});

test("mantiene separadas las materias específicas y completa también las opciones de continuidad", () => {
  assert.ok(plan.courses.length > 1000);
  assert.ok(plan.courses.every((course) => !course.eligibleRequirementIds.includes("plan-total")));
  assert.deepEqual(periodCourseNames("opcion-piano", "Materias específicas de la opción").slice(0, 8), [
    "Piano 1", "Piano 2", "Piano 3", "Piano 4", "Piano 5", "Piano 6", "Piano 7", "Piano 8",
  ]);
  assert.ok(periodCourseNames("opcion-canto", "Materias específicas de la opción").includes("Arte Escénico 8"));
  assert.ok(!periodCourseNames("opcion-piano", "Materias específicas de la opción").some((name) => /^Canto \d+$/.test(name)));
  assert.ok(Object.values(plan.pathways).every(({ periods }) => periods.some(({ label }) => label === "Actividad de Graduación")));
  assert.deepEqual(periodCourseNames("opcion-trombon", "Actividad de Graduación"), ["Actividad de Graduación · Trombón"]);
});
