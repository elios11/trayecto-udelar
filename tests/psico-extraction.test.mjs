import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^psico-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/psico-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("PSICO conserva sus dos planes vigentes extraídos", () => {
  assert.equal(snapshots.length, 2);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "PSICO"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
});

test("distingue la licenciatura del plan infantil sin composición", () => {
  const degree = snapshots.find((snapshot) => snapshot.program.name === "LICENCIATURA EN PSICOLOGIA");
  const child = snapshots.find((snapshot) => snapshot.program.name === "PSICOLOGIA INFANTIL");
  assert.equal(degree.plan.courses.length, 2946);
  assert.equal(degree.validation.issues.length, 0);
  assert.equal(child.plan.compositionAvailability.available, false);
  assert.deepEqual(child.validation.issues.map((issue) => issue.code), ["composition-unavailable"]);
});

test("reporte y manifiesto mantienen PSICO fuera de publicación", () => {
  assert.deepEqual(report.totals, {
    plans: 2,
    courses: 2946,
    prerequisiteEntries: 2647,
    publishedRules: 0,
    noPublishedRuleQueries: 2647,
    validationIssues: 1,
    requests: 280,
    bytes: 6468097,
  });
  assert.equal(report.status, "extracted");
  const psico = manifest.services.find((service) => service.code === "PSICO");
  assert.deepEqual(psico.counts.byState, { "structurally-valid": 1, extracted: 1 });
  assert.equal(psico.plans.some((plan) => plan.state === "audited"), false);
});
