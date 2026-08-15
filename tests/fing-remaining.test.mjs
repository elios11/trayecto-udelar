import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const report = readJson("data/bedelias/reports/fing-remaining.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("FING conserva sus diez planes centrales restantes", () => {
  assert.equal(report.status, "official-sources-pending");
  assert.deepEqual(report.totals, {
    plans: 10,
    courses: 1967,
    prerequisiteEntries: 1928,
    publishedRules: 1334,
    noPublishedRuleQueries: 594,
    validationIssues: 0,
    requests: 89474,
    bytes: 14334609,
  });
});

test("el manifiesto combinado ya no deja planes de FING sin extraer", () => {
  const fing = manifest.services.find((service) => service.code === "FING");
  assert.deepEqual(fing.counts.byState, { audited: 3, "structurally-valid": 15, extracted: 1 });
  assert.equal(fing.plans.length, 19);
  assert.equal(fing.plans.filter((plan) => plan.state === "discovered").length, 0);
});
