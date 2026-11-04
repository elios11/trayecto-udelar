import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = JSON.parse(readFileSync(new URL("../data/fcien/biotecnologia-2024-trayectorias.json", import.meta.url), "utf8"));
const projection = JSON.parse(readFileSync(new URL("../app/data/bedelias-generated/bedelias-fq-licenciatura-en-biotecnologia-2024.json", import.meta.url), "utf8"));
const inventory = JSON.parse(readFileSync(new URL("../data/official-trajectories/inventory.json", import.meta.url), "utf8"));
const catalog = JSON.parse(readFileSync(new URL("../app/data/extracted-academic-catalog.json", import.meta.url), "utf8"));

test("las tres puertas de entrada conservan ocho semestres y sus subtotales publicados", () => {
  assert.equal(source.planId, "bedelias-fq-licenciatura-en-biotecnologia-2024");
  assert.deepEqual(source.pathways.map(({ id }) => id), ["fcien-2024", "cenurln-2024", "fq-2024"]);
  assert.deepEqual(source.pathways.map(({ campusIds }) => campusIds),
    [["montevideo"], ["salto", "paysandu"], ["montevideo"]]);
  for (const pathway of source.pathways) {
    assert.deepEqual(pathway.periods.map(({ semester }) => semester), [1, 2, 3, 4, 5, 6, 7, 8]);
    for (const period of pathway.periods) {
      assert.ok(period.rows.length > 0);
      assert.equal(period.rows.reduce((sum, row) => sum + row[1], 0), period.publishedCredits,
        `${pathway.id}, semestre ${period.semester}`);
      for (const [name, credits, kind] of period.rows) {
        assert.equal(typeof name, "string");
        assert.ok(name.length > 2);
        assert.ok(Number.isInteger(credits) && credits > 0);
        assert.ok(kind === undefined || ["flexible-slot", "alternative-slot", "degree-activity"].includes(kind));
      }
    }
  }
  assert.deepEqual(source.pathways.map(({ periods }) => periods.reduce((sum, period) => sum + period.publishedCredits, 0)),
    [357, 360, 360]);
});

test("los cupos flexibles se distinguen de materias y el trabajo final no se duplica", () => {
  for (const pathway of source.pathways) {
    const rows = pathway.periods.flatMap(({ rows }) => rows);
    const flexible = rows.filter(([, , kind]) => kind === "flexible-slot");
    assert.ok(flexible.length >= 5);
    assert.ok(flexible.every(([name]) => /optativas\/electivas/i.test(name)));
    assert.equal(rows.filter(([, , kind]) => kind === "degree-activity").length, 1);
    assert.equal(rows.filter(([, , kind]) => kind === "degree-activity")[0][1], 30);
  }
});

test("la proyección conserva todas las filas y usa la entrada regional donde corresponde", () => {
  const entry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.equal(entry.evidence.expectedCoursePlacements, 110);
  assert.equal(entry.evidence.matchedCoursePlacements, 110);
  assert.deepEqual(projection.plan.campuses.map(({ id, defaultPathwayId }) => [id, defaultPathwayId]), [
    ["montevideo", "fcien-2024"], ["salto", "cenurln-2024"], ["paysandu", "cenurln-2024"],
  ]);
  const byId = new Map(projection.courses.map((course) => [course.id, course]));
  for (const pathway of source.pathways) {
    const periods = projection.publishedPathways[pathway.id].periods;
    assert.equal(periods.length, 8);
    assert.deepEqual(periods.map(({ courseIds }) => courseIds.length),
      source.pathways.find(({ id }) => id === pathway.id).periods.map(({ rows }) => rows.length));
    for (const period of periods) for (const id of period.courseIds) {
      assert.ok(byId.has(id), `${pathway.id}: ${id}`);
      assert.equal(byId.get(id).authorityStatus, "verified");
    }
  }
  assert.ok(!projection.courses.some(({ bedeliasCode, authorityStatus }) =>
    bedeliasCode === "FCIEN-BG939" && authorityStatus === "verified"));
});

test("las tres facultades ofrecen el mismo plan y abren su trayectoria de ingreso", () => {
  const expected = new Map([
    ["bedelias-fq", "fq-2024"],
    ["bedelias-fcien", "fcien-2024"],
    ["bedelias-cenurln", "cenurln-2024"],
  ]);
  for (const [facultyId, pathwayId] of expected) {
    const faculty = catalog.find(({ id }) => id === facultyId);
    const matches = faculty.careers.flatMap(({ plans }) => plans)
      .filter(({ id }) => id === source.planId);
    assert.equal(matches.length, 1, facultyId);
    assert.equal(matches[0].defaultTrajectoryId, pathwayId);
  }
  const entry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.deepEqual(entry.catalogPlacements.map(({ serviceId }) => serviceId).sort(),
    ["fq", "bedelias-fcien", "bedelias-cenurln"].sort());
});
