import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildRegisteredPlanPresentation,
  GENERATED_PATHWAY_LABEL,
} from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-astronomia-2016.json");
const source = await readJson("data/fcien/astronomia-2016-trajectory-review.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-astronomia-2016.json");
const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
const review = reviews.reviews.find(({ planId }) => planId === source.planId);
const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
const requirements = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));

test("conserva un checkpoint reproducible sin convertir duración estimada en períodos", () => {
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    assert.equal(source.fingerprint.sourceHashes[sourceId], digest(portion));
  }
  assert.equal(source.sources.find(({ id }) => id === "modified-plan-2023-link").accessStatus, "http-404");
  assert.equal(source.publication.trajectoryStatus, "research-pending");
  assert.equal(source.trajectoryConclusion.durationIsNotPeriodEvidence, true);
  assert.deepEqual(source.trajectoryConclusion.publicTemporalPeriods, []);
  assert.equal(source.scope.officialTemporalPeriodsReproduced, 0);
  assert.equal(review.state, "research-pending");
  assert.equal(inventoryEntry.state, "research-pending");
  assert.equal(review.evidence.sourceDataPath, "data/fcien/astronomia-2016-trajectory-review.json");
  assert.equal(inventoryEntry.evidence.publicTemporalPeriodCount, 0);
});

test("normaliza el Plan 2016 flexible y sus 360 créditos en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.trajectoryStatus, "research-pending");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Astronomía", 48, 360]);
  assert.deepEqual(plan.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "formacion-personalizada",
  }]);
  assert.equal(snapshot.plan.metadata.minCredits, 360);
  assert.deepEqual(Object.keys(plan.pathways), ["formacion-personalizada"]);

  const credential = plan.creditStructure.credentials[0];
  const rootRequirements = credential.nodeRequirements.filter(({ nodeId }) => requirements.get(nodeId).parentId === "plan-total");
  assert.deepEqual(rootRequirements, [
    { nodeId: "mathematics", minCredits: 70 },
    { nodeId: "physics", minCredits: 100 },
    { nodeId: "astronomy", minCredits: 90 },
    { nodeId: "computational-methods", minCredits: 20 },
    { nodeId: "social-human-sciences", minCredits: 8 },
    { nodeId: "training-experiences", minCredits: 22 },
    { nodeId: "flexible", minCredits: 50 },
  ]);
  assert.equal(rootRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
  assert.deepEqual(
    credential.nodeRequirements.filter(({ nodeId }) => requirements.get(nodeId).parentId === "training-experiences"),
    [{ nodeId: "research-initiation", minCredits: 12 }, { nodeId: "training-practice", minCredits: 10 }],
  );
  assert.deepEqual(
    credential.nodeRequirements.filter(({ nodeId }) => requirements.get(nodeId).parentId === "flexible"),
    [{ nodeId: "optional", minCredits: 30 }, { nodeId: "elective", minCredits: 10 }],
  );
});

test("mantiene una frontera estricta entre programas cotejados y catálogo candidato", () => {
  const verified = plan.courses.filter(({ authorityStatus, curricularBlock }) => (
    authorityStatus === "verified" && curricularBlock !== true
  ));
  const validationBlocks = plan.courses.filter(({ authorityStatus, curricularBlock }) => (
    authorityStatus === "verified" && curricularBlock === true
  ));
  const candidates = plan.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  assert.deepEqual(verified.map(({ bedeliasCode }) => bedeliasCode).sort(), ["AS20", "AS28"]);
  assert.equal(validationBlocks.length, 1);
  assert.equal(candidates.length, 184);
  assert.equal(plan.courses.length, 187);
  assert.deepEqual(
    ["FI182", "BG802", "BG928", "FI189"].map((code) => plan.courses.find(({ bedeliasCode }) => bedeliasCode === code).authorityStatus),
    ["candidate", "candidate", "candidate", "candidate"],
  );
});

test("presenta sólo un fallback generado no temporal y no acredita candidatas", () => {
  const pathway = plan.pathways["formacion-personalizada"];
  const presentation = buildRegisteredPlanPresentation("formacion-personalizada", plan);
  assert.equal(pathway.generatedFallback, true);
  assert.equal(presentation.generated, true);
  assert.equal(presentation.label, GENERATED_PATHWAY_LABEL);
  assert.equal(presentation.periods.length, 1);
  assert.equal(presentation.periods.some(({ label }) => /semestre|año/i.test(label)), false);
  assert.deepEqual(
    presentation.periods.flatMap(({ courseIds }) => courseIds).sort(),
    pathway.generatedFallbackCourseIds.toSorted(),
  );

  const candidateCourses = presentation.courses.filter(({ provisional }) => provisional === true);
  assert.equal(candidateCourses.length, 184);
  assert.equal(candidateCourses.every(({ eligibleRequirementIds, creditAllocations }) => (
    eligibleRequirementIds.length === 0 && creditAllocations.length === 0
  )), true);
});
