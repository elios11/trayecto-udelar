import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";
import { validateMedicalPhysicsProjection, validateMedicalPhysicsSource } from "../scripts/build-fcien-fisica-medica-2025.mjs";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const source = await readJson("data/fcien/fisica-medica-2025-trajectory-review.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-fisica-medica-2025.json");
const projection = await readJson(`app/data/bedelias-generated/${source.planId}.json`);
const inventory = await readJson("data/official-trajectories/inventory.json");
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const entry = inventory.plans.find(({ planId }) => planId === source.planId);

test("Física Médica conserva evidencia normalizada y regeneración offline", () => {
  validateMedicalPhysicsSource(source, snapshot);
  assert.equal(source.regeneration.command, "node scripts/build-fcien-fisica-medica-2025.mjs");
  assert.equal(source.regeneration.networkRequired, false);
  assert.equal(source.regeneration.rawFilesRequired, false);
  const changed = structuredClone(source);
  changed.sourcePortions["suggested-2025"].semesters[0][0] = "Curso distinto";
  assert.throws(() => validateMedicalPhysicsSource(changed, snapshot));
});

test("Currícula reproduce ocho semestres y mantiene 36 ubicaciones sin candidatas", () => {
  validateMedicalPhysicsProjection(source, projection, entry);
  const presentation = buildRegisteredPlanPresentation("plan-individual", projection);
  assert.equal(presentation.generated, false);
  assert.deepEqual(presentation.periods.map(({ courseIds }) => courseIds.length), [4, 4, 4, 7, 4, 5, 4, 4]);
  assert.equal(presentation.courses.filter(({ provisional }) => provisional).length, 0);
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length, 13);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "FI41").authorityStatus, "candidate");
});

test("alternativa del sexto y optativas no se convierten en dos obligaciones ni inventan créditos", () => {
  for (const code of ["MA069", "FI57", "FI44", "FI273"]) {
    const course = projection.courses.find(({ bedeliasCode }) => bedeliasCode === code);
    assert.equal(course.authorityStatus, "verified");
    assert.equal(course.elective, true);
  }
  assert.ok(source.sourceOnlyRows.every(({ identityKey }) => projection.courses.some(({ sourceCourseId, credits, creditsPublished }) => sourceCourseId === identityKey && credits === 0 && creditsPublished === false)));
  assert.equal(source.sourcePortions["suggested-2025"].technicalCodesPublished, false);
  assert.equal(projection.creditStructure.credentials[0].nodeRequirements.length, 8);
});

test("auditoría e inventario señalan la trayectoria oficial y conservan el plan compartido", () => {
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  assert.equal(audit.conclusion.trajectoryStatus, "official-trajectory-reproduced");
  assert.equal(audit.officialPlan.curriculum.sourceDataPath, "data/fcien/fisica-medica-2025-trajectory-review.json");
  assert.equal(review.state, "official-trajectory-reproduced");
  assert.equal(entry.evidence.matchedCoursePlacements, 36);
  assert.equal(entry.catalogPlacements.length, 1);
  assert.deepEqual(projection.plan.sharedWith, ["FACULTAD DE MEDICINA"]);
  assert.equal(projection.creditStructure.credentials[0].nodeRequirements.at(-1).minCredits, 10);
  assert.ok(!inventory.pendingQueue.plans.some(({ planId }) => planId === source.planId));
});
