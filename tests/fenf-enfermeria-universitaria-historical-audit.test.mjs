import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));

const countNodes = (node, nodeType) =>
  (node?.nodeType === nodeType ? 1 : 0) +
  (node?.children ?? []).reduce((total, child) => total + countNodes(child, nodeType), 0);

test("cierra Enfermería Universitaria Plan 1983 como antecedente histórico sin continuidad vigente", () => {
  const registry = readJson("data/bedelias/audits/official-source-audits.json");
  const audit = registry.audits.find((entry) => entry.identity === "enfermeria universitaria:1983");
  assert.ok(audit);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.equal(audit.conclusion.canonicalIdentity, "licenciatura en enfermeria:2016");
  assert.equal(audit.bedeliasComparison.metadataCurrent, false);
  assert.equal(audit.bedeliasComparison.indexCurrent, true);
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 53);
  assert.ok(audit.sources.some((source) => source.url.includes("Historia-Biblioteca-2.pdf")));
  assert.ok(audit.sources.some((source) => source.url.includes("cronogramas-estudiantiles")));
});

test("preserva las 53 materias como evidencia pero no publica una malla con mínimos cero", () => {
  const snapshot = readJson("data/bedelias/fenf-enfermeria-universitaria-1983.json");
  assert.equal(snapshot.plan.metadata.current, false);
  assert.equal(snapshot.plan.current, true);
  assert.equal(countNodes(snapshot.plan.composition, "Materia"), 53);

  const groups = snapshot.plan.composition.children[0].children;
  assert.equal(groups.length, 4);
  assert.ok(groups.every((group) => /min: 0 U\.C\.B/i.test(group.label)));

  const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");
  const identities = new Set(report.plans.map((plan) => plan.identity));
  assert.ok(!identities.has("enfermeria universitaria:1983"));
  assert.ok(identities.has("licenciatura en enfermeria:2016"));
  assert.equal(report.counts.compositionUnavailable, 1);
});
