import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^fartes-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/fartes-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("FARTES conserva los 17 planes vigentes extraídos sin incidencias estructurales", () => {
  assert.equal(snapshots.length, 17);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "FARTES"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
  assert.ok(snapshots.every((snapshot) => snapshot.validation.issues.length === 0));
});

test("el reintento recuperó únicamente los tres planes que habían fallado al navegar", () => {
  const ceramic = snapshots.find((snapshot) => snapshot.program.name === "LICENCIATURA EN ARTES - CERÁMICA");
  const composition = snapshots.find((snapshot) => snapshot.program.name === "LICENCIATURA EN COMPOSICIÓN");
  const teaching = snapshots.find((snapshot) => snapshot.program.name === "PROFESORADO");

  assert.equal(ceramic.plan.year, "2002");
  assert.equal(ceramic.plan.courses.length, 13);
  assert.equal(ceramic.prerequisites.filter((rule) => rule.expression).length, 9);
  assert.equal(composition.plan.year, "1987");
  assert.equal(composition.plan.courses.length, 0);
  assert.equal(teaching.plan.year, "1967");
  assert.equal(teaching.plan.courses.length, 0);
});

test("el reporte y el manifiesto cierran FARTES sin habilitar su publicación", () => {
  assert.equal(report.totals.plans, 17);
  assert.equal(report.totals.validationIssues, 0);
  assert.equal(report.status, "official-sources-pending");
  assert.match(report.nextStep, /FACULTAD DE ARTES/);

  const fartes = manifest.services.find((service) => service.code === "FARTES");
  assert.deepEqual(fartes.counts.byState, { "structurally-valid": 17 });
  assert.equal(fartes.plans.some((plan) => plan.state === "audited"), false);
});
