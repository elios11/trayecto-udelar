import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");

const historicalMusicPlans = [
  ["licenciatura en composicion:1987", "bedelias-fartes-licenciatura-en-composicion-1987", 130],
  ["licenciatura en direccion coral:1987", "bedelias-fartes-licenciatura-en-direccion-coral-1987", 123],
  ["licenciatura en direccion orquestal:1987", "bedelias-fartes-licenciatura-en-direccion-orquestal-1987", 120],
  ["licenciatura en musicologia:1987", "bedelias-fartes-licenciatura-en-musicologia-1987", 145],
];

test("conserva los cuatro planes musicales de 1987 para estudiantes existentes", () => {
  for (const [identity] of historicalMusicPlans) {
    const audit = registry.audits.find((entry) => entry.identity === identity);
    assert.ok(audit, identity);
    assert.equal(audit.officialPlan.current, false, identity);
    assert.equal(audit.conclusion.excludeFromCurrentUi, false, identity);
    assert.equal(audit.officialPlan.curriculum.useBedeliasCompositionTree, true, identity);
    assert.ok(audit.sources.some((source) => source.url.includes("calendario-de-examenes")), identity);
  }
});

test("proyecta unidades sin inventar créditos y exige validación manual final", () => {
  for (const [identity, planId, expectedCourses] of historicalMusicPlans) {
    const item = report.plans.find((plan) => plan.identity === identity);
    assert.equal(item?.planId, planId, identity);
    assert.equal(item.compositionAvailable, true, identity);
    const projection = readJson(`app/data/bedelias-generated/${planId}.json`);
    assert.equal(projection.plan.current, false, identity);
    assert.equal(projection.courses.length, expectedCourses, identity);
    assert.ok(projection.courses.every((course) => course.credits === 0), identity);
    assert.ok(projection.pathways.bedelias.periods.length > 1, identity);
    assert.equal(projection.pathways.bedelias.periods.at(-1).label, "Validación de egreso", identity);
    const validation = projection.creditStructure.credentials[0].requiredCourseGroups
      .find((group) => group.id === "validacion-final-plan");
    assert.equal(validation.minCompleted, 1, identity);
    assert.equal(validation.courseIds.length, 1, identity);
    assert.match(projection.plan.notice, /Plan histórico sin nuevos ingresos/i, identity);
  }
});

test("no expone como actuales los títulos históricos sin oferta vigente", () => {
  const identities = new Set(report.plans.map((plan) => plan.identity));
  assert.equal(identities.has("creador plastico:1991"), false);
  assert.equal(identities.has("profesorado:1967"), false);
});
