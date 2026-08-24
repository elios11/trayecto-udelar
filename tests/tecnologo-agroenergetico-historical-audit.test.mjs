import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));

test("cierra Tecnólogo Agroenergético como cohorte histórica finita", () => {
  const registry = readJson("data/bedelias/audits/official-source-audits.json");
  const audit = registry.audits.find((entry) => entry.identity === "tecnologo agroenergetico:2008");
  assert.ok(audit);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.officialPlan.current, false);
  assert.equal(audit.conclusion.canonicalModel, "historical-finite-cohort");
  assert.equal(audit.conclusion.excludeFromCurrentUi, true);
  assert.equal(audit.offerings[0].admissionStatus, "historical-not-current");
  assert.match(audit.officialPlan.lastGenerationStatus, /2014/);
  assert.ok(audit.sources.some((source) => /Ingresos-totales/.test(source.url)));
  assert.ok(audit.sources.some((source) => source.url === "https://www.fq.edu.uy/es/node/60"));
});

test("no publica una malla vacía ni reconcilia créditos incompatibles", () => {
  const snapshot = readJson("data/bedelias/fq-tecnologo-agroenergetico-2008.json");
  assert.equal(snapshot.plan.metadata.current, true);
  assert.equal(snapshot.plan.metadata.minCredits, 321);
  assert.equal(snapshot.plan.courses.length, 0);

  const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");
  const queue = readJson("data/bedelias/inventory/ui-curriculum-queue.json");
  assert.ok(!report.plans.some((plan) => plan.identity === "tecnologo agroenergetico:2008"));
  assert.equal(report.counts.compositionUnavailable, 0);
  assert.equal(queue.counts.curriculumPending, 0);
  assert.deepEqual(queue.queue, []);
});
