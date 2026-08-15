import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const representativeSnapshots = new Set([
  "cur-licenciatura-en-educacion-fisica-2014.json",
  "cur-licenciatura-en-recursos-naturales-2010.json",
  "cur-tecnicatura-en-artes-plasticas-y-visuales-2017.json",
  "cur-tecnicatura-en-gestion-de-recursos-naturales-2011.json",
  "cur-tecnologo-en-madera-2012.json",
]);
const snapshots = readdirSync(dataDirectory)
  .filter((name) => representativeSnapshots.has(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/cur-regional.json");
const globalManifest = readJson("data/bedelias/inventory/global-current.json");
const regionalManifest = readJson("data/bedelias/inventory/regional-offerings.json");

test("CUR conserva sólo sus cinco planes regionales representativos", () => {
  assert.equal(snapshots.length, 5);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "CUR"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
  assert.ok(snapshots.every((snapshot) => snapshot.validation.issues.length === 0));
});

test("reporte y manifiestos actualizan sólo los representantes de CUR", () => {
  assert.deepEqual(report.totals, {
    plans: 5,
    courses: 922,
    prerequisiteEntries: 836,
    publishedRules: 227,
    noPublishedRuleQueries: 609,
    validationIssues: 0,
    requests: 16132,
    bytes: 2024478,
  });
  assert.equal(report.status, "official-sources-pending");

  const cur = globalManifest.services.find((service) => service.code === "CUR");
  assert.deepEqual(cur.counts.byState, { "structurally-valid": 8, extracted: 2 });
  assert.equal(cur.plans.length, 10);

  const targets = regionalManifest.extractionTargets.filter((target) => target.serviceCode === "CUR");
  assert.equal(targets.length, 5);
  assert.ok(targets.every((target) => target.state === "structurally-valid"));
});
