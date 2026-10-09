import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const source = await readJson("data/cenurln/imagen-fotografica-2008.json");
const snapshot = await readJson("data/bedelias/cenurln-tecnicatura-en-tecnologias-de-la-imagen-fotografica-2008.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cenurln-tecnicatura-en-tecnologias-de-la-imagen-fotografica-2008.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

test("versiona el Plan 2008 vigente, su alcance en Paysandú y una huella reproducible", () => {
  assert.equal(source.reviewedAt, "2026-10-09");
  assert.equal(source.fingerprint.canonicalField, "sourcePortions");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  assert.equal(source.publication.durationMonths, 36);
  assert.equal(source.publication.semesterCount, 6);
  assert.equal(source.publication.minimumCredits, 240);
  assert.deepEqual(source.scope.campuses.map(({ label }) => label), ["Paysandú"]);
  assert.equal(source.sources.find(({ id }) => id === "fartes-plan-2008").contentHash, "sha256:a0f9f2a7082ea2e5420bfe28156faacfd3f773aae2cba5e881864b1eb6804f65");
  assert.deepEqual(source.scope.excludedPrograms.map(({ name }) => name), [
    "Licenciatura en Fotografía",
    "Tecnicatura en Artes Plásticas y Visuales",
  ]);
});

test("reproduce seis semestres en orden con 40 créditos cada uno", () => {
  const published = projection.publishedPathways.bedelias;
  const expected = source.trajectories[0].periods;
  const projectedBySourceIdentity = new Map(projection.courses.flatMap((course) => [
    [course.bedeliasCode, course.id],
    [course.id.replace(/^cenurln-/, ""), course.id],
  ].filter(([identity]) => identity)));
  const coursesById = new Map(projection.courses.map((course) => [course.id, course]));

  assert.equal(published.label, "Plan de Estudios 2008");
  assert.deepEqual(published.campusIds, ["paysandu"]);
  assert.deepEqual(published.periods.map(({ label }) => label), expected.map(({ label }) => label));
  assert.deepEqual(published.periods.map(({ courseIds }) => courseIds), expected.map(({ courseIds }) => (
    courseIds.map((sourceId) => projectedBySourceIdentity.get(sourceId))
  )));
  assert.equal(published.periods.flatMap(({ courseIds }) => courseIds).length, 20);
  assert.deepEqual(published.periods.map(({ courseIds }) => courseIds.reduce((sum, courseId) => (
    sum + coursesById.get(courseId).credits
  ), 0)), [40, 40, 40, 40, 40, 40]);
  assert.deepEqual(published.periods.at(-1).courseIds.map((courseId) => coursesById.get(courseId).name), [
    "Fotografía V",
    "T.L.O.E.P. V",
    "Seminario de educación artística",
    "Trabajo Final de Egreso",
  ]);
});

test("separa diez correspondencias, diez identidades sólo-fuente y cinco candidatas recuperables", () => {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const visibleIds = new Set(projection.publishedPathways.bedelias.periods.flatMap(({ courseIds }) => courseIds));
  const snapshotCodes = new Set(snapshot.plan.courses.map(({ code }) => code));
  const sourceOnly = verified.filter(({ id }) => source.authorityPolicy.verifiedSourceOnlyIdentityKeys
    .some((identityKey) => id === `cenurln-${identityKey}`));

  assert.equal(verified.length, 20);
  assert.equal(sourceOnly.length, 10);
  assert.equal(candidates.length, 5);
  assert.deepEqual(
    new Set(candidates.map(({ bedeliasCode }) => bedeliasCode)),
    new Set(["TFI", "TFII", "TFIII", "TFIV", "TFV"]),
  );
  assert.ok(candidates.every(({ id }) => !visibleIds.has(id)));
  assert.ok(candidates.every(({ id, bedeliasCode }) => id === `cenurln-${bedeliasCode.toLocaleLowerCase("es-UY")}`));
  assert.ok(sourceOnly.every((course) => !course.bedeliasCode && !course.sourceCourseId));
  assert.ok(sourceOnly.every((course) => !course.equivalentCourseIds && !course.equivalentBedeliasCodes));
  assert.ok(sourceOnly.every(({ id }) => !snapshotCodes.has(id.replace(/^cenurln-/, "").toLocaleUpperCase("es-UY"))));

  for (const row of source.rows.filter(({ projectionBasis }) => projectionBasis === "bedelias-match")) {
    const course = projection.courses.find(({ bedeliasCode }) => bedeliasCode === row.sourceCourseId);
    assert.equal(course.id, `cenurln-${row.sourceCourseId.toLocaleLowerCase("es-UY")}`);
    assert.equal(course.name, row.officialLabel);
    assert.equal(course.credits, row.credits);
    assert.equal(course.fieldProvenance.inclusion, "official-curriculum");
    assert.equal(course.fieldProvenance.name, "official-curriculum");
    assert.equal(course.fieldProvenance.credits, "official-curriculum");
  }
});

test("mantiene los seminarios como espacios opcionales y distingue el Trabajo Final como requisito del título", () => {
  const optionCodes = new Set(["SOPI", "SOPII"]);
  const optionCourses = projection.courses.filter(({ bedeliasCode }) => optionCodes.has(bedeliasCode));
  const credential = projection.creditStructure.credentials.find(({ id }) => id === "bedelias-degree");

  assert.equal(optionCourses.length, 2);
  assert.ok(optionCourses.every(({ elective }) => elective === true));
  assert.ok(optionCourses.every(({ catalogRole }) => catalogRole === "official-semester-option-slot"));
  assert.equal(credential.minTotalCredits, 240);
  assert.equal(credential.requiredCourseGroups.length, 1);
  assert.equal(credential.requiredCourseGroups[0].label, "Trabajo Final de Egreso");
  assert.deepEqual(credential.requiredCourseGroups[0].courseIds, ["cenurln-tfe"]);
  assert.ok(credential.requiredCourseGroups.every(({ courseIds }) => (
    optionCourses.every(({ id }) => !courseIds.includes(id))
  )));
  assert.equal(source.publication.semesterApproval.notModeledAsCredits, true);
});

test("publica sólo el catálogo oficial y cierra la correspondencia del inventario", () => {
  const presentation = buildRegisteredPlanPresentation("bedelias", projection);
  const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);

  assert.equal(presentation.generated, false);
  assert.equal(presentation.courses.length, 20);
  assert.ok(presentation.courses.every(({ authorityStatus }) => authorityStatus === "verified"));
  assert.deepEqual(projection.campuses.map(({ label }) => label), ["Paysandú"]);
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.currentProjection.primary, "official-periods");
  assert.equal(inventoryEntry.evidence.expectedCoursePlacements, 20);
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 20);
  assert.ok(!JSON.stringify(projection).includes("Montevideo"));
  assert.ok(!projection.courses.some(({ name }) => /Artes Plásticas|Artes Visuales/i.test(name)));
});
