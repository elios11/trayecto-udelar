import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const representativeSnapshots = new Set([
  "cucel-tecnologo-en-produccion-equina-2022.json",
  "cucel-tecnologo-en-sistemas-integrados-de-produccion-agropecuaria-2022.json",
]);
const snapshots = readdirSync(dataDirectory)
  .filter((name) => representativeSnapshots.has(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/cucel-regional.json");
const globalManifest = readJson("data/bedelias/inventory/global-current.json");
const regionalManifest = readJson("data/bedelias/inventory/regional-offerings.json");

test("CUCEL conserva sólo sus dos planes regionales representativos", () => {
  assert.equal(snapshots.length, 2);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "CUCEL"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
  assert.ok(snapshots.every((snapshot) => snapshot.validation.issues.length === 0));
});

test("reporte y manifiestos actualizan sólo los representantes de CUCEL", () => {
  assert.deepEqual(report.totals, {
    plans: 2,
    courses: 82,
    prerequisiteEntries: 72,
    publishedRules: 0,
    noPublishedRuleQueries: 72,
    validationIssues: 0,
    requests: 288,
    bytes: 172557,
  });
  assert.equal(report.status, "official-sources-pending");

  const cucel = globalManifest.services.find((service) => service.code === "CUCEL");
  assert.deepEqual(cucel.counts.byState, { "structurally-valid": 3 });
  assert.equal(cucel.plans.length, 3);

  const targets = regionalManifest.extractionTargets.filter((target) => target.serviceCode === "CUCEL");
  assert.deepEqual(targets.map((target) => target.state), ["structurally-valid", "structurally-valid"]);
});
