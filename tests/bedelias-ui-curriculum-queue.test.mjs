import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildUiCurriculumQueue } from "../scripts/bedelias-ui-curriculum-queue.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const uiReport = readJson("data/bedelias/inventory/ui-extracted-plans.json");
const auditRegistry = readJson("data/bedelias/audits/official-source-audits.json");
const globalManifest = readJson("data/bedelias/inventory/global-current.json");
const saved = readJson("data/bedelias/inventory/ui-curriculum-queue.json");

test("prioriza cada plan visible que todavía no tiene una malla utilizable", () => {
  assert.equal(saved.counts.currentUiPlans, 152);
  assert.equal(saved.counts.curriculumReady, 126);
  assert.equal(saved.counts.curriculumPending, 26);
  assert.deepEqual(saved.counts.byPriority, {
    "audited-curriculum-normalization-pending": 1,
    "official-curriculum-sources-pending": 25,
  });
  assert.equal(new Set(saved.queue.map((entry) => entry.identity)).size, saved.queue.length);
  assert.deepEqual(
    saved.queue.slice(0, 1).map((entry) => entry.identity),
    ["lic en ingenieria biologica:2013"],
  );
  assert.deepEqual(
    new Set(saved.queue.map((entry) => entry.identity)),
    new Set(uiReport.plans.filter((plan) => !plan.compositionAvailable).map((plan) => plan.identity)),
  );
});

test("la cola de composición se reconstruye sin red con el mismo hash", () => {
  const rebuilt = buildUiCurriculumQueue({
    uiReport,
    auditRegistry,
    globalManifest,
    generatedAt: saved.generatedAt,
  });
  assert.equal(rebuilt.contentHash, saved.contentHash);
  assert.deepEqual(rebuilt.counts, saved.counts);
  assert.deepEqual(rebuilt.queue, saved.queue);
});
