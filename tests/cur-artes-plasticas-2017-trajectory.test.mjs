import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const source = await readJson("data/fartes/cur-artes-plasticas-2017.json");
const snapshot = await readJson("data/bedelias/cur-tecnicatura-en-artes-plasticas-y-visuales-2017.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cur-tecnicatura-en-artes-plasticas-y-visuales-2017.json");
const rocha = await readJson("app/data/bedelias-generated/bedelias-cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

test("versiona evidencia oficial de Rivera con huellas reproducibles", () => {
  assert.equal(source.reviewedAt, "2026-10-11");
  assert.equal(source.fingerprint.canonicalField, "sourcePortions");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    assert.equal(source.fingerprint.sourceHashes[sourceId], digest(portion));
  }
  assert.deepEqual([
    source.publication.officialPlanYear,
    source.publication.durationSemesters,
    source.publication.minimumCredits,
  ], ["2017", 6, 240]);
  assert.deepEqual(source.scope.campuses.map(({ label }) => label), ["Rivera"]);
  assert.equal(source.bedeliasComparison.snapshotContentHash, "sha256:c67bf8af2fa4f22622ed5ce46e5bae6b63951dc5c88bc6b8b6a5ba595d98337e");
  assert.equal(source.sources.find(({ id }) => id === "fartes-plan-2017").rawContentHash, "sha256:ee73fc9fa498d439c574448d064d78c959fac75bd40e2a0d821c5df828fcc348");
  assert.equal(source.sources.find(({ id }) => id === "ienba-resolution-48-2019").rawContentHash, "sha256:445e5e1cb4b4fa7ac61940da052f6988d26734f1a82d2b380a0938d863a88ace");
});

test("reproduce los seis semestres vigentes y resuelve el doble rótulo de Taller IV", () => {
  const published = projection.publishedPathways.bedelias;
  const expected = source.trajectories[0].periods;
  const projectedByCode = new Map(projection.courses.map((course) => [course.bedeliasCode, course.id]));
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));

  assert.equal(published.label, "Plan de Estudios 2017 - implementación vigente");
  assert.equal(projection.source.careerPage, "https://www.artes.udelar.edu.uy/carrera/tecnicatura-en-artes-plasticas-y-visuales/");
  assert.deepEqual(published.campusIds, ["rivera"]);
  assert.deepEqual(published.periods.map(({ label }) => label), expected.map(({ label }) => label));
  assert.deepEqual(published.periods.map(({ courseIds }) => courseIds), expected.map(({ courseIds }) => (
    courseIds.map((sourceId) => projectedByCode.get(sourceId))
  )));
  assert.deepEqual(published.periods.map(({ courseIds }) => courseIds.reduce((sum, courseId) => (
    sum + courseById.get(courseId).credits
  ), 0)), [40, 40, 45, 40, 45, 35]);
  assert.deepEqual(published.periods[3].courseIds.map((id) => courseById.get(id).bedeliasCode), ["EPIV", "SEMII", "TAIII"]);
  assert.deepEqual(published.periods[4].courseIds.map((id) => courseById.get(id).bedeliasCode), ["STEA", "TAIV"]);
  assert.deepEqual(published.periods[5].courseIds.map((id) => courseById.get(id).bedeliasCode), ["EPV", "TAV", "PROE"]);
  assert.ok(!published.periods.some(({ label }) => label === "Validación de egreso"));
});

test("exige 240 créditos sin acumular las dos propuestas del seminario", () => {
  const credential = projection.creditStructure.credentials[0];
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  const mandatory = credential.requiredCourseGroups.find(({ id }) => id === "mandatory-curriculum");
  const seminar = credential.requiredCourseGroups.find(({ id }) => id === "third-semester-seminar");

  assert.equal(credential.minTotalCredits, 240);
  assert.deepEqual(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]), [
    ["semester-1", 40],
    ["semester-2", 40],
    ["semester-3", 40],
    ["semester-4", 40],
    ["semester-5", 45],
    ["semester-6", 35],
  ]);
  assert.deepEqual([mandatory.minCompleted, mandatory.courseIds.length], [14, 14]);
  assert.deepEqual([seminar.minCompleted, seminar.courseIds.length], [1, 2]);
  assert.deepEqual(seminar.courseIds.map((id) => courseById.get(id).bedeliasCode).sort(), ["SEMI", "SPAF"]);
  assert.ok(seminar.courseIds.every((id) => courseById.get(id).elective === true));
  assert.equal(snapshot.plan.courses.reduce((sum, course) => sum + course.credits, 0), 245);
});

test("preserva códigos e identidades de progreso y publica sólo correspondencias exactas", () => {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const presentation = buildRegisteredPlanPresentation("bedelias", projection);

  assert.equal(verified.length, 16);
  assert.equal(candidates.length, 0);
  assert.equal(projection.plan.courseCatalogAuditStatus, "verified");
  assert.deepEqual(new Set(verified.map(({ bedeliasCode }) => bedeliasCode)), new Set(snapshot.plan.courses.map(({ code }) => code)));
  assert.ok(verified.every(({ id, bedeliasCode }) => id === `cur-${bedeliasCode.toLocaleLowerCase("es-UY")}-2`));
  assert.ok(verified.every(({ fieldProvenance }) => (
    fieldProvenance.inclusion === "official-curriculum"
      && fieldProvenance.name === "official-curriculum"
      && fieldProvenance.credits === "official-curriculum"
  )));
  assert.equal(presentation.generated, false);
  assert.equal(presentation.courses.length, 16);
});

test("muestra Proyecto de Egreso una vez y mantiene Rivera separada de Rocha", () => {
  const riveraProject = projection.courses.find(({ bedeliasCode }) => bedeliasCode === "PROE");
  const riveraPlacements = projection.publishedPathways.bedelias.periods.flatMap(({ courseIds }) => courseIds);

  assert.equal(riveraPlacements.filter((courseId) => courseId === riveraProject.id).length, 1);
  assert.ok(projection.publishedPathways.bedelias.periods[5].courseIds.includes(riveraProject.id));
  assert.deepEqual(projection.campuses.map(({ label }) => label), ["Rivera"]);
  assert.deepEqual(rocha.campuses.map(({ label }) => label), ["Rocha"]);
  assert.notEqual(projection.plan.year, rocha.plan.year);
  assert.notDeepEqual(
    projection.publishedPathways.bedelias.periods.map(({ courseIds }) => courseIds),
    rocha.publishedPathways.bedelias.periods.map(({ courseIds }) => courseIds),
  );
});

test("cierra la correspondencia estructurada del inventario", () => {
  const entry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.equal(entry.currentProjection.primary, "official-periods");
  assert.equal(entry.evidence.sourceDataPath, "data/fartes/cur-artes-plasticas-2017.json");
  assert.equal(entry.evidence.expectedCoursePlacements, 16);
  assert.equal(entry.evidence.matchedCoursePlacements, 16);
  assert.ok(entry.conflictNotes.some((note) => /doble rótulo IV/i.test(note)));
  assert.ok(entry.conflictNotes.some((note) => /Resolución 48\/2019/i.test(note)));
});
