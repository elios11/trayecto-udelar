import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const report = readJson("data/bedelias/reports/cenurln-comparison.json");
const comparison = readJson("data/bedelias/inventory/regional-content-comparison.json");

test("CENURLN conserva las 41 ofertas comparativas y sus anomalías", () => {
  assert.equal(report.status, "extracted");
  assert.deepEqual(report.totals, {
    plans: 41,
    courses: 14796,
    prerequisiteEntries: 739,
    publishedRules: 149,
    noPublishedRuleQueries: 590,
    validationIssues: 8,
    requests: 15686,
    bytes: 38322520,
  });
  assert.equal(report.plans.filter((plan) => plan.state === "structurally-valid").length, 33);
  assert.equal(report.plans.filter((plan) => plan.state === "extracted").length, 8);
});

test("la comparación global no confunde faltantes ni composiciones vacías con equivalencias", () => {
  const results = comparison.plans.flatMap((plan) =>
    plan.comparisons.filter((entry) => entry.serviceCode === "CENURLN"));
  const count = (status) => results.filter((entry) => entry.status === status).length;

  assert.equal(results.length, 41);
  assert.equal(count("curriculum-match-prerequisite-coverage-difference"), 6);
  assert.equal(count("content-difference-detected"), 11);
  assert.equal(count("insufficient-content"), 19);
  assert.equal(count("not-comparable"), 5);
  assert.equal(comparison.counts.missingRegionalSnapshots, 0);
});
