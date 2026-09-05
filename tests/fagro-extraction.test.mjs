import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));

const agronomia = readJson("data/bedelias/fagro-ingeniero-agronomo-2020.json");
const vitivinicultura = readJson("data/bedelias/fagro-licenciatura-en-vitivinicultura-2006.json");
const tecnicoRural = readJson("data/bedelias/fagro-tecnico-rural-1956.json");
const report = readJson("data/bedelias/reports/fagro-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

test("FAGRO conserva los tres planes vigentes extraídos", () => {
  assert.equal(agronomia.program.name, "INGENIERO AGRÓNOMO");
  assert.equal(agronomia.plan.year, "2020");
  assert.equal(agronomia.plan.courses.length, 717);
  assert.equal(agronomia.prerequisites.length, 387);
  assert.equal(agronomia.validation.issues.length, 0);

  assert.equal(vitivinicultura.program.name, "LICENCIATURA EN VITIVINICULTURA");
  assert.equal(tecnicoRural.program.name, "TECNICO RURAL");
});

test("los planes antiguos registran la limitación publicada por Bedelías", () => {
  for (const snapshot of [vitivinicultura, tecnicoRural]) {
    assert.equal(snapshot.plan.courses.length, 0);
    assert.deepEqual(snapshot.plan.compositionAvailability, {
      available: false,
      reason: "No se puede mostrar la composición de este plan.",
    });
    assert.deepEqual(snapshot.validation.issues.map((issue) => issue.code), ["composition-unavailable"]);
  }
});

test("el reporte y el manifiesto reflejan el cierre del servicio sin habilitar publicación", () => {
  assert.equal(report.totals.plans, 3);
  assert.equal(report.totals.validationIssues, 2);
  assert.equal(report.status, "extracted");
  assert.match(report.nextStep, /FACULTAD DE AGRONOMÍA/);

  const fagro = manifest.services.find((service) => service.code === "FAGRO");
  assert.deepEqual(fagro.counts.byState, { "structurally-valid": 1, extracted: 2 });
  assert.equal(fagro.plans.some((plan) => plan.state === "audited"), false);
});
