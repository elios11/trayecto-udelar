import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const representativeSnapshots = new Set([
  "cut-ingenieria-forestal-2013.json",
  "cut-licenciatura-en-economia-agricola-y-gestion-de-agronegocios-2022.json",
  "cut-tecnicatura-en-desarrollo-regional-sustentable-2013.json",
  "cut-tecnico-operador-de-alimentos-2011.json",
  "cut-tecnologo-carnico-2010.json",
]);
const snapshots = readdirSync(dataDirectory)
  .filter((name) => representativeSnapshots.has(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/cut-regional.json");
const globalManifest = readJson("data/bedelias/inventory/global-current.json");
const regionalManifest = readJson("data/bedelias/inventory/regional-offerings.json");

test("CUT conserva sólo sus cinco planes regionales representativos", () => {
  assert.equal(snapshots.length, 5);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "CUT"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
});

test("conserva las cuatro composiciones no publicadas sin inventar materias", () => {
  const unavailable = snapshots.filter((snapshot) => snapshot.plan.compositionAvailability?.available === false);
  assert.equal(unavailable.length, 4);
  assert.ok(unavailable.every((snapshot) => snapshot.plan.courses.length === 0));
  assert.ok(unavailable.every((snapshot) =>
    snapshot.validation.issues.some((issue) => issue.code === "composition-unavailable")));
  assert.equal(report.status, "extracted");
});

test("reporte y manifiestos actualizan sólo los representantes de CUT", () => {
  assert.deepEqual(report.totals, {
    plans: 5,
    courses: 42,
    prerequisiteEntries: 46,
    publishedRules: 22,
    noPublishedRuleQueries: 24,
    validationIssues: 4,
    requests: 2130,
    bytes: 391500,
  });

  const cut = globalManifest.services.find((service) => service.code === "CUT");
  assert.deepEqual(cut.counts.byState, { extracted: 4, "structurally-valid": 2, discovered: 2 });
  assert.equal(cut.plans.length, 8);

  const targets = regionalManifest.extractionTargets.filter((target) => target.serviceCode === "CUT");
  assert.equal(targets.length, 5);
  assert.equal(targets.filter((target) => target.state === "extracted").length, 4);
  assert.equal(targets.filter((target) => target.state === "structurally-valid").length, 1);
});
