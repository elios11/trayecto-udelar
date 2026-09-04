import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const report = readJson("data/bedelias/reports/fq-canonical-missing.json");
const comparison = readJson("data/bedelias/inventory/regional-content-comparison.json");

const identities = new Set([
  "bioquimico clinico:2015",
  "licenciatura en quimica:2016",
  "quimico:2015",
  "tecnico bach en cs quimicas:2015",
  "tecnologo quimico:2025",
]);

test("FQ conserva los cinco snapshots centrales que faltaban", () => {
  assert.equal(report.status, "extracted");
  assert.deepEqual(report.totals, {
    plans: 5,
    courses: 1972,
    prerequisiteEntries: 1832,
    publishedRules: 1132,
    noPublishedRuleQueries: 700,
    validationIssues: 1,
    requests: 77280,
    bytes: 20719753,
  });
  assert.deepEqual(
    report.plans.filter((plan) => plan.state === "extracted").map((plan) => plan.career),
    ["TECNÓLOGO QUÍMICO"],
  );
});

test("FQ resuelve todos los pares centrales disponibles sin falsas diferencias por REV-B", () => {
  const results = comparison.plans
    .filter((plan) => identities.has(plan.identity))
    .flatMap((plan) => plan.comparisons);
  assert.equal(results.length, 5);
  assert.equal(results.filter((entry) => entry.status === "curriculum-match-prerequisite-coverage-difference").length, 3);
  assert.equal(results.filter((entry) => entry.status === "content-difference-detected").length, 1);
  assert.equal(results.filter((entry) => entry.status === "insufficient-content").length, 1);
  assert.equal(comparison.counts.missingCanonicalSnapshots, 0);
  assert.equal(comparison.counts.missingRegionalSnapshots, 0);
});
