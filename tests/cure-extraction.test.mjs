import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const representativeSnapshots = new Set([
  "cure-licenciatura-en-diseno-de-paisaje-2008.json",
  "cure-licenciatura-en-gestion-ambiental-2011.json",
  "cure-licenciatura-en-lenguajes-y-medios-audiovisuales-2011.json",
  "cure-licenciatura-en-turismo-2014.json",
  "cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013.json",
  "cure-tecnologo-minero-2013.json",
]);
const snapshots = readdirSync(dataDirectory)
  .filter((name) => representativeSnapshots.has(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/cure-regional.json");
const globalManifest = readJson("data/bedelias/inventory/global-current.json");
const regionalManifest = readJson("data/bedelias/inventory/regional-offerings.json");

test("CURE conserva sólo sus seis planes regionales representativos", () => {
  assert.equal(snapshots.length, 6);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "CURE"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
});

test("conserva las dos composiciones no publicadas sin inventar materias", () => {
  const unavailable = snapshots
    .filter((snapshot) => snapshot.plan.compositionAvailability?.available === false)
    .map((snapshot) => snapshot.program.name)
    .sort();
  assert.deepEqual(unavailable, [
    "LICENCIATURA EN GESTIÓN AMBIENTAL",
    "LICENCIATURA EN LENGUAJES Y MEDIOS AUDIOVISUALES",
  ]);
  assert.equal(report.totals.validationIssues, 2);
  assert.equal(report.status, "extracted");
});

test("reporte y manifiestos actualizan sólo los representantes de CURE", () => {
  assert.deepEqual(report.totals, {
    plans: 6,
    courses: 749,
    prerequisiteEntries: 721,
    publishedRules: 212,
    noPublishedRuleQueries: 509,
    validationIssues: 2,
    requests: 11388,
    bytes: 2328083,
  });

  const cure = globalManifest.services.find((service) => service.code === "CURE");
  assert.deepEqual(cure.counts.byState, { "structurally-valid": 11, extracted: 2, discovered: 1 });
  assert.equal(cure.plans.length, 14);

  const targets = regionalManifest.extractionTargets.filter((target) => target.serviceCode === "CURE");
  assert.equal(targets.length, 6);
  assert.equal(targets.filter((target) => target.state === "structurally-valid").length, 4);
  assert.equal(targets.filter((target) => target.state === "extracted").length, 2);
});
