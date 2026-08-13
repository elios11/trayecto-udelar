import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^fder-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/fder-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("FDER conserva sus once planes vigentes extraídos", () => {
  assert.equal(snapshots.length, 11);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "FDER"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
});

test("distingue planes válidos de composiciones no publicadas", () => {
  const unavailable = snapshots
    .filter((snapshot) => snapshot.plan.compositionAvailability.available === false)
    .map((snapshot) => snapshot.program.name)
    .sort();

  assert.deepEqual(unavailable, [
    "DIPLOMACIA",
    "LICENCIATURA EN RELACIONES LABORALES",
  ]);
  assert.equal(snapshots.filter((snapshot) => snapshot.validation.issues.length === 0).length, 9);
  assert.equal(snapshots.flatMap((snapshot) => snapshot.prerequisites).every((rule) => rule.noPublishedRule), true);
});

test("reporte y manifiesto mantienen FDER fuera de publicación", () => {
  assert.deepEqual(report.totals, {
    plans: 11,
    courses: 1643,
    prerequisiteEntries: 1545,
    publishedRules: 0,
    noPublishedRuleQueries: 1545,
    validationIssues: 2,
    requests: 1637,
    bytes: 2823042,
  });
  assert.equal(report.status, "extracted");

  const fder = manifest.services.find((service) => service.code === "FDER");
  assert.deepEqual(fder.counts.byState, { "structurally-valid": 9, extracted: 2 });
  assert.equal(fder.plans.some((plan) => plan.state === "audited"), false);
});
