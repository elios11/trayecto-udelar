import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const conversions = new Map([
  ["asistente dental:1963", "asistente en odontologia:2017"],
  ["higienista dental:1963", "higienista en odontologia:2017"],
  ["laboratorista dental:1963", "laboratorista en odontologia:2017"],
]);

test("los tres certificados de 1963 se canjean por los títulos odontológicos actuales", () => {
  const registry = readJson("data/bedelias/audits/official-source-audits.json");
  for (const [identity, successor] of conversions) {
    const audit = registry.audits.find((entry) => entry.identity === identity);
    assert.ok(audit, identity);
    assert.equal(audit.conclusion.canonicalIdentity, successor, identity);
    assert.equal(audit.conclusion.excludeFromCurrentUi, true, identity);
    assert.match(audit.officialPlan.conversionRule, /10\/12\/2002/, identity);
    assert.ok(audit.sources.some((source) => source.url.includes("237-reglamento-de-canje")), identity);
  }
});

test("Laboratorista 2017 proyecta exactamente los 240 créditos oficiales", () => {
  const plan = readJson("app/data/bedelias-generated/bedelias-odon-laboratorista-en-odontologia-2017.json");
  assert.equal(plan.plan.degreeTitle, "Laboratorista en Odontología");
  assert.equal(plan.plan.durationMonths, 36);
  assert.equal(plan.plan.minCredits, 240);
  assert.equal(plan.plan.compositionAvailable, true);
  assert.equal(plan.courses.length, 19);
  assert.equal(plan.courses.reduce((total, course) => total + course.credits, 0), 240);
  assert.deepEqual(plan.pathways.bedelias.periods.map((period) => period.courseIds.reduce(
    (total, id) => total + plan.courses.find((course) => course.id === id).credits,
    0,
  )), [89, 85, 66]);
  assert.equal(plan.courses.find((course) => course.id === "odon-ortopedia-2").credits, 14);
  assert.equal(plan.rules.length, 12);
  assert.deepEqual(plan.campuses.map((campus) => campus.id), ["montevideo-facultad-de-odontologia"]);
});

test("la UI conserva las carreras vigentes y excluye sólo los certificados históricos", () => {
  const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");
  const identities = new Set(report.plans.map((plan) => plan.identity));
  for (const [identity, successor] of conversions) {
    assert.ok(!identities.has(identity), identity);
    assert.ok(identities.has(successor), successor);
  }
});
