import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^cenurso-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/cenurso-regional.json");
const globalManifest = readJson("data/bedelias/inventory/global-current.json");
const regionalManifest = readJson("data/bedelias/inventory/regional-offerings.json");

test("CENURSO conserva sólo sus dos planes regionales representativos", () => {
  assert.equal(snapshots.length, 2);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "CENURSO"));
  assert.deepEqual(
    snapshots.map((snapshot) => [snapshot.program.name, snapshot.plan.year]).sort(),
    [
      ["TECNICATURA UNIVERSITARIA EN BIENES CULTURALES", "2021"],
      ["TECNÓLOGO EN ADMINISTRACIÓN Y CONTABILIDAD", "2012"],
    ],
  );
});

test("registra literalmente la composición no publicada sin bloquear el lote", () => {
  const unavailable = snapshots.find((snapshot) => snapshot.plan.compositionAvailability?.available === false);
  assert.equal(unavailable.program.name, "TECNÓLOGO EN ADMINISTRACIÓN Y CONTABILIDAD");
  assert.deepEqual(unavailable.validation.issues.map((issue) => issue.code), ["composition-unavailable"]);
  assert.equal(report.totals.plans, 2);
  assert.equal(report.totals.validationIssues, 1);
  assert.equal(report.status, "extracted");
});

test("los manifiestos conservan ofertas no extraídas y actualizan sólo los representantes", () => {
  const cenurso = globalManifest.services.find((service) => service.code === "CENURSO");
  assert.deepEqual(cenurso.counts.byState, { discovered: 2, "structurally-valid": 1, extracted: 1 });

  const targets = regionalManifest.extractionTargets.filter((target) => target.serviceCode === "CENURSO");
  assert.deepEqual(targets.map((target) => target.state).sort(), ["extracted", "structurally-valid"]);
  assert.equal(cenurso.plans.length, 4);
});
