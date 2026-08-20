import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const report = await readJson("data/bedelias/inventory/ui-extracted-plans.json");
const snapshot = await readJson("data/bedelias/fagro-licenciatura-en-vitivinicultura-2006.json");
const loaders = await readFile(new URL("app/data/extracted-academic-loaders.ts", root), "utf8");
const audit = audits.audits.find((entry) => entry.identity === "licenciatura en vitivinicultura:2006");

test("cierra el falso vigente de Bedelías sin ofrecer una carrera histórica", () => {
  assert.equal(snapshot.plan.current, true);
  assert.equal(snapshot.plan.metadata.minCredits, 150);
  assert.equal(snapshot.plan.compositionAvailability.available, false);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.equal(audit.conclusion.canonicalModel, "legacy-shared-complementary-degree-without-current-admission");
  assert.match(audit.conclusion.reason, /ingreso 2026/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "bedeliasCurrent").resolution, /contradice/i);
});

test("no confunde la licenciatura cerrada con la opción Fruti-Vitivicultura", () => {
  const careers = catalog.flatMap((faculty) => faculty.careers);
  assert.ok(!careers.some((career) => /Licenciatura en Vitivinicultura/i.test(career.label)));
  assert.ok(!report.plans.some((plan) => plan.identity === "licenciatura en vitivinicultura:2006"));
  assert.doesNotMatch(loaders, /bedelias-fagro-licenciatura-en-vitivinicultura-2006/);
  assert.match(audit.conclusion.normalization.join(" "), /no sustituirla por la orientación Fruti-Vitivicultura/i);
  assert.ok(audit.offerings.every((offering) => offering.admissionStatus === "historical-not-current"));
});

test("conserva evidencia oficial suficiente para una eventual reapertura", () => {
  assert.ok(audit.sources.some((source) => source.url === "https://www.fq.edu.uy/es/node/60"));
  assert.ok(audit.sources.some((source) => source.url.includes("EA-CARRERA-2025.pdf")));
  assert.ok(audit.sources.some((source) => source.url.includes("Ingresos-totales-a-Servicios-Estudiantes-de-grado-2000-2024.pdf")));
  assert.equal(audit.officialPlan.lastOfficialAdmissionLocated, 2010);
  assert.match(audit.remainingWork, /reapertura/i);
});
