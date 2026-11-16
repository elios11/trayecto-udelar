import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";

const projection = JSON.parse(readFileSync(
  new URL("../app/data/bedelias-generated/bedelias-isef-licenciatura-en-educacion-fisica-2017.json", import.meta.url),
  "utf8",
));
const byId = new Map(projection.courses.map((course) => [course.id, course]));
const sum = (ids) => ids.reduce((total, id) => total + byId.get(id).credits, 0);
const ids = (periods) => periods.flatMap((period) => period.courseIds);

test("ISEF expone ocho semestres por opción y sólo las 64 identidades auditadas en el planificador", () => {
  for (const id of Object.keys(projection.publishedPathways)) {
    const { periods, courses, generated } = buildRegisteredPlanPresentation(id, projection);
    assert.equal(generated, false);
    assert.deepEqual(periods.map(({ label }) => label), Array.from({ length: 8 }, (_, index) => `Semestre ${index + 1}`));
    const placements = ids(periods);
    assert.equal(new Set(placements).size, placements.length);
    assert.equal(courses.length, 64);
    assert.ok(courses.every(({ authorityStatus }) => authorityStatus === "verified"));
    assert.ok(periods[4].courseIds.includes("isef-ce5p1"));
    assert.ok(periods[6].courseIds.includes("isef-ce7p2"));
    assert.equal(periods[6].courseIds.filter((courseId) => courseId.startsWith("isef-osem")).length, 1);
    assert.equal(periods[7].courseIds.filter((courseId) => courseId.startsWith("isef-osem")).length, 0);
    const choiceIds = periods.flatMap(({ choiceCourseIds }) => choiceCourseIds ?? []);
    assert.equal(sum(placements.filter((courseId) => !choiceIds.includes(courseId))), id === "deporte" ? 306 : 330);
    for (const code of ["cb1af", "faf", "ce1as", "ce1ar"]) {
      assert.equal(byId.get(`isef-${code}`)?.authorityStatus, "candidate");
    }
  }
  assert.deepEqual(projection.publishedPathways["practicas-corporales"].campusIds, ["montevideo", "maldonado"]);
  assert.match(projection.plan.notice, /Salud en Maldonado.*no confirma/i);
  assert.equal(byId.get("isef-opc01").credits, 10);
  assert.match(byId.get("isef-opc01").creditConflict, /Bedelías: 12/);
});

test("Deporte exige cuatro modalidades entre tres semestres y la app no presume el egreso", () => {
  const { periods } = projection.publishedPathways.deporte;
  assert.deepEqual(periods.map(({ choiceCourseIds }) => choiceCourseIds?.length ?? 0), [0, 0, 0, 0, 0, 2, 3, 2]);
  const choices = periods.flatMap(({ choiceCourseIds }) => choiceCourseIds ?? []);
  assert.equal(sum(choices), 42);
  assert.ok(choices.every((id) => byId.get(id).elective === true));
  const degree = projection.creditStructure.credentials.find(({ id }) => id === "bedelias-degree");
  assert.equal(degree.minTotalCredits, 360);
  assert.deepEqual(degree.nodeRequirements.find(({ nodeId }) => nodeId === "modalidades-deporte"), {
    nodeId: "modalidades-deporte", minCredits: 24,
  });
  const group = degree.requiredCourseGroups.find(({ id }) => id === "cuatro-modalidades");
  assert.equal(group.minCompleted, 4);
  assert.deepEqual(new Set(group.courseIds), new Set(choices));
  assert.ok(projection.creditStructure.credentials.every((credential) =>
    credential.requiredCourseGroups.some(({ id }) => id === "validacion-final-plan")));
});
