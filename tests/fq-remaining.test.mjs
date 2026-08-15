import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const report = readJson("data/bedelias/reports/fq-remaining.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("FQ conserva sus seis planes centrales restantes", () => {
  assert.equal(report.status, "official-sources-pending");
  assert.deepEqual(report.totals, {
    plans: 6,
    courses: 1457,
    prerequisiteEntries: 1203,
    publishedRules: 835,
    noPublishedRuleQueries: 368,
    validationIssues: 0,
    requests: 57032,
    bytes: 12951526,
  });
});

test("ningún servicio central conserva planes sin extraer", () => {
  const fq = manifest.services.find((service) => service.code === "FQ");
  assert.deepEqual(fq.counts.byState, { "structurally-valid": 10, audited: 1, extracted: 1 });
  assert.equal(fq.plans.length, 12);

  const centralDiscovered = manifest.services
    .filter((service) => service.area !== "CENTROS REGIONALES")
    .flatMap((service) => service.plans.filter((plan) => plan.state === "discovered"));
  assert.equal(centralDiscovered.length, 0);
  assert.equal(manifest.counts.byState.discovered, 5);
});
