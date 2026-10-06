import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const source = await readJson("data/fcea/economia-2012-trayectoria.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcea-licenciatura-en-economia-2012.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en economia:2012");
const nodesById = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));
const coursesById = new Map(plan.courses.map((course) => [course.id, course]));
const coursesByCode = new Map(plan.courses.map((course) => [course.bedeliasCode, course]));

const sourceCodesForPeriods = (periods) => periods.map(({ label, courseIds }) => ({
  label,
  courseIds: courseIds.map((courseId) => coursesById.get(courseId)?.bedeliasCode),
}));

test("versiona la fuente normalizada y verifica sus huellas reproducibles", () => {
  assert.equal(source.source.authority, "Facultad de Ciencias Económicas y de Administración, Udelar");
  assert.equal(source.source.reviewedAt, "2026-10-05");
  assert.equal(source.source.effectiveAt, "2026-07");
  assert.equal(source.source.documents.length, 3);
  assert.equal(digest(source.mainGrid), source.fingerprints.normalizedGrid);
  assert.equal(digest(source.suggestedGuides), source.fingerprints.normalizedSuggestedGuides);

  const rows = source.mainGrid.periods.flatMap(({ rows: periodRows }) => periodRows);
  const gridSourceIds = rows.flatMap(({ sourceIds }) => sourceIds);
  assert.deepEqual(source.mainGrid.periods.map(({ rows: periodRows }) => periodRows.length), [6, 7, 8, 8, 10, 13, 14, 15]);
  assert.equal(rows.length, 81);
  assert.equal(gridSourceIds.length, 82);
  assert.equal(new Set([...gridSourceIds, ...source.additionalVerifiedCourses.map(({ sourceId }) => sourceId)]).size, 83);
  assert.deepEqual(source.suggestedGuides.map(({ id }) => id), ["academica", "empresarial", "politicas-publicas", "sector-financiero"]);
  for (const guide of source.suggestedGuides) {
    assert.equal(guide.suggestions.reduce((sum, { printedCredits }) => sum + printedCredits, 0), guide.printedSuggestedCredits, guide.id);
  }
});

test("reproduce exactamente la grilla de ocho semestres y las cuatro guías", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Economía", 48, 360]);
  assert.deepEqual(Object.keys(plan.pathways), ["personalizada", "academica", "empresarial", "politicas-publicas", "sector-financiero"]);
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);

  for (const trajectory of source.trajectories) {
    assert.deepEqual(sourceCodesForPeriods(plan.publishedPathways[trajectory.id].periods), trajectory.periods, trajectory.id);
  }
});

test("publica sólo las 83 identidades verificadas y mantiene la unión del catálogo", () => {
  const expectedCodes = new Set([
    ...source.mainGrid.periods.flatMap(({ rows }) => rows.flatMap(({ sourceIds }) => sourceIds)),
    ...source.additionalVerifiedCourses.map(({ sourceId }) => sourceId),
  ]);
  assert.equal(plan.courses.length, 83);
  assert.deepEqual(new Set(plan.courses.map(({ bedeliasCode }) => bedeliasCode)), expectedCodes);
  assert.ok(plan.courses.every(({ authorityStatus, dataStatus }) => authorityStatus === "verified" && dataStatus === "official-curriculum"));
  assert.ok(plan.courseAuthority.records.some(({ status }) => status === "rejected"));

  const allCourseIds = new Set(plan.courses.map(({ id }) => id));
  for (const [pathwayId, pathway] of Object.entries(plan.pathways)) {
    const availableIds = new Set([...pathway.periods.flatMap(({ courseIds }) => courseIds), ...pathway.catalogCourseIds]);
    assert.deepEqual(availableIds, allCourseIds, pathwayId);
  }
});

test("controla mínimos por área, submínimos básicos y el núcleo fijo sin acumular alternativas", () => {
  const credential = plan.creditStructure.credentials[0];
  const rootRequirements = credential.nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId === "plan-total");
  assert.deepEqual(rootRequirements.map(({ minCredits }) => minCredits), [150, 80, 50, 10, 10, 10, 50]);
  assert.equal(rootRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
  assert.deepEqual(
    credential.nodeRequirements.filter(({ nodeId }) => nodesById.get(nodeId).parentId !== "plan-total").map(({ minCredits }) => minCredits),
    [120, 70, 20, 10, 10, 10],
  );
  assert.ok(plan.courses.every(({ eligibleRequirementIds }) => eligibleRequirementIds.includes("free-distribution")));
  const fixed = credential.requiredCourseGroups.find(({ id }) => id === "economia-obligatorias-fijas");
  assert.equal(fixed.minCompleted, 22);
  assert.deepEqual(fixed.courseIds.map((courseId) => coursesById.get(courseId).bedeliasCode), source.interpretation.fixedRequiredSourceIds);
  assert.ok(!fixed.courseIds.includes(coursesByCode.get("E10").id));
  assert.ok(!fixed.courseIds.includes(coursesByCode.get("MC10").id));
});

test("preserva IDs de progreso y documenta las discrepancias sin fusionar por semejanza", () => {
  const mc52 = coursesByCode.get("MC52");
  assert.equal(mc52.id, "fcea-mc52-2");
  assert.deepEqual(mc52.equivalentCourseIds, ["fcea-mc52-3"]);
  assert.equal(mc52.credits, 15);
  assert.deepEqual(
    Object.fromEntries(mc52.creditAllocations.map(({ nodeId, credits }) => [nodeId, credits])),
    { "quantitative-basic": 10, "free-distribution": 15, "quantitative-optional": 5 },
  );
  assert.ok(plan.courseAuthority.records.some((record) => record.courseId === "fcea-mc52-3"
    && record.canonicalCourseId === "fcea-mc52-2"
    && record.status === "historical-equivalent"));

  assert.equal(coursesByCode.get("UADA1").id, "fcea-uada1-2");
  assert.equal(coursesByCode.get("UADA2").id, "fcea-uada2-2");
  assert.notEqual(coursesByCode.get("UADA1").id, coursesByCode.get("UADA2").id);
  assert.equal(coursesByCode.get("I90").credits, 25);
  const academicI90 = source.suggestedGuides.find(({ id }) => id === "academica").suggestions.find(({ sourceIds }) => sourceIds?.includes("I90"));
  assert.equal(academicI90.printedCredits, 20);
  assert.ok(plan.audit.anomalies.some(({ field }) => field === "credits.I90"));
});
