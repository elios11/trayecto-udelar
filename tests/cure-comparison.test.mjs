import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const report = readJson("data/bedelias/reports/cure-comparison.json");
const comparison = readJson("data/bedelias/inventory/regional-content-comparison.json");

const findComparison = (identity) => {
  const plan = comparison.plans.find((entry) => entry.identity === identity);
  return plan.comparisons.find((entry) => entry.serviceCode === "CURE");
};

test("CURE conserva las siete ofertas comparativas estructuralmente válidas", () => {
  assert.equal(report.status, "official-sources-pending");
  assert.deepEqual(report.totals, {
    plans: 7,
    courses: 2659,
    prerequisiteEntries: 233,
    publishedRules: 40,
    noPublishedRuleQueries: 193,
    validationIssues: 0,
    requests: 3883,
    bytes: 11600067,
  });
});

test("CURE distingue diferencias, información insuficiente y centrales ausentes", () => {
  for (const identity of [
    "licenciatura en educacion fisica:2017",
    "licenciatura en enfermeria:2016",
    "tecnicatura en deportes:2007",
  ]) {
    assert.equal(findComparison(identity).status, "content-difference-detected");
  }

  for (const identity of ["escalonada de enfermeria:2001", "tecnicatura en hemoterapia:2006"]) {
    assert.equal(findComparison(identity).status, "insufficient-content");
  }

  for (const identity of ["tecnologo en informatica:2007", "tecnologo en telecomunicaciones:2009"]) {
    const result = findComparison(identity);
    assert.equal(result.status, "curriculum-match-prerequisite-coverage-difference");
    assert.equal(result.difference.onlyCanonical.length, 0);
    assert.equal(result.difference.onlyRegional.length, 0);
  }
});
