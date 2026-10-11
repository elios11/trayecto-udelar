import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const source = await readJson("data/cur/tecnologo-madera-2011.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cur-tecnologo-en-madera-2012.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const reviews = await readJson("data/official-trajectories/reviews.json");

test("versiona las cuatro fuentes y la inspección visual completa de D03ah", () => {
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    assert.equal(source.fingerprint.sourceHashes[sourceId], digest(portion));
    assert.equal(source.sources.find(({ id }) => id === sourceId).contentHash, digest(portion));
  }
  const pdf = source.sources.find(({ id }) => id === "fing-plan-copy");
  assert.equal(pdf.rawPdfContentHash, "sha256:afef87b689b0878f58708b9d24ac0ea3a62d3ec80c000e778d4081a031b14566");
  assert.deepEqual(pdf.visuallyInspectedPdfPages, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(source.sources.find(({ id }) => id === "dgetp-current-grid-2024").publishedAt, "2024-06-21");
  assert.equal(source.publication.currentAtReview, true);
});

test("reproduce exactamente las 54 ubicaciones de los seis semestres", () => {
  const expected = source.trajectories[0];
  const actual = projection.publishedPathways.bedelias;
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  const actualSourceIds = actual.periods.map((period) => ({
    label: period.label,
    courseIds: period.courseIds.map((id) => {
      const course = courseById.get(id);
      return course.bedeliasCode ?? course.sourceCourseId;
    }),
  }));

  assert.deepEqual(actualSourceIds, expected.periods.map(({ label, courseIds }) => ({ label, courseIds })));
  assert.deepEqual(actual.periods.map(({ courseIds }) => courseIds.length), [8, 8, 9, 9, 11, 9]);
  assert.equal(new Set(actual.periods.flatMap(({ courseIds }) => courseIds)).size, 54);
  assert.equal(actual.periods.flatMap(({ courseIds }) => courseIds)
    .reduce((sum, id) => sum + courseById.get(id).credits, 0), 342);
  assert.match(actual.description, /no se exige aprobar las 54 ubicaciones/i);
});

test("preserva la frontera de autoridad y los conflictos de créditos", () => {
  const verified = projection.courses.filter(({ authorityStatus, dataStatus }) => authorityStatus === "verified" && dataStatus !== "manual-validation");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  assert.equal(verified.length, 54);
  assert.equal(candidates.length, 10);
  assert.deepEqual(candidates.map(({ bedeliasCode }) => bedeliasCode).sort(), [...source.bedeliasComparison.candidateSourceCourseIds].sort());
  assert.equal(projection.courses.find(({ sourceCourseId }) => sourceCourseId === "marketing-plan-2011").credits, 5);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "TIMEM").credits, 0);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "ETC4").credits, 6);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "SE4").credits, 7);
  assert.equal(source.authorityPolicy.annexIvExamplesBecomeProfiles, false);
  assert.deepEqual(Object.keys(projection.publishedPathways), ["bedelias"]);
});

test("mantiene mínimos, actividades obligatorias y validación fuera de los períodos", () => {
  const credential = projection.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements, [
    { nodeId: "basic-mathematics", minCredits: 22 },
    { nodeId: "basic-physical", minCredits: 27 },
    { nodeId: "basic-biochemical", minCredits: 45 },
    { nodeId: "technology", minCredits: 110 },
    { nodeId: "technology-common", minCredits: 66 },
    { nodeId: "complementary", minCredits: 34 },
  ]);
  assert.deepEqual(credential.requiredCourseGroups.map(({ id, minCompleted }) => [id, minCompleted]), [
    ["mandatory-introductory-workshop", 1],
    ["mandatory-common-technology", 10],
    ["mandatory-complementary-activities", 4],
    ["validacion-final-plan", 1],
  ]);
  assert.ok(projection.publishedPathways.bedelias.periods.every(({ label }) => label !== "Validación de egreso"));
});

test("cierra el inventario como trayectoria oficial reproducida con 54 de 54", () => {
  const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  assert.equal(review.state, "official-trajectory-reproduced");
  assert.equal(review.projectionMechanism, "official-periods");
  assert.equal(review.evidence.compareCoursePlacements, true);
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.evidence.expectedCoursePlacements, 54);
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 54);
});
