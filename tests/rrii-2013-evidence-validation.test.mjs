import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRriiEvidenceValidation } from "../scripts/verify-rrii-2013-evidence.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const evidence = await readJson("data/fder/rrii-2013-2021-evidence.json");
const validation = await readJson("data/fder/rrii-2013-2021-validation.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const entry = inventory.plans.find(({ planId }) => planId === evidence.planId);

test("se cotejaron las dos páginas de la grilla 2021", () => {
  assert.equal(evidence.documentPageUrl, "https://www.fder.edu.uy/node/3553");
  assert.ok(entry.officialSources.some(({ url }) => url === evidence.curriculumUrl));
  assert.equal(evidence.visualReview.status, "verified");
  assert.equal(evidence.visualReview.pageCount, 2);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.ok(entry.officialSources.some(({ url }) => url === evidence.currentResearchCodeUrl));
});

test("el contraste offline reproduce una introducción a la investigación", async () => {
  assert.deepEqual(await buildRriiEvidenceValidation({ write: false }), validation);
  assert.equal(validation.checks.semesterCount, 8);
  assert.equal(validation.checks.semestersMatchPriorAudit, true);
  assert.equal(validation.checks.intermediateCreditsMatch, true);
  assert.equal(validation.checks.degreeCreditsMatch, true);
  assert.equal(validation.checks.graduationModeCreditsMatch, true);
  assert.deepEqual(validation.checks.introductionToResearch.projectedCodes, ["2015"]);
  assert.equal(validation.checks.introductionToResearch.sourceOccurrences, 1);
  assert.equal(validation.checks.introductionToResearch.duplicateUnresolved, false);
  assert.equal(validation.decision, "official-trajectory-reproduced");
});
