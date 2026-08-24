import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const flatten = (node) => [node, ...(node.children ?? []).flatMap(flatten)];

test("distingue el contenedor de reválidas del Plan 1987 académico", () => {
  const registry = readJson("data/bedelias/audits/official-source-audits.json");
  const audit = registry.audits.find((entry) => entry.identity === "ingenieria en computacion revalida:1987");
  assert.ok(audit);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.equal(audit.conclusion.canonicalIdentity, "ingenieria en computacion:1987");
  assert.equal(audit.officialPlan.actualHistoricalIdentity, "ingenieria en computacion:1987");
  assert.equal(audit.bedeliasComparison.metadataCurrent, false);
  assert.equal(audit.bedeliasComparison.titleCount, 0);
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 184);
  assert.ok(audit.anomalies.some((entry) => entry.field === "historicalPlanCoverage"));
});

test("preserva la evidencia administrativa sin publicar una malla de mínimos cero", () => {
  const snapshot = readJson("data/bedelias/fing-ingenieria-en-computacion-revalida-1987.json");
  const nodes = flatten(snapshot.plan.composition);
  const groups = nodes.filter((node) => node.nodeType === "Grupo");
  assert.equal(snapshot.plan.metadata.current, false);
  assert.equal(nodes.filter((node) => node.nodeType === "Materia").length, 184);
  assert.ok(groups.every((group) => /min: 0 U\.C\.B/i.test(group.label)));

  const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");
  const identities = new Set(report.plans.map((plan) => plan.identity));
  assert.ok(!identities.has("ingenieria en computacion revalida:1987"));
  const catalogSource = readFileSync(new URL("../app/academic-catalog.ts", import.meta.url), "utf8");
  assert.match(catalogSource, /label: "Ingeniería en Computación"[\s\S]*id: "2025"[\s\S]*id: "1997"/);
  assert.equal(report.counts.compositionUnavailable, 1);
});
