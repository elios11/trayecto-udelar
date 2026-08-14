import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^odon-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/odon-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("ODON conserva sus siete planes vigentes extraídos", () => {
  assert.equal(snapshots.length, 7);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "ODON"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
});

test("distingue Odontología de los seis planes sin composición publicada", () => {
  const withCourses = snapshots.filter((snapshot) => snapshot.plan.courses.length > 0);
  assert.equal(withCourses.length, 1);
  assert.equal(withCourses[0].program.name, "ODONTOLOGÍA");
  assert.equal(withCourses[0].plan.courses.length, 332);
  assert.equal(snapshots.filter((snapshot) => snapshot.plan.compositionAvailability.available === false).length, 6);
});

test("reporte y manifiesto mantienen ODON fuera de publicación", () => {
  assert.deepEqual(report.totals, {
    plans: 7,
    courses: 332,
    prerequisiteEntries: 323,
    publishedRules: 112,
    noPublishedRuleQueries: 211,
    validationIssues: 6,
    requests: 8632,
    bytes: 2029509,
  });
  assert.equal(report.status, "extracted");
  const odon = manifest.services.find((service) => service.code === "ODON");
  assert.deepEqual(odon.counts.byState, { extracted: 6, "structurally-valid": 1 });
  assert.equal(odon.plans.some((plan) => plan.state === "audited"), false);
});
