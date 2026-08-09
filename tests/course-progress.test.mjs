import assert from "node:assert/strict";
import test from "node:test";
import {
  hasRecordedCourseProgress,
  hasRecordedProgressOutsideCatalog,
  sortCoursesByProgress,
} from "../app/course-progress.mjs";

test("solo considera progreso académico aprobado o exonerado", () => {
  assert.equal(hasRecordedCourseProgress("exonerated"), true);
  assert.equal(hasRecordedCourseProgress("approved"), true);
  assert.equal(hasRecordedCourseProgress("pending"), false);
  assert.equal(hasRecordedCourseProgress(undefined), false);
});

test("detecta progreso guardado fuera del catálogo inicial", () => {
  const knownIds = new Set(["known"]);
  assert.equal(hasRecordedProgressOutsideCatalog({ known: "exonerated", hidden: "pending" }, knownIds), false);
  assert.equal(hasRecordedProgressOutsideCatalog({ known: "pending", hidden: "approved" }, knownIds), true);
  assert.equal(hasRecordedProgressOutsideCatalog({ hidden: "exonerated" }, knownIds), true);
});

test("ordena exoneradas, aprobadas y pendientes alfabéticamente sin mutar la entrada", () => {
  const courses = [
    { id: "p-z", name: "Zoología" },
    { id: "e-z", name: "Álgebra 10" },
    { id: "a-z", name: "Ética" },
    { id: "e-a", name: "Álgebra 2" },
    { id: "p-a", name: "Arquitectura" },
    { id: "a-a", name: "Economía" },
  ];
  const originalOrder = courses.map((course) => course.id);
  const sorted = sortCoursesByProgress(courses, {
    "e-z": "exonerated",
    "e-a": "exonerated",
    "a-z": "approved",
    "a-a": "approved",
  });

  assert.deepEqual(sorted.map((course) => course.id), ["e-a", "e-z", "a-a", "a-z", "p-a", "p-z"]);
  assert.deepEqual(courses.map((course) => course.id), originalOrder);
});
