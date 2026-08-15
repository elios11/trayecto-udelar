import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildAuditQueue, officialAuditRegistryHash } from "../scripts/bedelias-audit-queue.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const globalManifest = readJson("data/bedelias/inventory/global-current.json");
const regionalManifest = readJson("data/bedelias/inventory/regional-offerings.json");
const comparisonManifest = readJson("data/bedelias/inventory/regional-content-comparison.json");
const auditRegistry = readJson("data/bedelias/audits/official-source-audits.json");
const saved = readJson("data/bedelias/inventory/audit-queue.json");

test("genera una cola canónica deduplicada y dirigida por excepciones", () => {
  assert.equal(saved.counts.canonicalIdentities, 184);
  assert.equal(saved.counts.auditedCanonicalIdentities, 7);
  assert.equal(saved.counts.evidenceClosedCanonicalIdentities, 1);
  assert.equal(saved.counts.pendingCanonicalIdentities, 176);
  assert.deepEqual(saved.counts.byPriority, {
    "regional-content-difference": 8,
    "insufficient-regional-content": 21,
    "composition-unavailable": 38,
    "official-sources-pending": 109,
  });
  assert.deepEqual(saved.counts.regionalComparisons, {
    "curriculum-match-prerequisite-coverage-difference": 15,
    "insufficient-content": 26,
    "content-difference-detected": 16,
  });
  assert.equal(new Set(saved.queue.map((entry) => entry.identity)).size, saved.queue.length);
  assert.equal(saved.queue.filter((entry) => entry.sourceOffers.length > 1).length, 4);
  assert.equal(saved.completedAudits[0].identity, "ingeniero agronomo:2020");
  assert.equal(saved.source.officialAuditRegistryHash, auditRegistry.contentHash);
  assert.equal(officialAuditRegistryHash(auditRegistry), auditRegistry.contentHash);
});

test("la cola guardada se reconstruye sin red con el mismo hash", () => {
  const rebuilt = buildAuditQueue({
    globalManifest,
    regionalManifest,
    comparisonManifest,
    auditRegistry,
    generatedAt: saved.generatedAt,
  });
  assert.equal(rebuilt.contentHash, saved.contentHash);
  assert.deepEqual(rebuilt.counts, saved.counts);
  assert.ok(rebuilt.queue.every((entry) => entry.canonicalSource.state !== "audited"));
  assert.equal(rebuilt.queue[0].priority, "regional-content-difference");
});
