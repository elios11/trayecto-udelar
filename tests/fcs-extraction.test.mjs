import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^fcs-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/fcs-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("FCS conserva sus cuatro planes vigentes extraídos", () => {
  assert.equal(snapshots.length, 4);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "FCS"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
});

test("registra literalmente la ausencia de composición publicada", () => {
  for (const snapshot of snapshots) {
    assert.equal(snapshot.plan.courses.length, 0);
    assert.deepEqual(snapshot.plan.compositionAvailability, {
      available: false,
      reason: "La interfaz pública no publicó una composición.",
    });
    assert.deepEqual(snapshot.validation.issues.map((issue) => issue.code), ["composition-unavailable"]);
  }
});

test("reporte y manifiesto mantienen FCS fuera de publicación", () => {
  assert.equal(report.totals.plans, 4);
  assert.equal(report.totals.validationIssues, 4);
  assert.equal(report.status, "extracted");

  const fcs = manifest.services.find((service) => service.code === "FCS");
  assert.deepEqual(fcs.counts.byState, { extracted: 4 });
  assert.equal(fcs.plans.some((plan) => plan.state === "audited"), false);
});
