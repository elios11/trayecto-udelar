import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const source = await readJson("data/fartes/cure-artes-plasticas-2013.json");
const snapshot = await readJson("data/bedelias/cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013.json");
const rivera = await readJson("app/data/bedelias-generated/bedelias-cur-tecnicatura-en-artes-plasticas-y-visuales-2017.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

test("versiona evidencia oficial de Rocha y su vigencia 2026 con huellas reproducibles", () => {
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
    source.publication.currentAtReview,
  ], ["2013", 6, 240, true]);
  assert.deepEqual(source.scope.campuses.map(({ label }) => label), ["Rocha"]);
  assert.equal(source.bedeliasComparison.snapshotContentHash, digest(snapshot));
  assert.equal(source.sources.find(({ id }) => id === "fartes-plan-rocha-2013").rawContentHash, "sha256:bd646d5527965e2c88e919ab288e5d9bd9e5c467511bee8ae5c84ec2b2b0c194");
  assert.equal(source.sources.find(({ id }) => id === "cure-ingresos-generacion-2026").url, "https://www.cure.edu.uy/abren-las-inscripciones-para-la-generacion-2026-en-el-cure/");
});

test("reproduce exactamente seis semestres de 40 créditos y quince identidades", () => {
  const published = projection.publishedPathways.bedelias;
  const expected = source.trajectories[0].periods;
  const projectedByCode = new Map(projection.courses.map((course) => [course.bedeliasCode, course.id]));
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));

  assert.equal(published.label, "Plan de Estudios 2013 · Rocha");
  assert.equal(projection.source.careerPage, "https://www.artes.udelar.edu.uy/carrera/tecnicatura-en-artes-plasticas-y-visuales-2/");
  assert.deepEqual(published.campusIds, ["rocha"]);
  assert.deepEqual(published.periods.map(({ label }) => label), expected.map(({ label }) => label));
  assert.deepEqual(published.periods.map(({ courseIds }) => courseIds), expected.map(({ courseIds }) => (
    courseIds.map((sourceId) => projectedByCode.get(sourceId))
  )));
  assert.deepEqual(published.periods.map(({ courseIds }) => courseIds.reduce((sum, courseId) => (
    sum + courseById.get(courseId).credits
  ), 0)), [40, 40, 40, 40, 40, 40]);
  assert.equal(published.periods.flatMap(({ courseIds }) => courseIds).length, 15);
  assert.ok(!published.periods.some(({ label }) => label === "Validación de egreso"));
});

test("controla 240 créditos sin acumular contenidos de los seminarios variables", () => {
  const credential = projection.creditStructure.credentials[0];
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  const mandatory = credential.requiredCourseGroups.find(({ id }) => id === "mandatory-core");
  const seminars = credential.requiredCourseGroups.find(({ id }) => id === "second-year-seminar-slots");

  assert.equal(credential.minTotalCredits, 240);
  assert.deepEqual(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]), [
    ["semester-1", 40],
    ["semester-2", 40],
    ["semester-3", 40],
    ["semester-4", 40],
    ["semester-5", 40],
    ["semester-6", 40],
  ]);
  assert.deepEqual([mandatory.minCompleted, mandatory.courseIds.length], [13, 13]);
  assert.deepEqual([seminars.minCompleted, seminars.courseIds.length], [2, 2]);
  assert.deepEqual(seminars.courseIds.map((id) => courseById.get(id).bedeliasCode).sort(), ["AP07", "AP15"]);
  assert.ok(seminars.courseIds.every((id) => courseById.get(id).elective === true));
  assert.ok(seminars.courseIds.every((id) => courseById.get(id).catalogRole === "official-semester-choice-slot"));
});

test("publica sólo correspondencias exactas y retiene dos candidatas fuera de la trayectoria", () => {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const visibleIds = new Set(projection.publishedPathways.bedelias.periods.flatMap(({ courseIds }) => courseIds));
  const presentation = buildRegisteredPlanPresentation("bedelias", projection);

  assert.equal(verified.length, 15);
  assert.equal(candidates.length, 2);
  assert.equal(projection.plan.courseCatalogAuditStatus, "partial");
  assert.deepEqual(candidates.map(({ bedeliasCode, credits }) => [bedeliasCode, credits]).sort(), [["AP16", 0], ["INUNI", 4]]);
  assert.ok(candidates.every(({ id }) => !visibleIds.has(id)));
  assert.ok(verified.every(({ id, bedeliasCode }) => id === `cure-${bedeliasCode.toLocaleLowerCase("es-UY")}-2`));
  assert.ok(verified.every(({ fieldProvenance }) => (
    fieldProvenance.inclusion === "official-curriculum"
      && fieldProvenance.name === "official-curriculum"
      && fieldProvenance.credits === "official-curriculum"
  )));
  assert.equal(presentation.generated, false);
  assert.equal(presentation.courses.length, 15);
});

test("muestra Proyecto de Egreso una vez y mantiene Rocha separada de Rivera", () => {
  const project = projection.courses.find(({ bedeliasCode }) => bedeliasCode === "AP14");
  const placements = projection.publishedPathways.bedelias.periods.flatMap(({ courseIds }) => courseIds);
  const rochaIds = new Set(projection.courses.map(({ id }) => id));
  const riveraIds = new Set(rivera.courses.map(({ id }) => id));

  assert.equal(placements.filter((courseId) => courseId === project.id).length, 1);
  assert.ok(projection.publishedPathways.bedelias.periods[5].courseIds.includes(project.id));
  assert.deepEqual(projection.campuses.map(({ label }) => label), ["Rocha"]);
  assert.deepEqual(rivera.campuses.map(({ label }) => label), ["Rivera"]);
  assert.notEqual(projection.plan.year, rivera.plan.year);
  assert.equal([...rochaIds].some((id) => riveraIds.has(id)), false);
});

test("cierra la correspondencia estructurada del inventario", () => {
  const entry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.equal(entry.currentProjection.primary, "official-periods");
  assert.equal(entry.evidence.sourceDataPath, "data/fartes/cure-artes-plasticas-2013.json");
  assert.equal(entry.evidence.expectedCoursePlacements, 15);
  assert.equal(entry.evidence.matchedCoursePlacements, 15);
  assert.ok(entry.conflictNotes.some((note) => /página HTML sólo se usa para vigencia/i.test(note)));
  assert.ok(entry.conflictNotes.some((note) => /candidatas recuperables/i.test(note)));
});
