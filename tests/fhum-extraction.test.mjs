import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^fhum-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/fhum-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("FHCE conserva sus catorce planes vigentes extraídos", () => {
  assert.equal(snapshots.length, 14);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "FHUM"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
  assert.ok(snapshots.every((snapshot) => snapshot.validation.issues.length === 0));
});

test("conserva los dos árboles históricos sin materias", () => {
  const emptyPlans = snapshots
    .filter((snapshot) => snapshot.plan.courses.length === 0)
    .map((snapshot) => `${snapshot.program.name}:${snapshot.plan.year}`)
    .sort();
  assert.deepEqual(emptyPlans, ["LETRAS HISPÁNICAS:1976", "TÉCNICATURA EN TURISMO:1996"]);
});

test("reporte y manifiesto mantienen FHCE pendiente de auditoría", () => {
  assert.deepEqual(report.totals, {
    plans: 14,
    courses: 2665,
    prerequisiteEntries: 2661,
    publishedRules: 397,
    noPublishedRuleQueries: 2264,
    validationIssues: 0,
    requests: 29859,
    bytes: 6195476,
  });
  assert.equal(report.status, "official-sources-pending");
  const fhce = manifest.services.find((service) => service.code === "FHUM");
  assert.deepEqual(fhce.counts.byState, { "structurally-valid": 14 });
  assert.equal(fhce.plans.some((plan) => plan.state === "audited"), false);
});
