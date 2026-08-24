import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const queue = readJson("data/bedelias/inventory/audit-queue.json");
const curriculumQueue = readJson("data/bedelias/inventory/ui-curriculum-queue.json");
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

test("proyecta la malla oficial completa sin convertir la oferta optativa en una trayectoria", () => {
  assert.equal(audit.bedeliasComparison.canonicalCompositionAvailable, false);
  assert.equal(audit.bedeliasComparison.regionalCompositionAvailable, false);
  assert.equal(projection.plan.compositionAvailable, true);
  assert.equal(projection.courses.length, 50);
  assert.equal(Object.keys(projection.pathways).length, 1);
  assert.equal(projection.pathways.bedelias.label, "Plan modular vigente");
  assert.deepEqual(
    projection.creditStructure.nodes.filter((node) => node.id !== "plan-total").map((node) => node.minCredits),
    [48, 26, 8, 38, 81, 30, 14, 30, 27, 16, 12, 30],
  );
  assert.equal(
    projection.creditStructure.nodes.filter((node) => node.id !== "plan-total").reduce((total, node) => total + node.minCredits, 0),
    360,
  );
  const creditsByPeriod = Object.fromEntries(projection.pathways.bedelias.periods.map((period) => [
    period.label,
    period.courseIds.reduce((total, id) => total + projection.courses.find((course) => course.id === id).credits, 0),
  ]));
  assert.deepEqual(
    ["3.er semestre", "4.º semestre", "5.º semestre", "6.º semestre", "7.º semestre", "8.º semestre"].map((label) => creditsByPeriod[label]),
    [22, 32, 26, 48, 33, 49],
  );
  assert.ok(queue.completedAudits.some((entry) => entry.identity === audit.identity));
  assert.ok(!queue.queue.some((entry) => entry.identity === audit.identity));
  assert.ok(!curriculumQueue.queue.some((entry) => entry.identity === audit.identity));
});

test("hace operativas las previas oficiales de los dos Proyectos Integrales", () => {
  assert.equal(projection.rules.length, 2);
  const rules = new Map(projection.rules.map((rule) => [rule.target.name, rule]));
  assert.equal(rules.get("Proyecto Integral I · elección temática anual").expression.children.length, 5);
  assert.equal(rules.get("Proyecto Integral II · elección temática anual").expression.children.length, 6);
  assert.ok(projection.courses.find((course) => course.name === "La Cuestión Social en la Historia").creditAllocations[0].sourceUrl.includes("CI-Malla-curricular1.pdf"));
  assert.ok(projection.courses.find((course) => course.name === "Trabajo Social I").creditAllocations[0].sourceUrl.includes("TS-Malla-curricular-PROPUESTA.pdf"));
});
