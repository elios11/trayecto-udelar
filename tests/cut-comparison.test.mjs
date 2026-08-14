import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshot = readJson("data/bedelias/cut-interpretacion-lsu-espanol-lsu-2014.json");
const report = readJson("data/bedelias/reports/cut-comparison.json");
const comparison = readJson("data/bedelias/inventory/regional-content-comparison.json");

test("CUT conserva completa su única oferta comparativa", () => {
  assert.equal(snapshot.plan.courses.length, 199);
  assert.equal(snapshot.validation.issues.length, 0);
  assert.deepEqual(report.totals, {
    plans: 1,
    courses: 199,
    prerequisiteEntries: 1,
    publishedRules: 0,
    noPublishedRuleQueries: 1,
    validationIssues: 0,
    requests: 159,
    bytes: 295170,
  });
});

test("CUT comparte currícula y difiere sólo en cobertura de previaturas", () => {
  const plan = comparison.plans.find((entry) => entry.identity === "interpretacion lsu espanol lsu:2014");
  const result = plan.comparisons.find((entry) => entry.serviceCode === "CUT");
  assert.equal(result.status, "curriculum-match-prerequisite-coverage-difference");
  assert.equal(result.difference.onlyCanonical.length, 0);
  assert.equal(result.difference.onlyRegional.length, 0);
  assert.equal(result.difference.changedCredits.length, 0);
  assert.equal(result.difference.prerequisiteCountDelta, -201);
});
