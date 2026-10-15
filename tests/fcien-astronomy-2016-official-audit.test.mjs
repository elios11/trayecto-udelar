import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const source = await readJson("data/fcien/astronomia-2016-trajectory-review.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-astronomia-2016.json");
const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
const review = reviews.reviews.find(({ planId }) => planId === source.planId);
const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
const requirements = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));

test("versiona la trayectoria sugerida 2023 con la reserva de acceso", () => {
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    assert.equal(source.fingerprint.sourceHashes[sourceId], digest(portion));
  }
  assert.equal(source.sources.find(({ id }) => id === "modified-plan-2023-indexed").accessStatus, "http-404-search-index-complete");
  assert.equal(source.sources.find(({ id }) => id === "department-plan-copy").accessStatus, "server-no-response");
  assert.equal(source.publication.trajectoryStatus, "official-trajectory-reproduced");
  assert.equal(source.trajectoryConclusion.durationIsNotPeriodEvidence, true);
  assert.equal(source.trajectoryConclusion.publicTemporalPeriods.length, 8);
  assert.equal(review.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.evidence.pathways[0].periodCount, 8);
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 32);
});

test("conserva el Plan 2016 flexible, 360 créditos y un único progreso", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.trajectoryStatus, "official-trajectory-reproduced");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Astronomía", 48, 360]);
  assert.deepEqual(plan.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "formacion-personalizada",
  }]);
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

test("reproduce ocho semestres y cada ubicación nominal del Anexo 2", () => {
  const pathway = plan.pathways["formacion-personalizada"];
  const presentation = buildRegisteredPlanPresentation("formacion-personalizada", plan);
  assert.equal(pathway.generatedFallback, undefined);
  assert.equal(presentation.generated, false);
  assert.equal(presentation.label, "Trayectoria oficial");
  assert.deepEqual(presentation.periods.map(({ label }) => label), source.trajectories[0].periods.map(({ label }) => label));
  assert.equal(presentation.periods.length, 8);
  assert.equal(presentation.periods.every(({ courseIds }) => courseIds.length === 4), true);
  assert.equal(presentation.periods.flatMap(({ courseIds }) => courseIds).length, 32);

  const projectedBySource = new Map(plan.courses.flatMap((course) => [
    [course.bedeliasCode, course.id],
    [course.sourceCourseId, course.id],
  ].filter(([key]) => key)));
  for (const [periodIndex, period] of source.trajectories[0].periods.entries()) {
    assert.deepEqual(
      pathway.periods[periodIndex].courseIds,
      period.courseIds.map((sourceId) => projectedBySource.get(sourceId)),
    );
  }
});

test("mantiene frontera estricta entre correspondencias, sólo-fuente y candidatas", () => {
  const matched = plan.courses.filter(({ authorityStatus, bedeliasCode }) => authorityStatus === "verified" && bedeliasCode);
  const sourceOnly = plan.courses.filter(({ authorityStatus, sourceCourseId }) => authorityStatus === "verified" && sourceCourseId);
  const candidates = plan.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  assert.equal(matched.length, 26);
  assert.deepEqual(matched.map(({ bedeliasCode }) => bedeliasCode).toSorted(), source.authorityPolicy.verifiedSourceCourseIds.toSorted());
  assert.equal(sourceOnly.length, 6);
  assert.deepEqual(sourceOnly.map(({ sourceCourseId }) => sourceCourseId).toSorted(), source.authorityPolicy.verifiedSourceOnlyIdentityKeys.toSorted());
  assert.equal(sourceOnly.every((course) => !course.bedeliasCode && course.creditsPublished === false), true);
  assert.equal(candidates.length, 160);
  assert.equal(plan.courses.length, 193);
  assert.equal(matched.find(({ bedeliasCode }) => bedeliasCode === "AS20").id, "fcien-as20-2");
  assert.equal(matched.find(({ bedeliasCode }) => bedeliasCode === "AS28").id, "fcien-as28-2");
  assert.equal(plan.pathways["formacion-personalizada"].periods.flatMap(({ courseIds }) => courseIds)
    .some((courseId) => candidates.some(({ id }) => id === courseId)), false);
});

test("conserva bloques flexibles separados sin acreditar cargas inventadas", () => {
  const flexible = plan.courses.filter(({ catalogRole }) => catalogRole === "official-flexible-slot");
  assert.equal(flexible.length, 3);
  assert.equal(flexible.every(({ credits, creditsPublished, curricularBlock, eligibleRequirementIds }) => (
    credits === 0
      && creditsPublished === false
      && curricularBlock === true
      && eligibleRequirementIds.includes("flexible")
      && eligibleRequirementIds.includes("optional")
      && eligibleRequirementIds.includes("elective")
  )), true);

  const presentation = buildRegisteredPlanPresentation("formacion-personalizada", plan);
  assert.equal(presentation.courses.some(({ provisional }) => provisional === true), false);
  assert.equal(presentation.courses.some(({ id }) => plan.courses.some((course) => (
    course.id === id && course.authorityStatus === "candidate"
  ))), false);
});
