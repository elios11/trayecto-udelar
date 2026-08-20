import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const snapshot = await readJson("data/bedelias/fagro-tecnico-rural-1956.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const report = await readJson("data/bedelias/inventory/ui-extracted-plans.json");
const audit = registry.audits.find((entry) => entry.identity === "tecnico rural:1956");

test("resuelve la contradicción de vigencia del Técnico Rural Plan 1956", () => {
  assert.equal(snapshot.plan.metadata.current, false);
  assert.equal(snapshot.plan.current, true);
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.equal(audit.officialPlan.historicalDurationMonths, 36);
  assert.deepEqual(audit.officialPlan.historicalLocationsByYear.map((entry) => entry.location), [
    "Salto", "Bañado de Medina, Cerro Largo", "Paysandú",
  ]);
  assert.match(audit.conclusion.reason, /mediados de la década de 1960/i);
});

test("conserva las etapas históricas sin publicarlas como sedes actuales", () => {
  assert.ok(!catalog.flatMap((faculty) => faculty.careers).some((career) => career.label === "Tecnico Rural" || career.label === "Técnico Rural"));
  assert.ok(!report.plans.some((plan) => plan.identity === "tecnico rural:1956"));
  assert.ok(audit.offerings.every((offering) => offering.admissionStatus === "historical-not-current"));
  assert.match(audit.anomalies.find((entry) => entry.field === "locations").resolution, /no tres sedes actuales/i);
});
