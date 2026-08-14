import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^fmed-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/fmed-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("FMED conserva sus treinta y dos planes vigentes extraídos", () => {
  assert.equal(snapshots.length, 32);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "FMED"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
});

test("conserva la cobertura literal publicada por Bedelías", () => {
  const plansWithCourses = snapshots.filter((snapshot) => snapshot.plan.courses.length > 0);
  assert.equal(plansWithCourses.length, 1);
  assert.equal(plansWithCourses[0].program.name, "DOCTOR EN MEDICINA");
  assert.equal(plansWithCourses[0].plan.courses.length, 2753);
  assert.equal(snapshots.filter((snapshot) => snapshot.plan.compositionAvailability.available === false).length, 12);
  assert.equal(snapshots.filter((snapshot) => snapshot.validation.issues.length === 0).length, 20);
});

test("reporte y manifiesto mantienen FMED fuera de publicación", () => {
  assert.deepEqual(report.totals, {
    plans: 32,
    courses: 2753,
    prerequisiteEntries: 2276,
    publishedRules: 0,
    noPublishedRuleQueries: 2276,
    validationIssues: 12,
    requests: 4060,
    bytes: 7645860,
  });
  assert.equal(report.status, "extracted");
  const fmed = manifest.services.find((service) => service.code === "FMED");
  assert.deepEqual(fmed.counts.byState, { "structurally-valid": 20, extracted: 12 });
  assert.equal(fmed.plans.some((plan) => plan.state === "audited"), false);
});
