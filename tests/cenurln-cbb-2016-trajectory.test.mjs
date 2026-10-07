import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const source = await readJson("data/cenurln/ciclo-biologia-bioquimica-2016.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cenurln-ciclo-en-biologia-bioquimica-2016.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

test("versiona una fuente CENURLN normalizada, vigente y reproducible", () => {
  assert.equal(source.reviewedAt, "2026-10-07");
  assert.equal(source.fingerprint.canonicalField, "sourcePortions");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  assert.deepEqual(source.scope.campuses.map(({ label }) => label), ["Salto", "Paysandú"]);
  assert.equal(source.publication.minimumCredits, 90);
  assert.equal(source.publication.notACompleteDegree, true);
  assert.ok(source.sources.some(({ authority, url }) => (
    /Departamento de Ciencias Biológicas/.test(authority)
      && url === "https://dcb.litoralnorte.udelar.edu.uy/ense%C3%B1anza"
  )));
});

test("reproduce los dos semestres y las ocho identidades publicadas", () => {
  const expectedPeriods = source.trajectories[0].periods;
  const published = projection.publishedPathways.bedelias;
  const coursesById = new Map(projection.courses.map((course) => [course.id, course]));
  const projectedIdsBySource = new Map(projection.courses.map((course) => [course.bedeliasCode, course.id]));

  assert.deepEqual(published.campusIds, ["salto", "paysandu"]);
  assert.deepEqual(published.periods.map(({ label }) => label), expectedPeriods.map(({ label }) => label));
  assert.deepEqual(published.periods.map(({ courseIds }) => courseIds), expectedPeriods.map(({ courseIds }) => (
    courseIds.map((sourceId) => projectedIdsBySource.get(sourceId))
  )));
  assert.equal(published.periods.flatMap(({ courseIds }) => courseIds).length, 8);
  assert.equal(published.periods.flatMap(({ courseIds }) => courseIds)
    .reduce((sum, courseId) => sum + coursesById.get(courseId).credits, 0), 90);
  for (const row of source.rows) {
    const course = projection.courses.find(({ bedeliasCode }) => bedeliasCode === row.sourceCourseId);
    assert.equal(course.name, row.officialLabel);
    assert.equal(course.id, `cenurln-${row.sourceCourseId.toLocaleLowerCase("es-UY")}`);
    assert.equal(course.authorityStatus, "verified");
    assert.equal(course.fieldProvenance.inclusion, "official-curriculum");
    assert.equal(course.fieldProvenance.name, "official-curriculum");
    assert.equal(course.fieldProvenance.credits, "bedelias-composition");
  }
});

test("conserva 22 entradas Bedelías como candidatas fuera del catálogo y sin volverlas obligatorias", () => {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const visibleIds = new Set([
    ...projection.publishedPathways.bedelias.periods.flatMap(({ courseIds }) => courseIds),
    ...(projection.publishedPathways.bedelias.catalogCourseIds ?? []),
  ]);

  assert.equal(verified.length, 8);
  assert.equal(candidates.length, 22);
  assert.ok(candidates.every(({ id }) => !visibleIds.has(id)));
  assert.deepEqual(projection.creditStructure.credentials[0].requiredCourseGroups, []);
  assert.equal(projection.plan.courseCatalogAuditStatus, "partial");
});

test("controla 90 créditos y los tres mínimos de área sin confundir las continuaciones", () => {
  const nodeMinimums = Object.fromEntries(projection.creditStructure.nodes.map(({ id, minCredits }) => [id, minCredits]));
  assert.equal(nodeMinimums["plan-total"], 90);
  assert.equal(nodeMinimums["biologia-celular-molecular"], 25);
  assert.equal(nodeMinimums["diversidad-biologica"], 15);
  assert.equal(nodeMinimums["formacion-metodologica-general"], 5);
  assert.equal(projection.creditStructure.credentials.length, 1);
  assert.equal(projection.creditStructure.credentials[0].title, "Ciclo en Biología - Bioquímica");
  assert.ok(source.scope.continuations.every(({ relationship }) => /no (integra|es título)/.test(relationship)));

  const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.evidence.expectedCoursePlacements, 8);
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 8);
});
