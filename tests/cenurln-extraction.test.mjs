import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const representativeSnapshots = new Set([
  "cenurln-ciclo-en-biologia-bioquimica-2016.json",
  "cenurln-ciclo-inicial-de-matematica-2012.json",
  "cenurln-licenciatura-binacional-en-turismo-2004.json",
  "cenurln-licenciatura-en-ciencias-hidricas-aplicadas-2016.json",
  "cenurln-licenciatura-en-ciencias-sociales-2009.json",
  "cenurln-licenciatura-en-diseno-integrado-2012.json",
  "cenurln-tecnicatura-binacional-en-turismo-2004.json",
  "cenurln-tecnicatura-en-direccion-de-coros-2002.json",
  "cenurln-tecnicatura-en-interpretacion-perfil-canto-guitarra-piano-2002.json",
  "cenurln-tecnicatura-en-tecnologias-de-la-imagen-fotografica-2008.json",
]);
const snapshots = readdirSync(dataDirectory)
  .filter((name) => representativeSnapshots.has(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/cenurln-regional.json");
const globalManifest = readJson("data/bedelias/inventory/global-current.json");
const regionalManifest = readJson("data/bedelias/inventory/regional-offerings.json");

test("CENURLN conserva sólo sus diez planes regionales representativos", () => {
  assert.equal(snapshots.length, 10);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "CENURLN"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
});

test("conserva las dos composiciones no publicadas sin inventar materias", () => {
  const unavailable = snapshots
    .filter((snapshot) => snapshot.plan.compositionAvailability?.available === false)
    .map((snapshot) => snapshot.program.name)
    .sort();
  assert.deepEqual(unavailable, [
    "LICENCIATURA EN CIENCIAS HÍDRICAS APLICADAS",
    "LICENCIATURA EN DISEÑO INTEGRADO",
  ]);
  assert.equal(report.status, "extracted");
});

test("reporte y manifiestos completan las treinta extracciones regionales", () => {
  assert.deepEqual(report.totals, {
    plans: 10,
    courses: 499,
    prerequisiteEntries: 194,
    publishedRules: 127,
    noPublishedRuleQueries: 67,
    validationIssues: 2,
    requests: 9717,
    bytes: 2121997,
  });

  const cenurln = globalManifest.services.find((service) => service.code === "CENURLN");
  assert.deepEqual(cenurln.counts.byState, { "structurally-valid": 8, discovered: 43, extracted: 2 });
  assert.equal(cenurln.plans.length, 53);

  assert.equal(regionalManifest.extractionTargets.length, 30);
  assert.equal(regionalManifest.extractionTargets.filter((target) => target.state === "discovered").length, 0);
  assert.equal(regionalManifest.extractionTargets.filter((target) => target.state === "structurally-valid").length, 21);
  assert.equal(regionalManifest.extractionTargets.filter((target) => target.state === "extracted").length, 9);
});
