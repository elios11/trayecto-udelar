import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-oceanografia-biologica-1978.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const report = await readJson("data/bedelias/inventory/ui-extracted-plans.json");
const audit = registry.audits.find((entry) => entry.identity === "licenciatura en oceanografia biologica:1978");

test("resuelve como histórico el Plan 1978 contradictorio de Oceanografía Biológica", () => {
  assert.equal(snapshot.plan.metadata.current, false);
  assert.equal(snapshot.plan.current, true);
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.equal(audit.officialPlan.historicalOperatingPeriod, "1978-1994");
  assert.match(audit.conclusion.reason, /dejó de dictarse/i);
});

test("no ofrece el título histórico como carrera vigente", () => {
  const careers = catalog.flatMap((faculty) => faculty.careers);
  assert.ok(!careers.some((career) => career.label === "Licenciatura en Oceanografía Biológica"));
  assert.ok(!report.plans.some((plan) => plan.identity === "licenciatura en oceanografia biologica:1978"));
  assert.ok(audit.offerings.every((offering) => offering.admissionStatus === "historical-not-current"));
});

test("distingue Ciencias Biológicas vigente de la nueva Oceanografía prevista para 2027", () => {
  const sourceUrls = new Set(audit.sources.map((source) => source.url));
  assert.ok(sourceUrls.has("https://www.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-ciencias-biologicas"));
  assert.ok(sourceUrls.has("https://udelar.edu.uy/noticias/se-abren-inscripciones-la-nueva-licenciatura-en-oceanografia"));
  assert.match(audit.anomalies.find((entry) => entry.field === "successorPath").resolution, /Plan 2017/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "newOceanographyDegree").resolution, /cinco orientaciones/i);
  assert.match(audit.remainingWork, /apertura formal 2027/i);
});
