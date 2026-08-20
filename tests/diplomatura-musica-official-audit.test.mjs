import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const queue = readJson("data/bedelias/inventory/audit-queue.json");
const catalog = readJson("app/data/extracted-academic-catalog.json");
const audit = registry.audits.find((entry) => entry.identity === "diplomatura en musica:1994");

test("la auditoría distingue el Diplomado 1994 de sus sucesores vigentes", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.historicalTitle, "Diplomado en Música (Salto)");
  assert.deepEqual(audit.officialPlan.historicalOptions, [
    "Ejecución instrumental: Piano",
    "Canto",
    "Dirección Coral",
    "Ejecución instrumental: Guitarra",
  ]);
  assert.deepEqual(audit.officialPlan.currentSuccessors.map((successor) => successor.planYear), ["2004", "2004"]);
  assert.equal(audit.conclusion.canonicalModel, "legacy-plan-superseded");
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.equal(audit.offerings[0].admissionStatus, "historical-not-current");
});

test("el plan histórico sale de la UI vigente pero conserva trazabilidad", () => {
  assert.ok(queue.completedAudits.some((entry) => entry.identity === audit.identity));
  assert.ok(!queue.queue.some((entry) => entry.identity === audit.identity));
  assert.ok(!catalog.flatMap((faculty) => faculty.careers)
    .some((career) => career.label === "Diplomatura en Música"));
  assert.ok(audit.sources.every((source) => source.url.startsWith("https://")));
  assert.match(audit.anomalies.find((entry) => entry.field === "bedeliasCurrentFlag").resolution, /UI actual excluye/);
});
