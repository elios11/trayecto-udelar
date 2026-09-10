import assert from "node:assert/strict";
import test from "node:test";

import {
  academicHistoryForCourse,
  addAcademicHistoryEvent,
  correctAcademicHistoryEvent,
  deriveCourseStatuses,
  migrateProgressToAcademicHistory,
  setAcademicHistoryEventVoided,
  validateAcademicHistory,
} from "../app/academic-history.mjs";

const at = (minute) => `2026-09-09T12:${String(minute).padStart(2, "0")}:00.000Z`;

test("valida tipos, resultados, fechas nulas, extensiones e IDs por historial", () => {
  const valid = validateAcademicHistory({ extensions: { "org.trayecto.test": true }, events: [
    { id: "same", courseId: "A", kind: "course-passed", resultStatus: "approved", occurredAt: null, recordedAt: at(0), revision: 1, supersedesEventId: null, voided: false, source: "user", extensions: { "org.trayecto.source": "x" } },
  ] });
  assert.equal(valid.ok, true);
  const invalid = validateAcademicHistory({ events: [
    { id: "same", courseId: "A", kind: "course-passed", resultStatus: "exonerated", occurredAt: "2026-02-30", recordedAt: "ayer", revision: 0, supersedesEventId: null, voided: "no", source: "other" },
    { id: "same", courseId: "A", kind: "exam-passed", resultStatus: "approved", occurredAt: null, recordedAt: at(1), revision: 1, supersedesEventId: null, voided: false, source: "user" },
  ] });
  assert.equal(invalid.ok, false);
  assert.ok(["duplicate_id", "inconsistent_result", "invalid_date", "invalid_revision"].every((code) => invalid.issues.some((entry) => entry.code === code)));
});

test("rechaza referencias cruzadas, ciclos y ramas con dos terminales", () => {
  const base = (id, courseId, supersedesEventId, revision) => ({ id, courseId, kind: "recorded-status", resultStatus: "approved", occurredAt: null, recordedAt: at(revision), revision, supersedesEventId, voided: false, source: "import" });
  const crossed = validateAcademicHistory({ events: [base("a", "A", null, 1), base("b", "B", "a", 2)] });
  assert.equal(crossed.ok, false);
  assert.ok(crossed.issues.some((entry) => entry.code === "cross_course_reference"));
  const branched = validateAcademicHistory({ events: [base("a", "A", null, 1), base("b", "A", "a", 2), base("c", "A", "a", 2)] });
  assert.equal(branched.ok, false);
  assert.ok(branched.issues.some((entry) => entry.code === "multiple_terminal_revisions"));
  const cyclic = validateAcademicHistory({ events: [base("a", "A", "b", 2), base("b", "A", "a", 3)] });
  assert.equal(cyclic.ok, false);
  assert.ok(cyclic.issues.some((entry) => entry.code === "revision_cycle"));
});

test("deriva estados con desempate estable y corrige, anula y restaura sin mutar", () => {
  const original = { events: [] };
  const approved = addAcademicHistoryEvent(original, { courseId: "A", kind: "course-passed", occurredAt: "2026-07-10" }, { id: "a", recordedAt: at(0) });
  const exonerated = addAcademicHistoryEvent(approved, { courseId: "A", kind: "exam-passed", occurredAt: null }, { id: "z", recordedAt: at(0) });
  assert.deepEqual(deriveCourseStatuses(original), {});
  assert.equal(deriveCourseStatuses(exonerated).A, "exonerated");
  const corrected = correctAcademicHistoryEvent(exonerated, "z", { kind: "course-passed", occurredAt: "2026-07-11" }, { id: "z2", recordedAt: at(1) });
  assert.equal(deriveCourseStatuses(corrected).A, "approved");
  const voided = setAcademicHistoryEventVoided(corrected, "z2", true, { id: "z3", recordedAt: at(2) });
  assert.equal(deriveCourseStatuses(voided).A, "approved");
  const restored = setAcademicHistoryEventVoided(voided, "z3", false, { id: "z4", recordedAt: at(3) });
  assert.equal(deriveCourseStatuses(restored).A, "approved");
  assert.deepEqual(academicHistoryForCourse(restored, "A").map((event) => event.revision), [1, 1, 2, 3, 4]);
});

test("migra sólo estados efectivos con IDs deterministas y no inventa fecha académica", () => {
  const progress = [
    { courseId: "B", status: "pending", updatedAt: null },
    { courseId: "A", status: "approved", updatedAt: null },
    { courseId: "C", status: "exonerated", updatedAt: "2026-08-01T12:00:00-03:00" },
  ];
  const first = migrateProgressToAcademicHistory(progress, { progressPlanId: "plan", recordedAt: at(0) });
  const second = migrateProgressToAcademicHistory(progress, { progressPlanId: "plan", recordedAt: at(0) });
  assert.deepEqual(first, second);
  assert.deepEqual(deriveCourseStatuses(first), { A: "approved", C: "exonerated" });
  assert.equal(first.events.find((event) => event.courseId === "A").occurredAt, null);
  assert.equal(first.events.find((event) => event.courseId === "C").occurredAt, "2026-08-01T15:00:00.000Z");
});
