import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const source = await readJson("data/fartes/danza-contemporanea-2018.json");
const snapshot = await readJson("data/bedelias/fartes-licenciatura-en-danza-contemporanea-2018.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fartes-licenciatura-en-danza-contemporanea-2018.json");
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

test("versiona la autoridad del Plan 2008 / Implementación 2018 y sus huellas", () => {
  assert.equal(source.reviewedAt, "2026-10-11");
  assert.equal(source.fingerprint.canonicalField, "sourcePortions");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    assert.equal(source.fingerprint.sourceHashes[sourceId], digest(portion));
  }
  assert.equal(source.bedeliasComparison.snapshotContentHash, digest(snapshot));
  assert.deepEqual([
    source.publication.officialPlanYear,
    source.publication.implementationYear,
    source.publication.catalogPlanYear,
    source.publication.durationSemesters,
    source.publication.minimumCredits,
  ], ["2008", "2018", "2018", 8, 360]);
  assert.equal(
    source.sources.find(({ id }) => id === "fartes-danza-plan-2008-implementation-2018").rawContentHash,
    "sha256:e54d8ddd06f8d768a63ce7d905ca560413d3d1d69cd536af40a251f302d45ce4",
  );
  assert.deepEqual(source.sources.find(({ id }) => id === "fartes-danza-plan-2008-implementation-2018").visuallyInspectedPdfPages, [3, 4, 5]);
  assert.equal(audit.officialPlan.planYear, "2018");
  assert.equal(audit.officialPlan.approvedPlanYear, "2008");
  assert.equal(audit.officialPlan.implementationYear, "2018");
  assert.equal(projection.plan.year, "2018");
});

test("reproduce las 36 ubicaciones de los ocho semestres y preserva IDs de progreso", () => {
  const published = projection.publishedPathways.bedelias;
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  const identityToId = new Map();
  for (const course of projection.courses) {
    for (const identity of [course.id, course.bedeliasCode, course.sourceCourseId].filter(Boolean)) {
      identityToId.set(identity, course.id);
    }
  }

  assert.equal(published.label, "Malla curricular · implementación 2018");
  assert.deepEqual(published.campusIds, ["montevideo"]);
  assert.deepEqual(published.periods.map(({ label }) => label), source.trajectories[0].periods.map(({ label }) => label));
  assert.deepEqual(published.periods.map(({ courseIds }) => courseIds), source.trajectories[0].periods.map(({ courseIds }) => (
    courseIds.map((sourceId) => identityToId.get(sourceId))
  )));
  assert.deepEqual(published.periods.map(({ courseIds }) => courseIds.reduce((sum, id) => sum + courseById.get(id).credits, 0)), [
    29, 36, 44, 40, 33, 29, 23, 23,
  ]);
  assert.equal(published.periods.flatMap(({ courseIds }) => courseIds).length, 36);
  assert.ok(!published.periods.some(({ label }) => label === "Validación de egreso"));
  for (const row of source.rows.filter(({ sourceCourseId }) => sourceCourseId)) {
    assert.equal(courseById.get(row.progressId)?.name, row.officialLabel, row.rowId);
  }
});

test("controla 360 créditos, seis ejes, flexibilidad y el conflicto 38/43", () => {
  const credential = projection.creditStructure.credentials[0];
  assert.equal(credential.minTotalCredits, 360);
  assert.deepEqual(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]), [
    ["creation", 81],
    ["research", 34],
    ["theory-history", 43],
    ["body-studies", 43],
    ["mediation", 20],
    ["optatives", 67],
    ["electives", 36],
    ["final-project", 36],
  ]);
  assert.equal(credential.nodeRequirements.reduce((sum, requirement) => sum + requirement.minCredits, 0), 360);
  assert.equal(source.sourcePortions["fartes-danza-plan-2008-implementation-2018"].facts.trainingAxes.length, 6);
  assert.deepEqual([
    source.sourcePortions["fartes-danza-plan-2008-implementation-2018"].facts.narrativeBodyMinimumCredits,
    source.sourcePortions["fartes-danza-plan-2008-implementation-2018"].facts.gridBodyMinimumCredits,
  ], [38, 43]);
  assert.match(audit.anomalies.find(({ field }) => field === "bodyStudiesMinimumCredits").resolution, /contradicción interna/i);
  assert.match(projection.plan.notice, /67 optativos y 36 electivos/i);
});

test("publica 30 correspondencias exactas y seis bloques sólo-fuente", () => {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const visibleIds = new Set(projection.publishedPathways.bedelias.periods.flatMap(({ courseIds }) => courseIds));
  const presentation = buildRegisteredPlanPresentation("bedelias", projection);
  const exactRows = source.rows.filter(({ projectionBasis }) => projectionBasis === "exact-plan-row-and-bedelias-identity");
  const sourceOnlyRows = source.rows.filter(({ projectionBasis }) => projectionBasis === "source-only-grid-block");

  assert.deepEqual([exactRows.length, sourceOnlyRows.length], [30, 6]);
  assert.deepEqual([verified.length, candidates.length], [36, 387]);
  assert.equal(projection.plan.courseCatalogAuditStatus, "partial");
  assert.ok(exactRows.every(({ progressId }) => projection.courses.some(({ id }) => id === progressId)));
  assert.ok(sourceOnlyRows.every(({ progressId }) => projection.courses.some((course) => (
    course.id === progressId && course.sourceCourseId && !course.bedeliasCode
  ))));
  assert.ok(candidates.every(({ id }) => !visibleIds.has(id)));
  assert.ok(verified.every(({ fieldProvenance }) => (
    fieldProvenance.inclusion === "official-curriculum"
      && fieldProvenance.name === "official-curriculum"
      && fieldProvenance.credits === "official-curriculum"
  )));
  assert.equal(presentation.generated, false);
  assert.equal(presentation.courses.length, 36);
});

test("no convierte seminarios, TFE agregados ni perfiles personales en equivalencias", () => {
  const candidateCodes = new Set(projection.courses
    .filter(({ authorityStatus }) => authorityStatus === "candidate")
    .map(({ bedeliasCode }) => bedeliasCode));
  for (const code of ["ENBA-STAM1", "ENBA-STAM2", "ENBA-SI1", "ENBA-SI2", "ENBA-LTFE1", "ENBA-LTFE2"]) {
    assert.ok(candidateCodes.has(code), code);
  }
  const tfeRows = source.rows.filter(({ requirementId }) => requirementId === "final-project");
  assert.deepEqual(tfeRows.map(({ credits }) => credits), [10, 8, 10, 8]);
  assert.equal(tfeRows.reduce((sum, row) => sum + row.credits, 0), 36);
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.equal(projection.pathways.bedelias.catalogCourseIds, undefined);
  assert.match(source.conflicts.find(({ field }) => field === "genericSeminarIdentity").resolution, /bloques sólo-fuente/i);
  assert.match(source.conflicts.find(({ field }) => field === "finalProjectIdentity").resolution, /sin atribuirles los códigos LTFE1\/LTFE2/i);
});

test("cierra la correspondencia estructurada del inventario", () => {
  const entry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.equal(entry.currentProjection.primary, "official-periods");
  assert.equal(entry.evidence.sourceDataPath, "data/fartes/danza-contemporanea-2018.json");
  assert.equal(entry.evidence.expectedCoursePlacements, 36);
  assert.equal(entry.evidence.matchedCoursePlacements, 36);
  assert.ok(entry.conflictNotes.some((note) => /38.*43|43.*38/i.test(note)));
  assert.ok(entry.conflictNotes.some((note) => /permanecen candidatas/i.test(note)));
});
