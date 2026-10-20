import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateGeographyProjection, validateGeographySource } from "../scripts/build-fcien-geografia-2018.mjs";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const source = await readJson("data/fcien/geografia-2018-trajectory-review.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-geografia-2018.json");
const projection = await readJson(`app/data/bedelias-generated/${source.planId}.json`);
const inventory = await readJson("data/official-trajectories/inventory.json");
const entry = inventory.plans.find(({ planId }) => planId === source.planId);
const reviews = await readJson("data/official-trajectories/reviews.json");
const registry = await readJson("data/bedelias/audits/official-source-audits.json");

test("Geografía 2018 conserva evidencia normalizada y regeneración offline", () => {
  validateGeographySource(source, snapshot);
  assert.deepEqual(source.regeneration, { command: "node scripts/build-fcien-geografia-2018.mjs", networkRequired: false, rawFilesRequired: false });
  const changed = structuredClone(source);
  changed.sourcePortions["plan-2018"].coreAreaMinimums[0] += 1;
  assert.throws(() => validateGeographySource(changed, snapshot), /Huella/);
});

test("las áreas, programas aislados y el Plan 2003 no se convierten en semestres 2018", () => {
  validateGeographyProjection(source, projection, entry);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  assert.equal(review.state, "research-pending");
  assert.equal(review.evidence.ordinalCoursePeriodRows, 0);
  assert.equal(review.evidence.promotedCourseCount, 0);
  assert.equal(review.evidence.candidateRetainedCount, 167);
  assert.equal(source.sourcePortions["historical-plan-2003"].applicableToPlan2018, false);
  assert.ok(inventory.pendingQueue.plans.some(({ planId }) => planId === source.planId));
});

test("el reglamento EVA contradictorio no sustituye el Plan aprobado ni promueve la grilla", () => {
  const regulation = source.sourcePortions["eva-reglamento-2021"];
  assert.deepEqual(regulation.suggestedSemesterTables.map(({ number }) => number), [2, 3]);
  assert.equal(regulation.regularCoursesTable, 4);
  assert.equal(regulation.approvalResolutionVerified, false);
  assert.equal(regulation.usedForCurriculumProjection, false);
  assert.equal(regulation.creditDistribution.optional + regulation.creditDistribution.eligible, 100);
  assert.equal(regulation.plan2018ApprovedDistribution.optional, 90);
  assert.equal(regulation.creditDistribution.thesis, 30);
  assert.equal(projection.creditStructure.credentials[0].nodeRequirements.find(({ nodeId }) => nodeId === "thesis").minCredits, 40);
  assert.equal(entry.evidence.ordinalCoursePeriodRows, 0);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  assert.ok(review.conflictNotes.some((note) => /220 básicos.*80 optativos.*20 elegibles/.test(note)));
});

test("conserva título, mínimos, optativas, extensión, tesina y validación humana", () => {
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.trajectoryStatus, "research-pending");
  assert.equal(audit.officialPlan.curriculum.sourceDataPath, entry.evidence.sourceDataPath);
  assert.deepEqual(projection.creditStructure.credentials[0].requiredCourseGroups.map(({ id, minCompleted, courseIds }) => ({ id, minCompleted, courseIds })), [{ id: "validacion-final-plan", minCompleted: 1, courseIds: ["fcien-validacion-final-plan"] }]);
  assert.match(projection.plan.notice, /recorrido orientativo generado por Trayecto/);
  assert.match(projection.plan.notice, /Comisión debe avalar/);
});

test("bloquea promociones y cambios de carga sin nueva evidencia oficial", () => {
  const promoted = structuredClone(projection);
  promoted.courses.find(({ authorityStatus }) => authorityStatus === "candidate").authorityStatus = "verified";
  assert.throws(() => validateGeographyProjection(source, promoted, entry), /No alterar IDs/);
  const changedLoad = structuredClone(projection);
  changedLoad.courses[0].credits += 1;
  assert.throws(() => validateGeographyProjection(source, changedLoad, entry), /No alterar IDs/);
});
