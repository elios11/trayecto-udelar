import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation, GENERATED_PATHWAY_LABEL } from "../app/registered-plan-courses.mjs";
import { validateMathematicsProjection, validateMathematicsSource } from "../scripts/build-fcien-matematica-2014.mjs";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const source = await readJson("data/fcien/matematica-2014-trajectory-review.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-matematica-2014.json");
const projection = await readJson(`app/data/bedelias-generated/${source.planId}.json`);
const inventory = await readJson("data/official-trajectories/inventory.json");
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const entry = inventory.plans.find(({ planId }) => planId === source.planId);

test("Matemática conserva evidencia versionada, huella y regeneración sin red", () => {
  validateMathematicsSource(source, snapshot);
  assert.equal(source.regeneration.command, "node scripts/build-fcien-matematica-2014.mjs");
  assert.equal(source.regeneration.networkRequired, false);
  assert.equal(source.regeneration.rawFilesRequired, false);
  const changed = structuredClone(source);
  changed.sourcePortions["historical-example"].semesters[0][0] = "Curso no publicado";
  assert.throws(() => validateMathematicsSource(changed, snapshot));
});

test("ejemplo de ingreso 2017 y oferta 2025-2029 no se presentan como guía actual", () => {
  validateMathematicsProjection(source, projection, entry);
  assert.equal(source.sourcePortions["historical-example"].semesters.flat().length, 29);
  assert.equal(source.sourcePortions["current-stable-offer"].rows.length, 26);
  assert.deepEqual(source.sourcePortions["current-stable-offer"].ordinalCoursePeriodRows, []);
  for (const id of source.publication.pathwayIds) {
    const presentation = buildRegisteredPlanPresentation(id, projection);
    assert.equal(presentation.generated, true);
    assert.equal(presentation.label, GENERATED_PATHWAY_LABEL);
    assert.ok(presentation.periods.length > 0);
  }
});

test("auditoría e inventario conservan plan, mínimos y candidatos sin promoción", () => {
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  assert.equal(audit.conclusion.trajectoryStatus, "research-pending");
  assert.equal(audit.conclusion.trajectorySourceDataPath, "data/fcien/matematica-2014-trajectory-review.json");
  assert.match(audit.uiNotice, /2017-2020/);
  assert.equal(review.state, "research-pending");
  assert.equal(review.evidence.historicalExampleCoursePlacements, 29);
  assert.equal(review.evidence.currentRegularCourseRows, 26);
  assert.ok(review.conflictNotes.some((note) => note.startsWith("durationMonths:")));
  assert.ok(review.conflictNotes.some((note) => note.startsWith("dataScienceCertification:")));
  assert.equal(entry.state, "research-pending");
  assert.equal(entry.evidence.promotedCourseCount, 0);
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.creditStructure.credentials.length, 6);
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length, 366);
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified").length, 1);
  assert.ok(!projection.pathways["perfil-matematica"].periods.some(({ label }) => /semestre/i.test(label)));
});
