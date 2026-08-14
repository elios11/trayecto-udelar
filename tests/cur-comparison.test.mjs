import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const report = readJson("data/bedelias/reports/cur-comparison.json");
const comparison = readJson("data/bedelias/inventory/regional-content-comparison.json");

const findComparison = (identity) => {
  const plan = comparison.plans.find((entry) => entry.identity === identity);
  return plan.comparisons.find((entry) => entry.serviceCode === "CUR");
};

test("CUR conserva las cinco ofertas comparativas y sus anomalías institucionales", () => {
  assert.equal(report.status, "extracted");
  assert.deepEqual(report.totals, {
    plans: 5,
    courses: 1139,
    prerequisiteEntries: 61,
    publishedRules: 4,
    noPublishedRuleQueries: 57,
    validationIssues: 2,
    requests: 1013,
    bytes: 2425935,
  });
  assert.deepEqual(
    report.plans.filter((plan) => plan.state === "extracted").map((plan) => plan.career),
    ["ASISTENTE EN ODONTOLOGÍA", "HIGIENISTA EN ODONTOLOGÍA"],
  );
});

test("CUR detecta dos diferencias curriculares sin equiparar composiciones vacías", () => {
  for (const identity of [
    "asistente en odontologia:2017",
    "escalonada de enfermeria:2001",
    "higienista en odontologia:2017",
  ]) {
    assert.equal(findComparison(identity).status, "insufficient-content");
  }

  const nursing = findComparison("licenciatura en enfermeria:2016");
  assert.equal(nursing.status, "content-difference-detected");
  assert.equal(nursing.difference.onlyCanonical.length, 4);
  assert.equal(nursing.difference.onlyRegional.length, 78);
  assert.equal(nursing.difference.changedCredits.length, 1);

  const sports = findComparison("tecnicatura en deportes:2007");
  assert.equal(sports.status, "content-difference-detected");
  assert.equal(sports.difference.onlyCanonical.length, 0);
  assert.equal(sports.difference.onlyRegional.length, 78);
  assert.equal(sports.difference.changedCredits.length, 0);
});
