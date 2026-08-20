import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const queue = readJson("data/bedelias/inventory/audit-queue.json");
const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");
const catalog = readJson("app/data/extracted-academic-catalog.json");
const audit = registry.audits.find((entry) => entry.identity === "escalonada de enfermeria:2001");

test("distingue el plan en finalización de la oferta 2026", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.conclusion.canonicalModel, "legacy-plan-teach-out");
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.equal(audit.officialPlan.currentSuccessor.planYear, "2016");
  assert.equal(audit.officialPlan.currentSuccessor.minimumCredits, 360);
  assert.deepEqual(audit.officialPlan.currentSuccessor.locations, ["Montevideo", "Salto", "Rivera"]);
});

test("los registros regionales son una sola identidad histórica sin composición", () => {
  assert.ok(Object.values(audit.bedeliasComparison.snapshotCurrentFlags).every((current) => current === false));
  assert.ok(Object.values(audit.bedeliasComparison.courses).every((count) => count === 0));
  assert.ok(Object.values(audit.bedeliasComparison.prerequisiteEntries).every((count) => count === 0));
  assert.ok(audit.offerings.every((offering) => offering.admissionStatus === "historical-not-current"));
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});

test("sale del selector vigente pero conserva trazabilidad de auditoría", () => {
  assert.ok(queue.completedAudits.some((entry) => entry.identity === audit.identity));
  assert.ok(!queue.queue.some((entry) => entry.identity === audit.identity));
  assert.ok(!report.plans.some((entry) => entry.identity === audit.identity));
  assert.ok(!catalog.flatMap((faculty) => faculty.careers).some((career) => /Escalonada de Enfermer/i.test(career.label)));
});
