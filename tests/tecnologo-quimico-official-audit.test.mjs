import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fq-tecnologo-quimico-2025.json");
const audit = audits.audits.find((entry) => entry.identity === "tecnologo quimico:2025");

test("proyecta los seis semestres oficiales del Tecnólogo Químico 2025", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.officialPlan.durationMonths, 36);
  assert.equal(audit.officialPlan.minimumCredits, 270);
  assert.equal(audit.officialPlan.curriculum.periods.length, 6);
  assert.equal(projection.plan.minCredits, 270);
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.courses.length, 40);
  assert.equal(projection.courses.filter((course) => !course.curricularBlock).reduce((sum, course) => sum + course.credits, 0), 266);
  assert.equal(projection.courses.filter((course) => course.curricularBlock).reduce((sum, course) => sum + course.credits, 0), 45);
  assert.deepEqual(projection.pathways.bedelias.periods.map((period) => period.label), ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5", "Semestre 6"]);
  assert.match(projection.plan.notice, /266 créditos obligatorios/i);
});

test("modela Montevideo y Paysandú como sedes del mismo plan", () => {
  assert.deepEqual(projection.campuses.map((campus) => campus.label), ["Montevideo", "Paysandú"]);
  assert.ok(audit.offerings.every((offering) => offering.curriculumVariant === false));
  assert.equal(Object.keys(projection.pathways).length, 1);
  assert.deepEqual(projection.pathways.bedelias.campusIds, ["montevideo", "paysandu"]);
});

test("conserva las cargas anuales por semestre sin inventar previaturas", () => {
  const english = projection.courses.filter((course) => course.name.startsWith("Inglés Técnico I ·"));
  assert.deepEqual(english.map((course) => course.credits), [3, 6]);
  assert.ok(projection.courses.every((course) => course.ruleCoverage === "not-published"));
  assert.equal(projection.rules.length, 0);
  assert.deepEqual(projection.creditStructure.credentials[0].requiredCourseGroups.map((group) => group.minCompleted), [32]);
});
