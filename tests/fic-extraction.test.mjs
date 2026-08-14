import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^fic-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/fic-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("FIC conserva sus siete planes vigentes extraídos", () => {
  assert.equal(snapshots.length, 7);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "FIC"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
});

test("registra los cuatro planes cuya composición no está publicada", () => {
  const unavailable = snapshots
    .filter((snapshot) => snapshot.plan.compositionAvailability.available === false)
    .map((snapshot) => snapshot.program.name)
    .sort();
  assert.deepEqual(unavailable, [
    "ARCHIVOLOGÍA",
    "BIBLIOTECOLOGÍA",
    "LICENCIATURA EN COMUNICACIÓN",
    "LICENCIATURA EN COMUNICACIÓN (PLAN 2012 VERSIÓN 2019)",
  ]);
  assert.equal(snapshots.filter((snapshot) => snapshot.validation.issues.length === 0).length, 3);
});

test("reporte y manifiesto mantienen FIC fuera de publicación", () => {
  assert.deepEqual(report.totals, {
    plans: 7,
    courses: 1378,
    prerequisiteEntries: 1559,
    publishedRules: 827,
    noPublishedRuleQueries: 732,
    validationIssues: 4,
    requests: 55112,
    bytes: 6696718,
  });
  assert.equal(report.status, "extracted");
  const fic = manifest.services.find((service) => service.code === "FIC");
  assert.deepEqual(fic.counts.byState, { extracted: 4, "structurally-valid": 3 });
  assert.equal(fic.plans.some((plan) => plan.state === "audited"), false);
});
