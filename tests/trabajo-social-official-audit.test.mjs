import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const queue = readJson("data/bedelias/inventory/audit-queue.json");
const audit = registry.audits.find((entry) => entry.identity === "licenciatura en trabajo social:2009");
const projection = readJson("app/data/bedelias-generated/bedelias-fcs-licenciatura-en-trabajo-social-2009.json");

test("normaliza el único Plan 2009 y sus mínimos oficiales", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.title, "Licenciado/a en Trabajo Social");
  assert.equal(audit.officialPlan.durationMonths, 48);
  assert.equal(audit.officialPlan.minimumCredits, 360);
  assert.equal(Object.values(audit.officialPlan.cycleStructure).reduce((total, credits) => total + credits, 0), 360);
  assert.equal(Object.values(audit.officialPlan.advancedCycleModules).reduce((total, credits) => total + credits, 0), 240);
  assert.equal(Object.values(audit.officialPlan.initialCycleRequirementBreakdown).reduce((total, credits) => total + credits, 0), 48);
});

test("Montevideo y Salto son sedes del mismo plan, no trayectorias distintas", () => {
  const regional = audit.offerings.find((offering) => offering.serviceCode === "CENURLN");
  assert.deepEqual(regional.locations, ["Salto"]);
  assert.equal(regional.curriculumVariant, false);
  assert.equal(audit.conclusion.canonicalModel, "one-plan-multiple-offerings");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.deepEqual(projection.campuses.map((campus) => campus.id), ["montevideo", "salto"]);
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.plan.durationMonths, 48);
});

test("la ausencia de composición queda explícita y la identidad sale de la cola", () => {
  assert.equal(audit.bedeliasComparison.canonicalCompositionAvailable, false);
  assert.equal(audit.bedeliasComparison.regionalCompositionAvailable, false);
  assert.equal(projection.plan.compositionAvailable, false);
  assert.equal(projection.courses.length, 0);
  assert.match(projection.plan.notice, /no publica su composición/i);
  assert.ok(queue.completedAudits.some((entry) => entry.identity === audit.identity));
  assert.ok(!queue.queue.some((entry) => entry.identity === audit.identity));
});
