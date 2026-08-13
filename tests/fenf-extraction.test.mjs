import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^fenf-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/fenf-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("FENF conserva sus cuatro planes de grado vigentes extraídos", () => {
  assert.equal(snapshots.length, 4);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "FENF"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
  assert.ok(snapshots.every((snapshot) => snapshot.validation.issues.length === 0));
});

test("conserva literalmente los árboles antiguos que no enumeran materias", () => {
  const emptyPlans = snapshots
    .filter((snapshot) => snapshot.plan.courses.length === 0)
    .map((snapshot) => snapshot.plan.year)
    .sort();

  assert.deepEqual(emptyPlans, ["1983", "1999", "2001"]);
  assert.ok(snapshots
    .filter((snapshot) => emptyPlans.includes(snapshot.plan.year))
    .every((snapshot) => snapshot.plan.compositionAvailability.available));
});

test("reporte y manifiesto mantienen FENF pendiente de fuentes oficiales", () => {
  assert.deepEqual(report.totals, {
    plans: 4,
    courses: 223,
    prerequisiteEntries: 131,
    publishedRules: 50,
    noPublishedRuleQueries: 81,
    validationIssues: 0,
    requests: 3959,
    bytes: 963416,
  });
  assert.equal(report.status, "official-sources-pending");

  const fenf = manifest.services.find((service) => service.code === "FENF");
  assert.deepEqual(fenf.counts.byState, { "structurally-valid": 4 });
  assert.equal(fenf.plans.some((plan) => plan.state === "audited"), false);
});
