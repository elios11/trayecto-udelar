import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));

test("cierra la Tecnicatura en Turismo Plan 1996 como oferta itinerante histórica", () => {
  const registry = readJson("data/bedelias/audits/official-source-audits.json");
  const audit = registry.audits.find((entry) => entry.identity === "tecnicatura en turismo:1996");
  assert.ok(audit);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.equal(audit.conclusion.canonicalIdentity, "licenciatura en turismo:2014");
  assert.equal(audit.bedeliasComparison.metadataCurrent, false);
  assert.equal(audit.bedeliasComparison.indexCurrent, true);
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 0);
  assert.deepEqual(audit.officialPlan.historicalImplementation.locations, ["Fray Bentos", "Colonia", "Maldonado"]);
  assert.ok(audit.anomalies.some((entry) => entry.field === "composition" && /225 créditos/.test(entry.resolution)));
});

test("no inventa la malla de 1996 y conserva Turismo 2014 como opción vigente", () => {
  const historical = readJson("data/bedelias/fhum-tecnicatura-en-turismo-1996.json");
  assert.equal(historical.plan.metadata.current, false);
  assert.equal(historical.plan.courses.length, 0);

  const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");
  const identities = new Set(report.plans.map((plan) => plan.identity));
  assert.ok(!identities.has("tecnicatura en turismo:1996"));
  assert.ok(identities.has("licenciatura en turismo:2014"));
  assert.equal(report.counts.compositionUnavailable, 11);
});
