import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const snapshot = await readJson("data/bedelias/cucel-tecnologo-en-produccion-equina-2022.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cucel-tecnologo-en-produccion-equina-2022.json");
const source = await readJson("data/cucel/produccion-equina-2021-trajectory-review.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const audit = registry.audits.find((entry) => entry.identity === source.auditIdentity);
const review = reviews.reviews.find((entry) => entry.planId === source.planId);
const inventoryEntry = inventory.plans.find((entry) => entry.planId === source.planId);

test("normaliza Producción Equina como Plan 2021 de tres años y 270 créditos", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.planYear, "2021");
  assert.equal(projection.plan.year, "2021");
  assert.equal(projection.plan.degreeTitle, "Tecnólogo en Producción Equina");
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.plan.minCredits, 270);
  assert.equal(source.publication.currentAtReview, null);
  assert.equal(snapshot.plan.metadata.duration, "6 meses");
  assert.equal(snapshot.plan.metadata.minCredits, 225);
  assert.ok(audit.anomalies.some((entry) => entry.field === "durationMonths"));
  assert.ok(audit.anomalies.some((entry) => entry.field === "minimumCredits"));

  const catalogCareer = catalog.flatMap((faculty) => faculty.careers)
    .find((career) => career.label === "Tecnólogo en Producción Equina");
  assert.deepEqual(catalogCareer.plans.map((plan) => plan.label), ["Plan 2021 · vigente"]);
});

test("versiona la tabla y sus notas con huellas reproducibles y páginas inspeccionadas", () => {
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    const expectedHash = digest(portion);
    assert.equal(source.fingerprint.sourceHashes[sourceId], expectedHash);
    assert.equal(source.sources.find(({ id }) => id === sourceId).contentHash, expectedHash);
  }
  const impo = source.sources.find(({ id }) => id === "impo-plan-2022");
  assert.deepEqual(impo.visuallyInspectedPdfPages, [13, 14, 15, 16]);
  assert.equal(impo.exampleTablePdfPage, 16);
  assert.equal(impo.exampleTableZeroBasedPageIndex, 15);
  assert.equal(impo.rawPdfContentHash, "sha256:f32dfbb9cb840d11bad695a0add546fa45fcece7637db8f15ea05ffd991360aa");
  assert.equal(source.trajectoryConclusion.mandatorySequence, false);
  assert.equal(source.trajectoryConclusion.optionalOfferMustExceedExample, true);
});

test("conserva el conflicto 55/56 sin romper el total normativo de 270", () => {
  assert.equal(source.creditTable.narrativeOptionalMinimum, 55);
  assert.deepEqual(source.creditTable.totals, { required: 214, optional: 56, total: 270 });
  assert.deepEqual(source.creditTable.resolutionTableTotals, {
    required: 214,
    optional: 55,
    printedTotal: 270,
    arithmeticTotal: 269,
  });
  const credential = projection.creditStructure.credentials[0];
  assert.equal(credential.minTotalCredits, 270);
  assert.equal(credential.nodeRequirements.reduce((sum, entry) => sum + entry.minCredits, 0), 270);
  assert.match(projection.plan.notice, /ejemplo de distribución, no cursado obligatorio/i);
  assert.match(projection.plan.notice, /no exigen cursar todas las opciones/i);
});

test("publica una sola sede sin inventar otra región u oferta actual", () => {
  assert.deepEqual(projection.campuses, [{
    id: "melo-cerro-largo",
    label: "Melo, Cerro Largo",
    official: true,
    defaultPathwayId: "bedelias",
  }]);
  assert.equal(audit.conclusion.canonicalModel, "one-plan-one-offering");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.match(audit.conclusion.reason, /no afirma que exista oferta abierta en 2026/i);
});

test("reproduce seis semestres en orden y corrige las cinco optativas desplazadas", () => {
  const periods = projection.publishedPathways.bedelias.periods;
  assert.equal(projection.publishedPathways.bedelias.label, "Ejemplo oficial de distribución");
  assert.match(projection.publishedPathways.bedelias.description, /flexible y no obligatorio/i);
  assert.deepEqual(periods.map(({ label }) => label), [
    "Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5", "Semestre 6",
  ]);
  assert.deepEqual(periods.map(({ courseIds }) => courseIds.length), [8, 7, 7, 8, 8, 7]);
  const semesterByCode = Object.fromEntries(periods.flatMap((period, index) => period.courseIds.map((courseId) => [
    projection.courses.find(({ id }) => id === courseId).bedeliasCode,
    index + 1,
  ])));
  assert.deepEqual(Object.fromEntries(["INFO", "IT1", "IT2", "PBA", "ECD"].map((code) => [code, semesterByCode[code]])), {
    INFO: 1,
    IT1: 2,
    IT2: 3,
    PBA: 4,
    ECD: 4,
  });
  assert.equal(new Set(periods.flatMap(({ courseIds }) => courseIds)).size, 45);
});

test("preserva IDs/progreso y deja CUR-UNIV sólo como candidata fuera del catálogo publicado", () => {
  for (const [sourceId, expectedId] of Object.entries(source.projectionBaseline.courseIdBySourceId)) {
    assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === sourceId)?.id, expectedId, sourceId);
  }
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  assert.equal(verified.length, 45);
  assert.deepEqual(candidates.map(({ bedeliasCode }) => bedeliasCode), ["CUR-UNIV"]);
  assert.equal(projection.plan.courseCatalogAuditStatus, "partial");
  assert.ok(!projection.publishedPathways.bedelias.periods.flatMap(({ courseIds }) => courseIds).includes(candidates[0].id));
  assert.ok(!projection.creditStructure.credentials[0].requiredCourseGroups
    .flatMap(({ courseIds }) => courseIds).includes(candidates[0].id));
  assert.equal(projection.courseAuthority.records.length, 0);
});

test("registra la correspondencia estructurada completa en revisión e inventario", () => {
  assert.equal(review.state, "official-trajectory-reproduced");
  assert.equal(review.projectionMechanism, "official-periods");
  assert.equal(review.evidence.compareCoursePlacements, true);
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.currentProjection.primary, "official-periods");
  assert.equal(inventoryEntry.evidence.expectedCoursePlacements, 45);
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 45);
  assert.deepEqual(inventoryEntry.evidence.pathways, [{ id: "bedelias", periodCount: 6 }]);
});
