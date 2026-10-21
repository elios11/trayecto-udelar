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

test("la página documental actual conserva el enlace a la grilla 2021 sin declarar revisión visual", () => {
  assert.equal(evidence.documentPageUrl, "https://www.fder.edu.uy/node/3553");
  assert.ok(entry.officialSources.some(({ url }) => url === evidence.curriculumUrl));
  assert.equal(evidence.visualReview.status, "unavailable");
  assert.equal(entry.state, "research-pending");
  assert.match(entry.evidence.reason, /2015|Introducción a la Investigación/);
});

test("el contraste offline de las ubicaciones es reproducible y conserva el duplicado pendiente", async () => {
  assert.deepEqual(await buildRriiEvidenceValidation({ write: false }), validation);
  assert.equal(validation.checks.semesterCount, 8);
  assert.equal(validation.checks.semestersMatchPriorAudit, true);
  assert.equal(validation.checks.intermediateCreditsMatch, true);
  assert.equal(validation.checks.degreeCreditsMatch, true);
  assert.equal(validation.checks.graduationModeCreditsMatch, true);
  assert.deepEqual(validation.checks.introductionToResearch.projectedCodes, ["2015", "2015I"]);
  assert.equal(validation.checks.introductionToResearch.sourceOccurrences, 1);
  assert.equal(validation.checks.introductionToResearch.duplicateUnresolved, true);
  assert.equal(validation.decision, "research-pending");
});
