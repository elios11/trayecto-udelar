import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation, GENERATED_PATHWAY_LABEL } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const digestSortedIds = (courses) => digest(courses.map(({ id }) => id).sort());

const source = await readJson("data/cur/recursos-naturales-rivera-trajectory-review.json");
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const projections = new Map(await Promise.all(source.plans.map(async (plan) => [
  plan.planId,
  await readJson(`app/data/bedelias-generated/${plan.planId}.json`),
])));

test("conserva huellas reproducibles de cada porción institucional normalizada", () => {
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    const expected = digest(portion);
    assert.equal(source.fingerprint.sourceHashes[sourceId], expected);
    assert.equal(source.sources.find(({ id }) => id === sourceId).contentHash, expected);
  }
});

test("identifica recorridos por cohorte sin inventar filas curso-período", () => {
  const licPortion = source.sourcePortions["colibri-cohort-trajectory-2023"];
  assert.match(licPortion.implementation, /cada generación recibe una trayectoria sugerida/i);
  assert.match(licPortion.temporalCoverage, /no publica sus filas, cursos ni períodos/i);

  const technicalPlan = source.sourcePortions["impo-tec-plan-2011"];
  const implementation = source.sourcePortions["cse-jornada-2017"];
  assert.match(technicalPlan.courseStatus, /ejemplos ilustrativos/i);
  assert.match(implementation.implementation, /calendarios organizados por años/i);
  assert.match(implementation.temporalCoverage, /no relaciona materias concretas/i);

  for (const plan of source.plans) {
    assert.equal(plan.trajectoryConclusion.state, "official-trajectory-identified-pending");
    assert.equal(plan.trajectoryConclusion.absenceExplicitlyDocumented, false);
    assert.match(plan.trajectoryConclusion.gap, /no se halló una publicación oficial/i);
  }
});

test("mantiene títulos, planes y progreso separados", () => {
  const [lic, tec] = source.plans;
  assert.notEqual(lic.planId, tec.planId);
  assert.notEqual(lic.auditIdentity, tec.auditIdentity);
  assert.notEqual(lic.degreeTitle, tec.degreeTitle);
  assert.equal(lic.progressSharedWithOtherPlan, false);
  assert.equal(tec.progressSharedWithOtherPlan, false);
  assert.equal(projections.get(lic.planId).plan.degreeTitle, lic.degreeTitle);
  assert.equal(projections.get(tec.planId).plan.degreeTitle, tec.degreeTitle);

  for (const plan of source.plans) {
    const audit = audits.audits.find(({ identity }) => identity === plan.auditIdentity);
    assert.equal(audit.conclusion.trajectoryStatus, "official-trajectory-identified-pending");
    assert.equal(audit.conclusion.siteSpecificTrajectoryIdentified, true);
    assert.equal(audit.officialPlan.curriculum.generatedFallback, true);
    assert.equal(audit.officialPlan.curriculum.sourceDataPath, "data/cur/recursos-naturales-rivera-trajectory-review.json");
    assert.match(audit.uiNotice, /recorrido orientativo generado, no institucional/i);
  }
});

test("conserva la frontera candidata y el catálogo del planificador sin computar progreso provisional", () => {
  for (const plan of source.plans) {
    const projection = projections.get(plan.planId);
    const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
    const realCourses = projection.courses.filter(({ dataStatus }) => dataStatus !== "manual-validation");
    assert.equal(candidates.length, plan.bedeliasBaseline.candidateEntryCount);
    assert.equal(digestSortedIds(candidates), plan.bedeliasBaseline.candidateCourseIdsHash);
    assert.equal(realCourses.length, plan.bedeliasBaseline.realCurricularEntryCount);
    assert.equal(digestSortedIds(realCourses), plan.bedeliasBaseline.realCurricularCourseIdsHash);

    assert.equal(projection.pathways.bedelias.generatedFallback, true);
    assert.equal(projection.publishedPathways.bedelias.generatedFallback, true);
    const presentation = buildRegisteredPlanPresentation("bedelias", projection);
    assert.equal(presentation.generated, true);
    assert.equal(presentation.label, GENERATED_PATHWAY_LABEL);
    assert.equal(presentation.courses.length, plan.bedeliasBaseline.realCurricularEntryCount);
    assert.ok(presentation.periods.every(({ label }) => !/semestre|año/i.test(label)));
    const provisional = presentation.courses.filter((course) => course.provisional);
    assert.equal(provisional.length, plan.bedeliasBaseline.candidateEntryCount);
    assert.ok(provisional.every((course) => course.eligibleRequirementIds.length === 0
      && course.creditAllocations.length === 0));
  }
});

test("registra ambos planes como fuente identificada pendiente con brecha precisa", () => {
  for (const plan of source.plans) {
    const review = reviews.reviews.find(({ planId }) => plan.planId === planId);
    const inventoryEntry = inventory.plans.find(({ planId }) => plan.planId === planId);
    assert.equal(review.state, "official-trajectory-identified-pending");
    assert.equal(review.projectionMechanism, "official-flexible-structure");
    assert.equal(review.evidence.kind, "identified-source-pending-reconciliation");
    assert.match(review.evidence.reason, /no se halló una publicación oficial/i);
    assert.equal(inventoryEntry.state, review.state);
    assert.equal(inventoryEntry.currentProjection.primary, review.projectionMechanism);
    assert.equal(inventoryEntry.evidence.sourceDataPath, "data/cur/recursos-naturales-rivera-trajectory-review.json");
  }
});
