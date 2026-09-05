import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^isef-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/isef-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("ISEF conserva sus tres planes vigentes extraídos", () => {
  assert.equal(snapshots.length, 3);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "ISEF"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
  assert.ok(snapshots.every((snapshot) => snapshot.validation.issues.length === 0));
});

test("reporte y manifiesto mantienen ISEF pendiente de auditoría", () => {
  assert.deepEqual(report.totals, {
    plans: 3,
    courses: 2208,
    prerequisiteEntries: 1845,
    publishedRules: 166,
    noPublishedRuleQueries: 1679,
    validationIssues: 0,
    requests: 4231,
    bytes: 11937950,
  });
  assert.equal(report.status, "official-sources-pending");
  const isef = manifest.services.find((service) => service.code === "ISEF");
  assert.deepEqual(isef.counts.byState, { "structurally-valid": 3 });
  assert.equal(isef.plans.some((plan) => plan.state === "audited"), false);
});
