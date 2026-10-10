import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const source = await readJson("data/cur/educacion-fisica-practicas-educativas-2014.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cur-licenciatura-en-educacion-fisica-2014.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const reviews = await readJson("data/official-trajectories/reviews.json");

test("versiona la autoridad y la huella reproducible de D03ag", () => {
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  assert.equal(source.reviewedAt, "2026-10-09");
  assert.deepEqual(source.scope.campuses, [{ id: "rivera", label: "Rivera" }]);
  assert.equal(source.publication.approval.resolution, "3-CDC-24-02-2015");
  assert.equal(source.sources.find(({ id }) => id === "programa-conjunto-2014").contentHash,
    "sha256:e689573a997b8ac05d48c2c8f9e43d7fc3c5570d6a536c0bc2910401634c6a00");
  assert.equal(source.sources.find(({ id }) => id === "impo-aprobacion-2015").contentHash,
    "sha256:2b3ff765e1e952f7cf29d5542b183a4a29400ade6a1fd97c85e2c5d0b066b675");
  assert.ok(source.sources.some(({ id }) => id === "isef-oferta-2026"));
  assert.equal(source.authorityPolicy.evaIsCurriculumAuthority, false);
});

test("reproduce ocho semestres y tres actividades anuales sin duplicar créditos", () => {
  const sourceTrajectory = source.trajectories[0];
  const projectedTrajectory = projection.publishedPathways.bedelias;
  assert.equal(sourceTrajectory.periods.length, 11);
  assert.equal(source.rows.filter(({ annual }) => annual).length, 3);
  assert.equal(source.rows.length, 33);
  assert.equal(new Set(source.rows.map(({ sourceCourseId }) => sourceCourseId)).size, 33);
  assert.equal(source.rows.reduce((sum, row) => sum + row.credits, 0), 304);

  const projectedCourseById = new Map(projection.courses.map((course) => [course.id, course]));
  const normalizedProjection = projectedTrajectory.periods.map((period) => ({
    label: period.label,
    courseIds: period.courseIds.map((id) => projectedCourseById.get(id).bedeliasCode),
  }));
  assert.deepEqual(normalizedProjection, sourceTrajectory.periods.map(({ label, courseIds }) => ({ label, courseIds })));
  assert.equal(projectedTrajectory.periods.flatMap(({ courseIds }) => courseIds).length, 33);
  assert.equal(new Set(projectedTrajectory.periods.flatMap(({ courseIds }) => courseIds)).size, 33);
});

test("cierra 304 + 56 por áreas y mantiene candidatas fuera del catálogo normal", () => {
  const expectedCredits = {
    sports: 64,
    education: 130,
    "body-practices": 34,
    health: 50,
    leisure: 26,
    optional: 56,
  };
  const credential = projection.creditStructure.credentials[0];
  assert.deepEqual(
    Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits])),
    expectedCredits,
  );
  assert.equal(Object.values(expectedCredits).reduce((sum, credits) => sum + credits, 0), 360);

  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const publishedIds = new Set([
    ...projection.publishedPathways.bedelias.periods.flatMap(({ courseIds }) => courseIds),
    ...(projection.publishedPathways.bedelias.catalogCourseIds ?? []),
  ]);
  assert.equal(candidates.length, 406);
  assert.equal(source.bedeliasComparison.candidateRetainedCount, 406);
  assert.ok(candidates.every(({ id }) => !publishedIds.has(id)));
});

test("conserva la validación manual como requisito y no como período", () => {
  const validation = projection.creditStructure.credentials[0].requiredCourseGroups
    .find(({ id }) => id === "validacion-final-plan");
  assert.equal(validation.minCompleted, 1);
  assert.match(validation.label, /40% vinculados con Educación/i);
  assert.match(validation.label, /10 créditos de extensión/i);
  assert.ok(projection.publishedPathways.bedelias.periods.every(({ label }) => label !== "Validación de egreso"));
});

test("marca el inventario como trayectoria oficial reproducida con 33 de 33", () => {
  const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  assert.equal(review.state, "official-trajectory-reproduced");
  assert.equal(review.evidence.kind, "audited-projection");
  assert.equal(review.evidence.compareCoursePlacements, true);
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.evidence.expectedCoursePlacements, 33);
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 33);
});
