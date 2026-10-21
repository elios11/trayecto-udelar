import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const source = await readJson("data/fartes/musica-2005.json");
const snapshot = await readJson("data/bedelias/fartes-licenciatura-en-musica-2005.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fartes-licenciatura-en-musica-2005.json");
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

const pathwayIds = ["composicion", "direccion-de-coro", "direccion-de-orquesta", "musicologia"];
const expectedPeriodCredits = {
  composicion: [40, 44, 44, 46, 44, 40, 16, 20],
  "direccion-de-coro": [39, 41, 46, 46, 37, 29, 16, 20],
  "direccion-de-orquesta": [41, 45, 44, 46, 37, 25, 12, 16],
  musicologia: [40, 38, 34, 30, 36, 32, 26, 30],
};
const expectedPlacements = {
  composicion: 56,
  "direccion-de-coro": 61,
  "direccion-de-orquesta": 55,
  musicologia: 51,
};
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const nodeById = new Map(projection.creditStructure.nodes.map((node) => [node.id, node]));
const sourceRefToProgressId = new Map([
  ...source.technicalMatches.map((row) => [row.progressId, row.progressId]),
  ...source.sourceOnlyBlocks.map((row) => [row.sourceOnlyId, row.progressId]),
]);

function expectedPeriods(trajectory) {
  const specificByLabel = new Map(trajectory.specificPeriods.map((period) => [period.label, period]));
  return source.sharedPeriods.map((period) => ({
    label: period.label,
    courseIds: [...period.courseRefs, ...(specificByLabel.get(period.label)?.courseRefs ?? [])]
      .map((sourceRef) => sourceRefToProgressId.get(sourceRef)),
  }));
}

test("versiona el Plan 2005, su inspección visual y las huellas de autoridad", () => {
  assert.equal(source.reviewedAt, "2026-10-12");
  assert.equal(source.fingerprint.canonicalField, "sourcePortions");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    assert.equal(source.fingerprint.sourceHashes[sourceId], digest(portion));
  }
  assert.equal(source.bedeliasComparison.snapshotContentHash, digest(snapshot));
  const planSource = source.sources.find(({ id }) => id === "fartes-musica-plan-2005");
  assert.equal(planSource.rawContentHash, "sha256:9994f1c969c824718b2eae0e092b62bd8ed00db7bd6820b1c9121ae67659d335");
  assert.deepEqual(planSource.visuallyInspectedPdfPages, [16, 17, 18, 19]);
  assert.deepEqual([
    source.publication.planYear,
    source.publication.durationSemesters,
    source.publication.minimumCredits,
  ], ["2005", 8, 360]);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-four-certified-options");
});

test("reproduce las cuatro grillas de ocho semestres y preserva los IDs de progreso", () => {
  assert.deepEqual(Object.keys(projection.publishedPathways), pathwayIds);
  assert.deepEqual(audit.officialPlan.trajectories.map(({ id }) => id), pathwayIds);
  for (const trajectory of source.trajectories) {
    const published = projection.publishedPathways[trajectory.id];
    const expected = expectedPeriods(trajectory);
    assert.deepEqual(published.periods, expected, trajectory.id);
    assert.equal(published.periods.length, 8, trajectory.id);
    assert.equal(published.periods.flatMap(({ courseIds }) => courseIds).length, expectedPlacements[trajectory.id]);
    assert.deepEqual(published.periods.map(({ courseIds }) => (
      courseIds.reduce((sum, courseId) => sum + courseById.get(courseId).credits, 0)
    )), expectedPeriodCredits[trajectory.id]);
  }
  for (const row of source.technicalMatches) {
    const course = courseById.get(row.progressId);
    assert.deepEqual([course?.bedeliasCode, course?.name, course?.credits], [
      row.sourceCourseId, row.officialLabel, row.credits,
    ], row.progressId);
  }
});

