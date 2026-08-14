import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshot = readJson("data/bedelias/cucel-tecnologo-int-y-trad-lsu-esp-2025.json");
const report = readJson("data/bedelias/reports/cucel-comparison.json");
const comparison = readJson("data/bedelias/inventory/regional-content-comparison.json");

test("CUCEL conserva la oferta comparativa completa y normalizada", () => {
  assert.equal(snapshot.plan.courses.length, 199);
  assert.equal(snapshot.validation.issues.length, 0);
  assert.deepEqual(report.totals, {
    plans: 1,
    courses: 199,
    prerequisiteEntries: 2,
    publishedRules: 0,
    noPublishedRuleQueries: 2,
    validationIssues: 0,
    requests: 159,
    bytes: 293063,
  });
});

test("CUCEL comparte currícula y difiere sólo en cobertura de previaturas", () => {
  const plan = comparison.plans.find((entry) => entry.identity === "tecnologo int y trad lsu esp:2025");
  const result = plan.comparisons.find((entry) => entry.serviceCode === "CUCEL");
  assert.equal(result.status, "curriculum-match-prerequisite-coverage-difference");
  assert.equal(result.difference.onlyCanonical.length, 0);
  assert.equal(result.difference.onlyRegional.length, 0);
  assert.equal(result.difference.changedCredits.length, 0);
  assert.equal(result.difference.prerequisiteCountDelta, -193);
  assert.equal(comparison.counts.contentDifferences, 0);
});
