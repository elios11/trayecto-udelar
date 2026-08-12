import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = ["fadu-arquitectura-2015.json", "fadu-ldcv-2007.json", "fadu-ldind-2013.json"];
const [architecture, ldcv, industrial] = files.map((file) => JSON.parse(readFileSync(new URL(`../app/data/${file}`, import.meta.url), "utf8")));

function pathwayCredits(projection, pathway) {
  const byId = new Map(projection.courses.map((course) => [course.id, course]));
  return pathway.periods.flatMap((period) => period.courseIds).reduce((total, id) => total + byId.get(id).credits, 0);
}

test("las tres proyecciones FADU están auditadas, trazables y completas", () => {
  for (const projection of [architecture, ldcv, industrial]) {
    assert.equal(projection.plan.auditStatus, "audited");
    assert.equal(projection.plan.current, true);
    assert.match(projection.source.reviewedAt, /^2026-08-12$/);
    assert.match(projection.source.bedeliasContentHash, /^[a-f0-9]{64}$/);
    assert.ok(projection.plan.campuses.length > 0);
    assert.ok(projection.audit.anomalies.length > 0);
    const courseIds = new Set(projection.courses.map((course) => course.id));
    assert.equal(courseIds.size, projection.courses.length);
    for (const course of projection.courses) {
      assert.equal(course.creditAllocations.reduce((sum, allocation) => sum + allocation.credits, 0), course.credits);
    }
    for (const pathway of Object.values(projection.pathways)) {
      assert.equal(pathwayCredits(projection, pathway), projection.plan.minCredits);
      assert.ok(pathway.periods.flatMap((period) => period.courseIds).every((id) => courseIds.has(id)));
    }
  }
});

test("Arquitectura conserva la organización 2025 sin inventar diez semestres", () => {
  assert.equal(architecture.plan.degreeTitle, "Arquitecto");
  assert.equal(architecture.plan.minCredits, 450);
  assert.equal(architecture.plan.durationMonths, 60);
  assert.deepEqual(architecture.audit.officialAreaMinimums, {
    "Proyecto y Representación": 207,
    "Tecnología": 129,
    "Historia, Teoría y Crítica": 66,
    "Optativas y electivas": 48,
  });
  assert.deepEqual(Object.values(architecture.pathways)[0].periods.map((period) => period.courseIds.reduce((sum, id) => sum + architecture.courses.find((course) => course.id === id).credits, 0)), [84, 255, 63, 48]);
  assert.equal(architecture.creditStructure.nodes.find((node) => node.id === "arq-opt").minCredits, 38);
  assert.equal(architecture.creditStructure.nodes.find((node) => node.id === "arq-elect").minCredits, 10);
});

test("LDCV suma las asignaciones parciales y conserva los 363 créditos legales", () => {
  assert.equal(ldcv.plan.durationMonths, 48);
  assert.equal(ldcv.plan.minCredits, 363);
  assert.deepEqual(ldcv.plan.sharedWith, ["Facultad de Artes"]);
  assert.equal(ldcv.courses.find((course) => course.id === "L113").credits, 12);
  assert.equal(ldcv.courses.find((course) => course.id === "L114").credits, 17);
  assert.equal(ldcv.courses.find((course) => course.id === "L117").credits, 17);
  assert.deepEqual(ldcv.pathways["current-2026"].periods.map((period) => period.courseIds.reduce((sum, id) => sum + ldcv.courses.find((course) => course.id === id).credits, 0)), [78, 112, 102, 71]);
});

test("Diseño Industrial modela un título, dos perfiles y la regla flexible 35/16/10", () => {
  assert.equal(industrial.plan.degreeTitle, "Licenciado en Diseño Industrial");
  assert.equal(industrial.plan.durationMonths, 48);
  assert.deepEqual(Object.keys(industrial.pathways), ["product", "textile"]);
  assert.equal(industrial.creditStructure.nodes.find((node) => node.id === "ldi-flex").minCredits, 35);
  assert.equal(industrial.creditStructure.nodes.find((node) => node.id === "ldi-opt").minCredits, 16);
  assert.equal(industrial.creditStructure.nodes.find((node) => node.id === "ldi-elect").minCredits, 10);
  assert.ok(!industrial.audit.canonicalCodes.includes("1020"));
  assert.ok(industrial.audit.excludedHistoricalCodes.includes("1020"));
});
