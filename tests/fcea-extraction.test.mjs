import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^fcea-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/fcea-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("FCEA conserva los seis planes vigentes extraídos", () => {
  assert.equal(snapshots.length, 6);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "FCEA"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
});

test("normaliza la actividad de examen sin convertirla en examen aprobado", () => {
  const contador = snapshots.find((snapshot) => snapshot.program.name === "CONTADOR PÚBLICO");
  const serialized = JSON.stringify(contador.prerequisites);
  assert.match(serialized, /"assessment":"exam-activity"/);
  assert.equal(contador.validation.issues.length, 0);
  assert.ok(snapshots.every((snapshot) => (
    snapshot.validation.issues.every((issue) => issue.code !== "unparsed-requirement")
  )));
});

test("reporte y manifiesto conservan la única limitación publicada sin habilitar UI", () => {
  assert.equal(report.totals.plans, 6);
  assert.equal(report.totals.validationIssues, 1);
  assert.equal(report.status, "extracted");

  const technologist = snapshots.find((snapshot) => snapshot.program.name === "TECNÓLOGO EN GESTIÓN UNIVERSITARIA");
  assert.deepEqual(technologist.plan.compositionAvailability, {
    available: false,
    reason: "La interfaz pública no publicó una composición.",
  });

  const fcea = manifest.services.find((service) => service.code === "FCEA");
  assert.deepEqual(fcea.counts.byState, { "structurally-valid": 5, extracted: 1 });
  assert.equal(fcea.plans.some((plan) => plan.state === "audited"), false);
});
