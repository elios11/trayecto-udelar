import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshot = readJson("data/bedelias/fvet-doctor-en-ciencias-veterinarias-2021.json");
const report = readJson("data/bedelias/reports/fvet-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("FVET conserva su único plan vigente extraído", () => {
  assert.equal(snapshot.service.code, "FVET");
  assert.equal(snapshot.program.name, "DOCTOR EN CIENCIAS VETERINARIAS");
  assert.equal(snapshot.plan.year, "2021");
  assert.equal(snapshot.plan.current, true);
});

test("registra literalmente la composición no publicada", () => {
  assert.equal(snapshot.plan.courses.length, 0);
  assert.equal(snapshot.plan.compositionAvailability.available, false);
  assert.deepEqual(snapshot.validation.issues.map((issue) => issue.code), ["composition-unavailable"]);
});

test("reporte y manifiesto mantienen FVET fuera de publicación", () => {
  assert.deepEqual(report.totals, {
    plans: 1,
    courses: 0,
    prerequisiteEntries: 0,
    publishedRules: 0,
    noPublishedRuleQueries: 0,
    validationIssues: 1,
    requests: 127,
    bytes: 1811,
  });
  assert.equal(report.status, "extracted");
  const fvet = manifest.services.find((service) => service.code === "FVET");
  assert.deepEqual(fvet.counts.byState, { extracted: 1 });
  assert.equal(fvet.plans.some((plan) => plan.state === "audited"), false);
});
