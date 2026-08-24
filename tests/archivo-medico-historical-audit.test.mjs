import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));

test("Archivo Médico queda auditada como titulación histórica convertida", () => {
  const registry = readJson("data/bedelias/audits/official-source-audits.json");
  const audit = registry.audits.find((entry) => entry.identity === "tecnicatura en archivo medico:2006");
  assert.ok(audit);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalIdentity, "licenciatura en registros medicos:2006");
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.match(audit.officialPlan.conversionRule, /09\/12\/2008/);
  assert.equal(audit.officialPlan.currentSuccessor.intermediateTitle, "Tecnólogo en Registros Médicos");
  assert.ok(audit.sources.every((source) => source.url.startsWith("https://")));
});

test("Archivo Médico no se proyecta como carrera vigente duplicada", () => {
  const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");
  const queue = readJson("data/bedelias/inventory/audit-queue.json");
  assert.ok(!report.plans.some((plan) => plan.identity === "tecnicatura en archivo medico:2006"));
  assert.ok(queue.completedAudits.some((entry) => entry.identity === "tecnicatura en archivo medico:2006"));
  assert.ok(queue.queue.some((entry) => entry.identity === "licenciatura en registros medicos:2006"));
});
