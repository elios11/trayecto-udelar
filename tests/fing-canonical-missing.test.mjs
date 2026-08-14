import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const report = readJson("data/bedelias/reports/fing-canonical-missing.json");
const comparison = readJson("data/bedelias/inventory/regional-content-comparison.json");

const identities = new Set([
  "ingenieria de alimentos:2003",
  "ingenieria quimica:2021",
  "lic en ingenieria biologica:2013",
  "tecnologo en informatica:2007",
  "tecnologo en telecomunicaciones:2009",
  "tecnologo industrial mecanico:2016",
]);

test("FING conserva los seis snapshots centrales que faltaban", () => {
  assert.equal(report.status, "extracted");
  assert.deepEqual(report.totals, {
    plans: 6,
    courses: 902,
    prerequisiteEntries: 595,
    publishedRules: 444,
    noPublishedRuleQueries: 151,
    validationIssues: 1,
    requests: 30178,
    bytes: 5256467,
  });
  assert.deepEqual(
    report.plans.filter((plan) => plan.state === "extracted").map((plan) => plan.career),
    ["LIC EN INGENIERÍA BIOLÓGICA"],
  );
});

test("los nuevos pares de FING no inventan equivalencias cuando falta composición", () => {
  const results = comparison.plans
    .filter((plan) => identities.has(plan.identity))
    .flatMap((plan) => plan.comparisons);
  assert.equal(results.length, 7);
  assert.equal(results.filter((entry) => entry.status === "curriculum-match-prerequisite-coverage-difference").length, 6);
  assert.equal(results.filter((entry) => entry.status === "insufficient-content").length, 1);
});
