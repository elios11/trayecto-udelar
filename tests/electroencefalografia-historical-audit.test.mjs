import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const historicalIdentities = [
  "tecnicatura en electroencefalografia:1900",
  "tecnicatura en electroencefalografia y neurofisiologia clinica:1990",
];

test("las dos denominaciones técnicas quedan ligadas al mismo reglamento de conversión", () => {
  const registry = readJson("data/bedelias/audits/official-source-audits.json");
  const audits = historicalIdentities.map((identity) => registry.audits.find((entry) => entry.identity === identity));
  assert.ok(audits.every(Boolean));
  for (const audit of audits) {
    assert.equal(audit.status, "official-evidence-complete");
    assert.equal(audit.conclusion.canonicalIdentity, "licenciatura en neurofisiologia clinica:2006");
    assert.equal(audit.conclusion.excludeFromCurrentUi, true);
    assert.match(audit.officialPlan.conversionRule, /16\/12\/2002/);
    assert.ok(audit.sources.some((source) => source.url.includes("285-reglamento-de-conversion")));
  }
});

test("la UI excluye ambas tecnicaturas sin excluir la licenciatura vigente", () => {
  const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");
  const identities = new Set(report.plans.map((plan) => plan.identity));
  assert.ok(historicalIdentities.every((identity) => !identities.has(identity)));
  assert.ok(identities.has("licenciatura en neurofisiologia clinica:2006"));
});
