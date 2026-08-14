import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshot = readJson("data/bedelias/enut-licenciatura-en-nutricion-2014.json");
const report = readJson("data/bedelias/reports/enut-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("ENUT conserva su único plan vigente extraído", () => {
  assert.equal(snapshot.service.code, "ENUT");
  assert.equal(snapshot.program.name, "LICENCIATURA EN NUTRICIÓN");
  assert.equal(snapshot.plan.year, "2014");
  assert.equal(snapshot.plan.current, true);
});

test("registra literalmente la composición no publicada", () => {
  assert.equal(snapshot.plan.courses.length, 0);
  assert.equal(snapshot.plan.compositionAvailability.available, false);
  assert.deepEqual(snapshot.validation.issues.map((issue) => issue.code), ["composition-unavailable"]);
});

test("reporte y manifiesto mantienen ENUT fuera de publicación", () => {
  assert.deepEqual(report.totals, {
    plans: 1,
    courses: 0,
    prerequisiteEntries: 0,
    publishedRules: 0,
    noPublishedRuleQueries: 0,
    validationIssues: 1,
    requests: 126,
    bytes: 1796,
  });
  assert.equal(report.status, "extracted");
  const enut = manifest.services.find((service) => service.code === "ENUT");
  assert.deepEqual(enut.counts.byState, { extracted: 1 });
  assert.equal(enut.plans.some((plan) => plan.state === "audited"), false);
});
