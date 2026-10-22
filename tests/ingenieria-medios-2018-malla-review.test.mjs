import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const review = JSON.parse(await readFile(new URL("../data/fic/ingenieria-medios-2018-malla-review.json", import.meta.url), "utf8"));

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
