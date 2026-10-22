import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const review = JSON.parse(await readFile(new URL("../data/fic/ingenieria-medios-2018-malla-review.json", import.meta.url), "utf8"));
const projection = JSON.parse(await readFile(new URL("../app/data/bedelias-generated/bedelias-fic-licenciatura-en-ingenieria-de-medios-2018.json", import.meta.url), "utf8"));
const inventory = JSON.parse(await readFile(new URL("../data/official-trajectories/inventory.json", import.meta.url), "utf8"));

test("FIC publica dos guías parciales de los primeros cuatro semestres", () => {
  assert.equal(review.planId, "bedelias-fic-licenciatura-en-ingenieria-de-medios-2018");
  assert.equal(review.source.documentSha256, "20b9529459fbf3540fd29c3bca0791e08e127960f60bf4b1d5893d6248b1c0be");
  assert.deepEqual(review.firstFourSemesters.map(({ id }) => id), ["fing", "fcea"]);
  for (const pathway of review.firstFourSemesters) {
    assert.deepEqual(pathway.periods.map(({ semester }) => semester), [1, 2, 3, 4]);
    for (const period of pathway.periods) {
      assert.equal(period.rows.reduce((sum, [, , credits]) => sum + credits, 0), period.printedSubtotal);
    }
  }
  assert.deepEqual(review.firstFourSemesters[0].periods[0].rows, review.firstFourSemesters[1].periods[0].rows);
  assert.deepEqual(review.firstFourSemesters[0].periods[3].rows, review.firstFourSemesters[1].periods[3].rows);
  assert.notDeepEqual(review.firstFourSemesters[0].periods[1].rows, review.firstFourSemesters[1].periods[1].rows);
  assert.notDeepEqual(review.firstFourSemesters[0].periods[2].rows, review.firstFourSemesters[1].periods[2].rows);
});

test("la grilla posterior no autoriza completar semestres faltantes", () => {
  assert.equal(review.planMinimums.totalCredits, 360);
  assert.deepEqual(review.laterExamples.map(({ semestersPrinted }) => semestersPrinted), [[6, 7, 8, 9], [6, 7, 8, 9]]);
  assert.ok(review.conflictsAndLimits.some((note) => note.includes("omiten el semestre 5")));
});

test("la proyección reproduce exactamente los cuatro subtotales por variante y mantiene el catálogo del planificador", () => {
  const byId = new Map(projection.courses.map((course) => [course.id, course]));
  for (const [index, audited] of review.auditedPathways.entries()) {
    const pathway = projection.pathways[audited.id];
    const published = projection.publishedPathways[audited.id];
    assert.deepEqual(pathway.periods.map(({ label }) => label), [1, 2, 3, 4].map((semester) => `Semestre ${semester}`));
    assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds), audited.periods.map(({ courseIds }) => courseIds.map((id) => id.startsWith("lim-grilla-") ? `fic-${id}` : `fic-${id.toLowerCase()}`)));
    assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.reduce((sum, id) => sum + byId.get(id).credits, 0)),
      review.firstFourSemesters[index].periods.map(({ printedSubtotal }) => printedSubtotal));
    const availableInPlanner = new Set([...published.catalogCourseIds, ...published.periods.flatMap(({ courseIds }) => courseIds)]);
    assert.ok(availableInPlanner.size >= 24);
    for (const period of pathway.periods) {
      for (const id of period.courseIds) assert.ok(availableInPlanner.has(id), `Falta ${id} en el planificador`);
    }
  }
  const entry = inventory.plans.find(({ planId }) => planId === review.planId);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.equal(entry.evidence.partial, true);
  assert.equal(entry.evidence.completeDegreeSequence, false);
  assert.equal(projection.plan.minCredits, 360);
});
