import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const source = await readJson("data/fartes/interpretacion-musical-2005.json");
const snapshot = await readJson("data/bedelias/fartes-licenciatura-en-interpretacion-musical-2005.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fartes-licenciatura-en-interpretacion-musical-2005.json");
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

const pathwayIds = [
  "opcion-canto", "opcion-clarinete", "opcion-contrabajo", "opcion-corno", "opcion-fagot",
  "opcion-flauta", "opcion-guitarra", "opcion-oboe", "opcion-organo", "opcion-percusion",
  "opcion-piano", "opcion-saxofon", "opcion-trombon", "opcion-trompeta", "opcion-viola",
  "opcion-violin", "opcion-violoncello",
];
const instrumentPeriodCredits = [46, 44, 43, 43, 41, 41, 25, 40];
const cantoPeriodCredits = [43, 45, 44, 44, 41, 41, 25, 40];
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const nodeById = new Map(projection.creditStructure.nodes.map((node) => [node.id, node]));
const technicalRows = [
  ...source.technicalMatches,
  ...source.technicalSeries.flatMap((series) => Array.from({ length: 8 }, (_, index) => ({
    sourceCourseId: `${series.sourceCoursePrefix}${index + 1}`,
    progressId: `${series.progressIdPrefix}${index + 1}`,
    officialLabel: `${series.officialLabel} ${index + 1}`,
    credits: series.credits,
  }))),
];
const sourceRefToProgressId = new Map([
  ...technicalRows.map((row) => [row.progressId, row.progressId]),
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
  const planSource = source.sources.find(({ id }) => id === "fartes-interpretacion-plan-2005");
  assert.equal(planSource.rawContentHash, "sha256:9994f1c969c824718b2eae0e092b62bd8ed00db7bd6820b1c9121ae67659d335");
  assert.deepEqual(planSource.visuallyInspectedPdfPages, [20, 21]);
  assert.deepEqual([
    source.publication.planYear,
    source.publication.durationSemesters,
    source.publication.minimumCredits,
  ], ["2005", 8, 360]);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-seventeen-certified-mentions");
});

test("reproduce las diecisiete grillas de ocho semestres y preserva los IDs de progreso", () => {
  assert.deepEqual(Object.keys(projection.publishedPathways), pathwayIds);
  assert.deepEqual(audit.officialPlan.trajectories.map(({ id }) => id), pathwayIds);
  for (const trajectory of source.trajectories) {
    const published = projection.publishedPathways[trajectory.id];
    assert.deepEqual(published.periods, expectedPeriods(trajectory), trajectory.id);
    assert.equal(published.periods.length, 8, trajectory.id);
    assert.equal(published.periods.flatMap(({ courseIds }) => courseIds).length, trajectory.id === "opcion-canto" ? 77 : 58);
    assert.deepEqual(published.periods.map(({ courseIds }) => (
      courseIds.reduce((sum, courseId) => sum + courseById.get(courseId).credits, 0)
    )), trajectory.id === "opcion-canto" ? cantoPeriodCredits : instrumentPeriodCredits);
  }
  assert.equal(technicalRows.length, 200);
  for (const row of technicalRows) {
    const course = courseById.get(row.progressId);
    assert.deepEqual([course?.bedeliasCode, course?.name, course?.credits], [
      row.sourceCourseId, row.officialLabel, row.credits,
    ], row.progressId);
  }
});

test("comparte un único tronco y controla 360 créditos sin acumular la oferta flexible", () => {
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

  for (const credential of projection.creditStructure.credentials) {
    const roots = credential.nodeRequirements.filter(({ nodeId }) => nodeById.get(nodeId).parentId === "plan-total");
    assert.equal(credential.minTotalCredits, 360);
    assert.deepEqual(roots.map(({ minCredits }) => minCredits), [138, 18, 152, 29, 8, 15]);
    assert.equal(roots.reduce((sum, requirement) => sum + requirement.minCredits, 0), 360);
  }
  assert.ok(pathwayIds.every((pathwayId) => projection.publishedPathways[pathwayId].catalogCourseIds === undefined));
  assert.match(projection.plan.notice, /Electivas y proyectos son mínimos flexibles/i);
});

test("publica la frontera auditada y mantiene las candidatas fuera de las grillas", () => {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const visibleIds = new Set(Object.values(projection.publishedPathways)
    .flatMap(({ periods }) => periods.flatMap(({ courseIds }) => courseIds)));

  assert.deepEqual([technicalRows.length, source.sourceOnlyBlocks.length], [200, 25]);
  assert.deepEqual([verified.length, candidates.length, projection.courses.length], [226, 824, 1050]);
  assert.ok(source.sourceOnlyBlocks.every(({ progressId, sourceOnlyId }) => {
    const course = courseById.get(progressId);
    return course?.sourceCourseId === sourceOnlyId && !course.bedeliasCode;
  }));
  assert.ok(candidates.every(({ id }) => !visibleIds.has(id)));
  assert.equal(projection.plan.courseCatalogAuditStatus, "partial");
  for (const id of [
    "fartes-eumus-arm1", "fartes-eumus-armo1", "fartes-eumus-rep1", "fartes-eumus-rpt1",
    "fartes-eumus-sin1", "fartes-eumus-ppa1", "fartes-eumus-ppac2",
  ]) assert.equal(courseById.get(id)?.authorityStatus, "candidate", id);
});

test("distingue admisión 2026, continuidad y conflictos documentales", () => {
  const admissions = source.sourcePortions["fartes-interpretacion-admission-2026"].facts;
  assert.equal(admissions.admissionMentionLabels.length, 15);
  assert.deepEqual(admissions.continuityOnlyMentionLabels, ["Corno", "Trombón"]);
  assert.equal(source.trajectories.find(({ id }) => id === "opcion-corno").admissionStatus, "continuity-only");
  assert.equal(source.trajectories.find(({ id }) => id === "opcion-trombon").admissionStatus, "continuity-only");
  assert.match(projection.plan.notice, /Corno y Trombón se conservan como continuidad/i);
  for (const field of [
    "currentOptions", "cantoSemester3StageCredits", "cantoSemester5Counterpoint",
    "ambiguousTechnicalAliases", "flatFlexibleOffer",
  ]) assert.ok(source.conflicts.some((conflict) => conflict.field === field), field);
  assert.match(source.conflicts.find(({ field }) => field === "cantoSemester3StageCredits").resolution, /subtotal oficial de 44/i);
  assert.match(source.conflicts.find(({ field }) => field === "cantoSemester5Counterpoint").resolution, /Contrapunto/i);
});

test("mantiene Música 2005 y los planes 1987 separados", () => {
  assert.deepEqual(source.authorityPolicy.separatedPlanIds, [
    "bedelias-fartes-licenciatura-en-musica-2005",
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
  assert.equal(entry.evidence.sourceDataPath, "data/fartes/interpretacion-musical-2005.json");
  assert.deepEqual(entry.evidence.pathways, pathwayIds.map((id) => ({ id, periodCount: 8 })));
  assert.deepEqual([entry.evidence.expectedCoursePlacements, entry.evidence.matchedCoursePlacements], [1005, 1005]);
  assert.ok(entry.conflictNotes.some((note) => /permanecen candidatas/i.test(note)));
  assert.deepEqual(inventory.counts.states, {
    "official-trajectory-reproduced": 110,
    "official-trajectory-identified-pending": 3,
    "no-official-trajectory-documented": 3,
    "research-pending": 31,
  });
});
