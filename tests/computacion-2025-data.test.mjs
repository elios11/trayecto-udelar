import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const projection = JSON.parse(await readFile(new URL("../app/data/computacion-2025-fing.json", import.meta.url), "utf8"));
const snapshot = JSON.parse(await readFile(new URL("../data/bedelias/fing-ingenieria-en-computacion-2025.json", import.meta.url), "utf8"));

function walk(node, output = []) {
  if (!node) return output;
  output.push(node);
  for (const child of node.children ?? []) walk(child, output);
  return output;
}

test("el Plan 2025 conserva por separado sus dos fuentes institucionales", () => {
  assert.equal(projection.plan.current, true);
  assert.equal(projection.plan.minCredits, 450);
  assert.equal(projection.plan.bedeliasCompositionCourses, 38);
  assert.equal(projection.plan.placementTestCredits, 4);
  assert.equal(projection.plan.placementTestCreditsStatus, "assumed-current-pending-verification");
  assert.match(projection.source.curriculumPage, /^https:\/\/eva\.fing\.edu\.uy\//);
  assert.match(projection.source.bedeliasContentHash, /^[a-f0-9]{64}$/);
  assert.equal(snapshot.validation.issues.length, 0);
});

test("Bedelías vincula Matemática Inicial con Cálculo DIV y la PI queda como supuesto separado", () => {
  const rule = projection.rules.find((item) => item.target.code === "1061" && item.target.assessment === "course");
  assert.ok(rule, "regla de curso de Cálculo DIV");
  const miOptions = walk(rule.expression).flatMap((node) => node.options ?? []).filter((option) => option.code === "MI2");
  assert.ok(miOptions.some((option) => option.assessment === "course-enrollment"), "conserva la exclusión por inscripción simultánea a MI");
  assert.ok(miOptions.some((option) => option.assessment === "exam"), "conserva Matemática Inicial aprobada como alternativa");
  const pi = projection.courses.find((course) => course.id === "PI");
  assert.deepEqual(projection.trajectories["pi-60-plus"].preSemester, ["PI"]);
  assert.equal(pi.credits, 4);
  assert.equal(pi.placementTest, true);
});

test("las trayectorias oficiales mantienen los créditos publicados por semestre", () => {
  const byId = new Map(projection.courses.map((course) => [course.id, course]));
  const totals = (id) => projection.trajectories[id].semesters.map((semester) => semester.reduce((sum, courseId) => sum + byId.get(courseId).credits, 0));
  assert.deepEqual(totals("pi-under-20"), [7]);
  assert.deepEqual(totals("pi-60-plus"), [36, 38, 42, 43, 44, 35, 30, 15]);
  assert.deepEqual(totals("pi-20-59"), [18, 38, 44, 43, 44, 45, 40, 15]);
});

test("toda materia de las trayectorias tiene ficha y procedencia explícita", () => {
  const byId = new Map(projection.courses.map((course) => [course.id, course]));
  for (const trajectory of Object.values(projection.trajectories)) {
    for (const id of [...(trajectory.preSemester ?? []), ...trajectory.semesters.flat()]) {
      assert.ok(byId.has(id), id);
      assert.match(byId.get(id).dataStatus, /^(bedelias-composition|fing-trajectory)$/);
    }
  }
  assert.equal(byId.get("2044").dataStatus, "bedelias-composition");
  assert.equal(byId.get("P25-ARQ").dataStatus, "fing-trajectory");
});
