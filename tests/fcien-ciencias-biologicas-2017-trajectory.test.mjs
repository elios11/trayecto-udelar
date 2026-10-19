import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";
import { validateBiologicalSciencesSource, validateBiologicalSciencesProjection } from "../scripts/build-fcien-ciencias-biologicas-2017.mjs";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const source = await readJson("data/fcien/ciencias-biologicas-2017-trajectory-review.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-ciencias-biologicas-2017.json");
const projection = await readJson(`app/data/bedelias-generated/${source.planId}.json`);
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
const inventory = await readJson("data/official-trajectories/inventory.json");
const entry = inventory.plans.find(({ planId }) => planId === source.planId);
const reviews = await readJson("data/official-trajectories/reviews.json");
const review = reviews.reviews.find(({ planId }) => planId === source.planId);
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

test("D03ax coteja dos semestres de CIDU 2026, no una ausencia ni una carrera completa", () => {
  validateBiologicalSciencesSource(source, snapshot);
  validateBiologicalSciencesProjection(source, projection, entry);
  assert.equal(review.evidence.partial, true);
  assert.equal(review.scope.completeDegreeSequence, false);
  assert.equal(audit.conclusion.trajectoryCoverage, "partial-initial-two-semesters");
  assert.equal(audit.conclusion.trajectorySourceDataPath, review.evidence.sourceDataPath);
  assert.equal(entry.evidence.kind, "audited-projection");
  assert.deepEqual(entry.evidence.pathways, [{ id: "formacion-personalizada", periodCount: 2 }]);
  assert.match(projection.plan.notice, /parcial.*sólo primer y segundo semestre/);
  assert.match(projection.pathways["formacion-personalizada"].label, /parcial/);
});

test("D03ax guarda versiones, huellas reproducibles y autoridad externa a EVA", () => {
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const item of source.sources) {
    const evidence = review.sources.find(({ url }) => url === item.url);
    assert.equal(evidence.contentHash, digest(source.sourcePortions[item.id]));
    assert.equal(evidence.reviewedAt, source.reviewedAt);
  }
  assert.equal(source.sources.find(({ id }) => id === "cidu-2026").rawSha256, "b47462c97b26b38bb10bc4263949bd463c0b946b4dc652b253d1fc04ddd6c856");
  assert.equal(source.sourcePortions["colibri-record"].year, "2017");
  assert.equal(source.sourcePortions["impo-regulation"].transitionPlanLabel, "2015");
  assert.equal(source.sourcePortions["faculty-current"].officialCareerSpace, source.sources.find(({ id }) => id === "public-career-space").url);
});

test("D03ax publica exactamente ocho ubicaciones y conserva el resto como catálogo parcial", () => {
  const presentation = buildRegisteredPlanPresentation("formacion-personalizada", projection);
  const courses = new Map(projection.courses.map((course) => [course.id, course]));
  assert.deepEqual(presentation.periods.map(({ courseIds }) => courseIds.map((id) => courses.get(id).name)), [
    ["Biología General", "Química General", "Física 1", "Matemática 1"],
    ["Química Orgánica 1", "Física 2", "Matemática 2 módulo 1", "Seminario de Biología"],
  ]);
  assert.equal(presentation.periods[0].courseIds.reduce((sum, id) => sum + courses.get(id).credits, 0), 46);
  assert.equal(source.sourcePortions["cidu-2026"].firstSemesterApproximateCredits, 45);
  const seminar = projection.courses.find(({ sourceCourseId }) => sourceCourseId === source.sourceOnlyRows[0].identityKey);
  assert.equal(seminar.bedeliasCode, undefined);
  assert.equal(seminar.creditsPublished, false);
  assert.equal(seminar.credits, 0);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "BG900").id, "fcien-bg900-2");
  assert.ok(projection.pathways["formacion-personalizada"].catalogCourseIds.includes("fcien-bg900-2"));
  assert.ok(!presentation.periods.some(({ courseIds }) => courseIds.includes("fcien-bg900-2")));
  assert.deepEqual(source.sourcePortions["cidu-2026"].laterCoursePeriodRows, []);
  assert.equal(source.sourcePortions["cidu-2026"].illustrativeTables.notAUniqueMandatoryCurriculum, true);
});

test("D03ax rechaza huellas alteradas, promociones administrativas y semestres inventados", () => {
  const changed = structuredClone(source);
  changed.sourcePortions["cidu-2026"].firstSemesterApproximateCredits = 46;
  assert.throws(() => validateBiologicalSciencesSource(changed, snapshot), /Huella/);
  const promoted = structuredClone(projection);
  promoted.courses.find(({ bedeliasCode }) => bedeliasCode === "BG861").authorityStatus = "verified";
  assert.throws(() => validateBiologicalSciencesProjection(source, promoted, entry));
  const invented = structuredClone(projection);
  invented.publishedPathways["formacion-personalizada"].periods.push({ label: "Tercer semestre", courseIds: ["fcien-bg900-2"] });
  assert.throws(() => validateBiologicalSciencesProjection(source, invented, entry));
  const changedIdentity = structuredClone(projection);
  changedIdentity.courses.find(({ id }) => id === "fcien-bg900-2").id = "replacement";
  assert.throws(() => validateBiologicalSciencesProjection(source, changedIdentity, entry), /IDs/);
});
