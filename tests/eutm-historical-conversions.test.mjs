import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const conversions = new Map([
  ["tecnicatura en fisioterapia:1901", "licenciatura en fisioterapia:2006"],
  ["tecnicatura en fonoaudiologia:1900", "licenciatura en fonoaudiologia:2006"],
  ["tecnicatura en instrumentacion quirurgica:1997", "licenciatura en instrumentacion quirurgica:2006"],
  ["tecnicatura en laboratorio clinico:1900", "licenciatura en laboratorio clinico:2006"],
  ["tecnicatura en neumocardiologia:1900", "licenciatura en neumocardiologia:2006"],
  ["tecnicatura en oftalmologia:1990", "licenciatura en oftalmologia:2006"],
  ["tecnicatura en radiologia:1900", "licenciatura en imagenologia:2006"],
  ["tecnicatura en reeducacion psicomotriz:1901", "licenciatura en psicomotricidad:2006"],
  ["tecnicatura en registros medicos:1990", "licenciatura en registros medicos:2006"],
]);

test("las titulaciones técnicas históricas de EUTM quedan ligadas a sus conversiones oficiales", () => {
  const registry = readJson("data/bedelias/audits/official-source-audits.json");
  for (const [identity, successor] of conversions) {
    const audit = registry.audits.find((entry) => entry.identity === identity);
    assert.ok(audit, identity);
    assert.equal(audit.status, "official-evidence-complete", identity);
    assert.equal(audit.publicationEligible, false, identity);
    assert.equal(audit.conclusion.canonicalIdentity, successor, identity);
    assert.equal(audit.conclusion.excludeFromCurrentUi, true, identity);
    assert.equal(audit.bedeliasComparison.metadataCurrent, false, identity);
    assert.equal(audit.bedeliasComparison.indexCurrent, true, identity);
    assert.equal(audit.bedeliasComparison.compositionAvailable, false, identity);
    assert.ok(audit.sources.some((source) => source.authority.startsWith("Dirección General Jurídica")), identity);
  }
});

test("la UI excluye sólo los antecedentes y conserva cada licenciatura sucesora", () => {
  const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");
  const identities = new Set(report.plans.map((plan) => plan.identity));
  for (const [identity, successor] of conversions) {
    assert.ok(!identities.has(identity), identity);
    assert.ok(identities.has(successor), successor);
  }
});