test("comparte un único tronco y controla 360 créditos con mínimos flexibles no acumulativos", () => {
  assert.deepEqual([projection.plan.year, projection.plan.durationMonths, projection.plan.minCredits], ["2005", 48, 360]);
  assert.deepEqual(projection.plan.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.deepEqual(projection.creditStructure.credentials.map(({ id }) => id), pathwayIds);

  for (const [periodIndex, sharedPeriod] of source.sharedPeriods.entries()) {
    const sharedIds = sharedPeriod.courseRefs.map((sourceRef) => sourceRefToProgressId.get(sourceRef));
    for (const pathwayId of pathwayIds) {
      assert.deepEqual(
        projection.publishedPathways[pathwayId].periods[periodIndex].courseIds.slice(0, sharedIds.length),
        sharedIds,
        `${pathwayId}/${sharedPeriod.label}`,
      );
    }
  }

  const expectedRoots = {
    composicion: [138, 12, 144, 58, 8],
    "direccion-de-coro": [138, 12, 124, 78, 8],
    "direccion-de-orquesta": [138, 12, 116, 86, 8],
    musicologia: [138, 12, 116, 86, 8],
  };
  const expectedSubminimum = {
    composicion: 20,
    "direccion-de-coro": 26,
    "direccion-de-orquesta": 29,
    musicologia: 29,
  };
  for (const credential of projection.creditStructure.credentials) {
    const roots = credential.nodeRequirements.filter(({ nodeId }) => nodeById.get(nodeId).parentId === "plan-total");
    const nested = credential.nodeRequirements.filter(({ nodeId }) => nodeById.get(nodeId).parentId !== "plan-total");
    assert.equal(credential.minTotalCredits, 360);
    assert.deepEqual(roots.map(({ minCredits }) => minCredits), expectedRoots[credential.id]);
    assert.equal(roots.reduce((sum, requirement) => sum + requirement.minCredits, 0), 360);
    assert.deepEqual(nested.map(({ minCredits }) => minCredits), [expectedSubminimum[credential.id], expectedSubminimum[credential.id]]);
  }
  assert.ok(pathwayIds.every((pathwayId) => projection.pathways[pathwayId].catalogCourseIds === undefined));
});

test("publica 93 correspondencias técnicas y diez bloques sólo-fuente; el resto queda oculto", () => {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const visibleIds = new Set(Object.values(projection.publishedPathways)
    .flatMap(({ periods }) => periods.flatMap(({ courseIds }) => courseIds)));

  assert.deepEqual([source.technicalMatches.length, source.sourceOnlyBlocks.length], [93, 10]);
  assert.deepEqual([verified.length, candidates.length, projection.courses.length], [103, 563, 666]);
  assert.ok(source.sourceOnlyBlocks.every(({ progressId, sourceOnlyId }) => {
    const course = courseById.get(progressId);
    return course?.sourceCourseId === sourceOnlyId && !course.bedeliasCode;
  }));
  assert.ok(verified.every(({ fieldProvenance }) => (
    fieldProvenance.inclusion === "official-curriculum"
      && fieldProvenance.name === "official-curriculum"
      && fieldProvenance.credits === "official-curriculum"
  )));
  assert.ok(candidates.every(({ id }) => !visibleIds.has(id)));
  assert.equal(projection.plan.courseCatalogAuditStatus, "partial");
});

test("conserva conflictos editoriales y separa Interpretación 2005 y planes 1987", () => {
  for (const field of [
    "compositionSemester5Subtotal",
    "musicologySemester8Subtotal",
    "musicologySemester4SpecificRow",
    "ambiguousTechnicalAliases",
  ]) assert.ok(source.conflicts.some((conflict) => conflict.field === field), field);
  assert.match(source.conflicts.find(({ field }) => field === "compositionSemester5Subtotal").resolution, /44 créditos/i);
  assert.match(source.conflicts.find(({ field }) => field === "musicologySemester8Subtotal").resolution, /se conserva 30/i);
  assert.match(source.conflicts.find(({ field }) => field === "musicologySemester4SpecificRow").resolution, /metodología de la investigación/i);

  assert.deepEqual(source.authorityPolicy.separatedPlanIds, [
    "bedelias-fartes-licenciatura-en-interpretacion-musical-2005",
    "bedelias-fartes-licenciatura-en-composicion-1987",
    "bedelias-fartes-licenciatura-en-direccion-coral-1987",
    "bedelias-fartes-licenciatura-en-direccion-orquestal-1987",
    "bedelias-fartes-licenciatura-en-musicologia-1987",
  ]);
  for (const separatedPlanId of source.authorityPolicy.separatedPlanIds) {
    assert.ok(inventory.plans.some(({ planId }) => planId === separatedPlanId), separatedPlanId);
  }
});

test("cierra la correspondencia estructurada del inventario", () => {
  const entry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.equal(entry.currentProjection.primary, "official-periods");
  assert.equal(entry.evidence.sourceDataPath, "data/fartes/musica-2005.json");
  assert.deepEqual(entry.evidence.pathways, pathwayIds.map((id) => ({ id, periodCount: 8 })));
  assert.deepEqual([entry.evidence.expectedCoursePlacements, entry.evidence.matchedCoursePlacements], [223, 223]);
  assert.ok(entry.conflictNotes.some((note) => /permanecen candidatas/i.test(note)));
  assert.deepEqual(inventory.counts.states, {
    "official-trajectory-reproduced": 115,
    "official-trajectory-identified-pending": 3,
    "no-official-trajectory-documented": 4,
    "research-pending": 25,
  });
});
