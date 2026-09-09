import assert from "node:assert/strict";
import test from "node:test";

import { analyzePlannerLoad, calculatePotentialCreditImpact, calculateTermLoad, compareTermLoad } from "../app/planner-load.mjs";

const courses = [
  { id: "A", credits: 10, hours: 90 },
  { id: "B", credits: 8 },
  { id: "C", credits: 0, hours: 45 },
];

test("calcula créditos, horas y cantidad sin convertir datos ausentes en cero cierto", () => {
  const term = { id: "s1", courseIds: ["A", "B", "C", "missing"] };
  assert.deepEqual(calculateTermLoad({ term, courses, unit: "credits" }), {
    unit: "credits", value: 18, courseCount: 4, missingCourseIds: ["missing"], missingValueCourseIds: ["C"], partial: true,
  });
  assert.deepEqual(calculateTermLoad({ term, courses, unit: "hours" }), {
    unit: "hours", value: 135, courseCount: 4, missingCourseIds: ["missing"], missingValueCourseIds: ["B"], partial: true,
  });
  assert.equal(calculateTermLoad({ term, courses, unit: "courses" }).value, 3);
});

test("compara el objetivo sólo cuando la carga está completa", () => {
  const complete = calculateTermLoad({ term: { id: "s1", courseIds: ["A", "B"] }, courses, unit: "credits" });
  assert.deepEqual(compareTermLoad(complete, null), { status: "none", difference: null });
  assert.deepEqual(compareTermLoad(complete, { unit: "credits", value: 18 }), { status: "met", difference: 0 });
  assert.deepEqual(compareTermLoad(complete, { unit: "credits", value: 15 }), { status: "exceeded", difference: 3 });
  assert.equal(compareTermLoad({ ...complete, partial: true }, { unit: "credits", value: 15 }).status, "partial");
});

test("detecta duplicados y materias ya acreditadas sin contar aprobaciones como crédito obtenido", () => {
  const result = analyzePlannerLoad({
    terms: [
      { id: "s1", loadTarget: { unit: "courses", value: 1 }, courseIds: ["A", "B"] },
      { id: "s2", loadTarget: null, courseIds: ["A", "C"] },
    ],
    courses,
    progress: { A: "exonerated", B: "approved" },
  });
  assert.deepEqual(result.duplicateCourseIds, ["A"]);
  assert.deepEqual(result.accreditedCourseIds, ["A"]);
  assert.equal(result.terms[0].targetStatus.status, "exceeded");
});

test("proyecta áreas sin sumar asignaciones alternativas ni duplicar créditos", () => {
  const impact = calculatePotentialCreditImpact([
    { id: "A", credits: 10, creditAllocations: [{ nodeId: "math", credits: 10 }] },
    { id: "B", credits: 8, creditAllocations: [{ nodeId: "software", credits: 8 }, { nodeId: "systems", credits: 8 }] },
    { id: "C", credits: 6 },
  ]);
  assert.equal(impact.totalCredits, 24);
  assert.deepEqual(impact.nodeCredits, { math: 10 });
  assert.deepEqual(impact.ambiguousCourseIds, ["B"]);
  assert.deepEqual(impact.unknownCourseIds, ["C"]);
});
