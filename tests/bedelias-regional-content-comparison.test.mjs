import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildRegionalContentComparison,
  curriculumFingerprint,
} from "../scripts/bedelias-regional-content-comparison.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const regionalManifest = readJson("data/bedelias/inventory/regional-offerings.json");
const comparison = readJson("data/bedelias/inventory/regional-content-comparison.json");

test("la huella curricular ignora procedencia y conserva diferencias académicas", () => {
  const base = {
    source: { extractedAt: "a" },
    plan: { metadata: { minCredits: 10 }, courses: [{ code: "A", name: "Curso", credits: 5 }] },
    prerequisites: [],
  };
  assert.equal(curriculumFingerprint(base).hash, curriculumFingerprint({ ...base, source: { extractedAt: "b" } }).hash);
  assert.notEqual(
    curriculumFingerprint(base).hash,
    curriculumFingerprint({ ...base, plan: { ...base.plan, courses: [{ code: "A", name: "Curso", credits: 6 }] } }).hash,
  );
});

test("no transforma coincidencias de huella en equivalencias oficiales", async () => {
  const rebuilt = await buildRegionalContentComparison(regionalManifest, {
    generatedAt: comparison.generatedAt,
  });
  assert.deepEqual(rebuilt.counts, comparison.counts);
  assert.equal(comparison.counts.candidateIdentities, 43);
  assert.equal(comparison.counts.regionalOffers, 57);
  assert.equal(comparison.policy.contentMatchIsNotOfficialEquivalence, true);
  assert.ok(comparison.plans.every((plan) => !plan.comparisons.some((entry) => entry.status === "official-equivalence")));
});
