import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));

test("cierra Letras Hispánicas Plan 1976 como título histórico, no como oferta actual", () => {
  const registry = readJson("data/bedelias/audits/official-source-audits.json");
  const audit = registry.audits.find((entry) => entry.identity === "letras hispanicas:1976");
  assert.ok(audit);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.equal(audit.conclusion.canonicalIdentity, "letras:2014");
  assert.equal(audit.officialPlan.historicalCareerCode, "54");
  assert.equal(audit.bedeliasComparison.metadataCurrent, false);
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 0);
  assert.ok(audit.sources.some((source) => source.url.endsWith("/plan-de-estudios-11/")));
  assert.ok(audit.sources.some((source) => source.url.includes("Listado%20de%20carreras-CSE.pdf")));
});

test("no copia las mallas 1991 o 2014 al registro vacío de 1976", () => {
  const historical = readJson("data/bedelias/fhum-letras-hispanicas-1976.json");
  assert.equal(historical.plan.metadata.current, false);
  assert.equal(historical.plan.courses.length, 0);
  assert.deepEqual(historical.plan.composition.children.map((node) => node.label), ["Perfiles"]);

  const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");
  const identities = new Set(report.plans.map((plan) => plan.identity));
  assert.ok(!identities.has("letras hispanicas:1976"));
  assert.ok(identities.has("letras:2014"));
  assert.equal(report.counts.compositionUnavailable, 12);
});
