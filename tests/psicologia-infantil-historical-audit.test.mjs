import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));

test("Psicología Infantil queda auditada como título histórico convertido", () => {
  const registry = readJson("data/bedelias/audits/official-source-audits.json");
  const audit = registry.audits.find((entry) => entry.identity === "psicologia infantil:1960");
  assert.ok(audit);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalIdentity, "licenciatura en psicologia:2013");
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.match(audit.officialPlan.conversionRule, /11\/06\/2002/);
  assert.ok(audit.sources.some((source) => source.url.includes("175-ordenanza-para-conversion")));
  assert.equal(audit.bedeliasComparison.metadataCurrent, false);
  assert.equal(audit.bedeliasComparison.indexCurrent, true);
});

test("la UI excluye el título histórico y conserva la Licenciatura vigente", () => {
  const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");
  const identities = new Set(report.plans.map((plan) => plan.identity));
  assert.ok(!identities.has("psicologia infantil:1960"));
  assert.ok(identities.has("licenciatura en psicologia:2013"));
  assert.equal(report.counts.compositionUnavailable, 14);
});
