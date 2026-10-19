import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mineroSourceDigest, mineroSourceEvidence, tecnologoMineroReconciliation } from "../scripts/tecnologo-minero-reconciliation.mjs";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const source = await readJson("data/cure/tecnologo-minero-2012.json");
const projection = await readJson(`app/data/bedelias-generated/${source.planId}.json`);
const inventory = await readJson("data/official-trajectories/inventory.json");
const courses = new Map(projection.courses.map((course) => [course.id, course]));
const pathway = projection.publishedPathways.bedelias;
const visibleIds = new Set([...pathway.periods.flatMap(({ courseIds }) => courseIds), ...pathway.catalogCourseIds]);
const rowIdentity = (course) => course.bedeliasCode ?? course.sourceCourseId;

test("D03av coteja las 24 filas de los seis semestres CURE en el orden publicado", () => {
  assert.deepEqual(pathway.periods.map(({ label, courseIds }) => ({
    label, courseIds: courseIds.map((id) => rowIdentity(courses.get(id))),
  })), source.trajectories[0].periods);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [4, 4, 4, 4, 4, 4]);
  assert.equal(pathway.restrictGeneratedCatalogToPublished, true);
  assert.match(pathway.description, /no secuencia obligatoria ni promesa de oferta/);
  assert.deepEqual(projection.campuses.map(({ label }) => label), ["Treinta y Tres"]);
});

test("conserva once opciones, deduplica Hidrogeología y no exige toda la grilla", () => {
  for (const id of source.electiveRowIds) {
    assert.equal([...visibleIds].filter((courseId) => courses.get(courseId)?.bedeliasCode === id).length, 1, id);
  }
  assert.equal(pathway.catalogCourseIds.filter((id) => courses.get(id).dataStatus !== "manual-validation").length, 10);
  const credential = projection.creditStructure.credentials[0];
  assert.equal(credential.minTotalCredits, 272);
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), ["mandatory-internship", "validacion-final-plan"]);
  assert.equal(credential.requiredCourseGroups[0].courseIds[0], "cure-tm30-2");
  assert.ok(pathway.catalogCourseIds.includes("cure-validacion-final-plan"));
});

test("separa inclusión oficial y créditos Bedelías sin promover variantes ambiguas", () => {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  assert.equal(verified.length, 35);
  assert.equal(candidates.length, 16);
  assert.ok(candidates.every(({ id }) => !visibleIds.has(id)));
  for (const row of source.rows) {
    const actual = [...courses.values()].find((course) => rowIdentity(course) === row.id);
    assert.ok(actual, row.id);
    assert.equal(actual.authorityStatus, "verified");
    assert.equal(actual.name, row.officialLabel);
    if (row.sourceCourseId) {
      assert.equal(actual.credits, row.credits);
      assert.equal(actual.fieldProvenance.inclusion, "official-curriculum");
      assert.equal(actual.fieldProvenance.credits, "bedelias-composition");
      assert.equal(actual.id, `cure-${row.id.toLowerCase()}-2`);
    } else {
      assert.equal(actual.bedeliasCode, undefined);
      assert.equal(actual.creditsPublished, false);
      assert.equal(actual.fieldProvenance.credits, "official-source-no-load");
      assert.equal(actual.equivalentCourseIds, undefined);
      for (const code of row.unresolvedSourceCourseIds) {
        const old = projection.courses.find(({ bedeliasCode }) => bedeliasCode === code);
        assert.equal(old.authorityStatus, "candidate");
        assert.equal(old.id, `cure-${code.toLowerCase()}-2`);
      }
    }
  }
  assert.ok(projection.courseAuthority.records.some(({ sourceCourseId, status }) => sourceCourseId === "TMM32" && status === "rejected"));
});

test("versiona la discrepancia histórica y genera huellas reproducibles sin red", () => {
  const evidence = mineroSourceEvidence(source);
  const current = evidence.find(({ id }) => id === "cure-current");
  assert.equal(current.contentHash, mineroSourceDigest(Object.fromEntries(current.fingerprintFields.map((key) => [key, source[key]]))));
  const historic = source.approvedExample.periods;
  assert.equal(historic[2].labels.at(-1), "Optativa");
  assert.equal(historic[3].labels.at(-1), "Optativa");
  assert.equal(historic[4].labels.at(-1), "Beneficiación");
  assert.equal(historic[5].labels[0], "Geología del Uruguay");
  assert.equal(source.scope.approvedMinimumCredits, 270);
  assert.equal(source.scope.implementedMinimumCredits, 272);
  assert.equal(projection.plan.year, "2012");
  assert.match(projection.plan.notice, /preguntas frecuentes.*270/);
  assert.deepEqual(tecnologoMineroReconciliation(source), tecnologoMineroReconciliation(structuredClone(source)));
  const entry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.equal(entry.evidence.expectedCoursePlacements, 24);
  assert.equal(entry.evidence.matchedCoursePlacements, 24);
  assert.deepEqual(entry.evidence.pathways, [{ id: "bedelias", periodCount: 6 }]);
  assert.ok(!inventory.pendingQueue.plans.some(({ planId }) => planId === source.planId));
});
