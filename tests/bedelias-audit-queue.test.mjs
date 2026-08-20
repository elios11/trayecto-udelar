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
  assert.equal(saved.counts.evidenceClosedCanonicalIdentities, 26);
  assert.equal(saved.counts.pendingCanonicalIdentities, 151);
  assert.deepEqual(saved.counts.byPriority, {
    "insufficient-regional-content": 4,
    "composition-unavailable": 38,
    "official-sources-pending": 109,
  });
  assert.deepEqual(saved.counts.regionalComparisons, {
    "curriculum-match-prerequisite-coverage-difference": 16,
    "insufficient-content": 26,
    "content-difference-detected": 15,
  });
  assert.equal(new Set(saved.queue.map((entry) => entry.identity)).size, saved.queue.length);
  assert.equal(saved.queue.filter((entry) => entry.sourceOffers.length > 1).length, 3);
  assert.equal(saved.completedAudits[0].identity, "ingeniero agronomo:2020");
  assert.equal(saved.completedAudits[1].identity, "licenciatura en biotecnologia:2024");
  assert.equal(saved.completedAudits[2].identity, "abogacia:2016");
  assert.equal(saved.completedAudits[3].identity, "notariado:2016");
  assert.equal(saved.completedAudits[4].identity, "licenciatura en enfermeria:2016");
  assert.equal(saved.completedAudits[5].identity, "doctor en medicina:2008");
  assert.equal(saved.completedAudits[6].identity, "licenciatura en educacion fisica:2017");
  assert.equal(saved.completedAudits[7].identity, "tecnicatura en deportes:2007");
  assert.equal(saved.completedAudits[8].identity, "licenciatura en psicologia:2013");
  assert.equal(saved.completedAudits[9].identity, "diplomatura en musica:1994");
  assert.equal(saved.completedAudits[10].identity, "licenciatura en trabajo social:2009");
  assert.equal(saved.completedAudits[11].identity, "escalonada de enfermeria:2001");
  assert.equal(saved.completedAudits[12].identity, "licenciatura en enfermeria profesionalizacion de auxiliar:1999");
  assert.equal(saved.completedAudits[13].identity, "archivologia:2012");
  assert.equal(saved.completedAudits[14].identity, "bibliotecologia:2012");
  assert.equal(saved.completedAudits[15].identity, "lic en ingenieria biologica:2013");
  assert.equal(saved.completedAudits[16].identity, "licenciatura en fisioterapia:2006");
  assert.equal(saved.completedAudits[17].identity, "licenciatura en imagenologia:2006");
  assert.equal(saved.completedAudits[18].identity, "licenciatura en instrumentacion quirurgica:2006");
  assert.equal(saved.completedAudits[19].identity, "licenciatura en laboratorio clinico:2006");
  assert.equal(saved.completedAudits[20].identity, "licenciatura en psicomotricidad:2006");
  assert.equal(saved.completedAudits[21].identity, "tecnicatura en anatomia patologica:2006");
  assert.equal(saved.completedAudits[22].identity, "tecnicatura en hemoterapia:2006");
  assert.equal(saved.completedAudits[23].identity, "tecnicatura en podologia:2006");
  assert.equal(saved.completedAudits[24].identity, "tecnicatura en radioterapia:2006");
  assert.equal(saved.completedAudits[25].identity, "tecnicatura en salud ocupacional:2006");
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
  assert.equal(rebuilt.queue[0].priority, "insufficient-regional-content");
  assert.equal(rebuilt.queue[0].identity, "tecnologo quimico:2025");
});
