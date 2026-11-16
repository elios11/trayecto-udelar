import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const evidence = read("data/bedelias/audits/diseno-paisaje-2007-semester-evidence.json");
const snapshot = read(evidence.snapshot);
const { semesters, annual } = evidence;
const rows = [...semesters.flatMap((period) => period.rows), annual.row];

test("Diseño de Paisaje conserva 310 créditos comunes repartidos en ocho semestres y 50 flexibles", () => {
  assert.equal(evidence.normalizedRowsHash,
    `sha256:${createHash("sha256").update(JSON.stringify({ semesters, annual })).digest("hex")}`);
  assert.deepEqual(semesters.map(({ number }) => number), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(rows.length, 29);
  assert.equal(new Set(rows.map(([name]) => name)).size, 29);
  const axes = {};
  for (const [, credits, axis] of rows) axes[axis] = (axes[axis] ?? 0) + credits;
  assert.deepEqual(axes, evidence.axes);
  const core = rows.reduce((sum, [, credits]) => sum + credits, 0);
  assert.equal(core, evidence.minimumCredits.core);
  assert.equal(core + evidence.minimumCredits.flexible, evidence.minimumCredits.total);
  const tallerV = semesters[5].rows.find(([name]) => name === "Diseño de Paisaje V");
  assert.equal(tallerV[1], 20);
  assert.equal(core - tallerV[1], 290);
  assert.deepEqual(annual.semesters, [7, 8]);
  assert.equal(annual.row[1], 40);
});

test("las coincidencias inequívocas preservan su código y las variantes no se eligen por nombre", () => {
  const auditedTechnical = [];
  const unresolved = [];
  const groupPrefix = { transversal: "3269", science: "2999", project: "2390", theory: "2160" };
  for (const [name, credits, axis, code, candidates] of rows) {
    assert.ok(code ? !candidates : candidates.length > 1, name);
    for (const id of code ? [code] : candidates) {
      const matches = snapshot.plan.courses.filter((course) => course.code === id);
      assert.equal(matches.length, 1, id);
      assert.equal(matches[0].credits, credits, id);
      assert.ok(matches[0].curriculumPaths.some((path) =>
        path.some((segment) => segment.startsWith(`${groupPrefix[axis]} -`))), id);
      (code ? auditedTechnical : unresolved).push(id);
    }
  }
  assert.equal(auditedTechnical.length, 14);
  assert.equal(rows.filter(([, , , code]) => code === null).length, 15);
  assert.equal(new Set([...auditedTechnical, ...unresolved]).size, auditedTechnical.length + unresolved.length);
});
