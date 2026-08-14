import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const computing = readJson("data/bedelias/cenurso-ingenieria-en-computacion-2025.json");
const nursing = readJson("data/bedelias/cenurso-licenciatura-en-enfermeria-profesionalizacion-de-auxiliar-1999.json");
const report = readJson("data/bedelias/reports/cenurso-comparison.json");
const comparison = readJson("data/bedelias/inventory/regional-content-comparison.json");

test("CENURSO conserva sus dos snapshots comparativos sin repetir representantes", () => {
  assert.equal(computing.plan.courses.length, 38);
  assert.equal(computing.validation.issues.length, 0);
  assert.equal(nursing.plan.courses.length, 0);
  assert.equal(nursing.validation.issues.length, 0);
  assert.deepEqual(report.totals, {
    plans: 2,
    courses: 38,
    prerequisiteEntries: 3,
    publishedRules: 0,
    noPublishedRuleQueries: 3,
    validationIssues: 0,
    requests: 288,
    bytes: 144637,
  });
});

test("distingue currícula de cobertura de previaturas e información insuficiente", () => {
  const computingPlan = comparison.plans.find((plan) => plan.identity === "ingenieria en computacion:2025");
  const computingComparison = computingPlan.comparisons.find((entry) => entry.serviceCode === "CENURSO");
  assert.equal(computingComparison.status, "curriculum-match-prerequisite-coverage-difference");
  assert.equal(computingComparison.difference.onlyCanonical.length, 0);
  assert.equal(computingComparison.difference.onlyRegional.length, 0);
  assert.equal(computingComparison.difference.prerequisiteCountDelta, -47);

  const nursingPlan = comparison.plans.find((plan) =>
    plan.identity === "licenciatura en enfermeria profesionalizacion de auxiliar:1999");
  assert.equal(nursingPlan.comparisons[0].status, "insufficient-content");
});
