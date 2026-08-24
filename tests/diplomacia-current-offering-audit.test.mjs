import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const snapshot = await readJson("data/bedelias/fder-diplomacia-1918.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const report = await readJson("data/bedelias/inventory/ui-extracted-plans.json");
const audit = registry.audits.find((entry) => entry.identity === "diplomacia:1918");

test("resuelve como histórico el Doctorado en Diplomacia Plan 1918", () => {
  assert.equal(snapshot.plan.metadata.current, false);
  assert.equal(snapshot.plan.current, true);
  assert.equal(snapshot.plan.titleLabels[0], "DOCTOR EN DIPLOMACIA");
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.equal(audit.officialPlan.creationYear, 1918);
  assert.match(audit.conclusion.reason, /interrupción/i);
});

test("no ofrece Diplomacia como carrera vigente ni la duplica con Relaciones Internacionales", () => {
  const careers = catalog.flatMap((faculty) => faculty.careers);
  assert.ok(!careers.some((career) => career.label === "Diplomacia"));
  assert.ok(!report.plans.some((plan) => plan.identity === "diplomacia:1918"));
  assert.equal(careers.filter((career) => career.label === "Licenciatura en Relaciones Internacionales").length, 1);
  assert.ok(report.plans.some((plan) => plan.identity === "licenciatura en relaciones internacionales:2013"));
  assert.ok(audit.offerings.every((offering) => offering.admissionStatus === "historical-not-current"));
});

test("conserva la continuidad institucional sin migrar plan, credencial ni progreso", () => {
  assert.deepEqual(audit.officialPlan.institutionalSuccessors, [
    { year: 1984, name: "Licenciatura en Comercio Internacional" },
    { year: 1985, name: "Licenciatura en Relaciones Internacionales" },
  ]);
  assert.match(audit.anomalies.find((entry) => entry.field === "successorCareer").resolution, /no migra progreso/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "graduateElectoralRights").resolution, /egresados históricos/i);
  assert.match(audit.remainingWork, /auditar por separado/i);
});
