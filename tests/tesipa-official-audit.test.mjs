import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const source = await readJson("data/cucel/sistemas-integrados-produccion-agropecuaria-2022-trajectory-review.json");
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cucel-tecnologo-en-sistemas-integrados-de-produccion-agropecuaria-2022.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const audit = registry.audits.find((entry) => entry.identity === source.auditIdentity);
const review = reviews.reviews.find((entry) => entry.planId === source.planId);
const inventoryEntry = inventory.plans.find((entry) => entry.planId === source.planId);
const expectedPeriodLabels = ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5", "Semestre 6"];

const projectedCourseIdBySourceId = new Map();
for (const course of projection.courses) {
  for (const identity of [course.id, course.bedeliasCode, course.sourceCourseId].filter(Boolean)) {
    projectedCourseIdBySourceId.set(identity, course.id);
  }
}
projectedCourseIdBySourceId.set("trabajo-final", "cucel-trabajo-final");

test("publica un único TESIPA Plan 2022 de seis semestres y 270 créditos en Melo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(projection.plan.year, "2022");
  assert.equal(projection.plan.degreeTitle, "Tecnólogo en Sistemas Integrados de Producción Agropecuaria");
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.plan.minCredits, 270);
  assert.equal(source.publication.openEnrollmentAtReview, null);
  assert.deepEqual(projection.campuses, [{
    id: "melo-cerro-largo",
    label: "Melo, Cerro Largo",
    official: true,
    defaultPathwayId: "personalizada",
  }]);
  assert.deepEqual(projection.plan.sharedWith, ["Facultad de Agronomía", "Facultad de Veterinaria"]);
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});

test("controla el egreso como 167 obligatorios, 79 flexibles y 24 de Trabajo Final", () => {
  assert.deepEqual(source.creditModel.totals, {
    mandatoryCourses: 167,
    flexible: 79,
    finalProject: 24,
    degree: 270,
  });
  const expected = {
    "integrated-production": 64,
    "natural-resources": 37,
    "economic-social": 26,
    "integrative-activities": 40,
    "flexible-credits": 79,
    "final-project": 24,
  };
  const credential = projection.creditStructure.credentials[0];
  assert.equal(credential.minTotalCredits, 270);
  assert.deepEqual(Object.fromEntries(credential.nodeRequirements.map((entry) => [entry.nodeId, entry.minCredits])), expected);
  assert.equal(Object.values(expected).reduce((sum, credits) => sum + credits, 0), 270);
  assert.match(audit.anomalies.find(({ field }) => field === "optionalSemesterTotals").resolution, /81 y 85/);
});

test("versiona fuentes y deja explícito que no hubo inspección visual del PDF", () => {
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    const expectedHash = digest(portion);
    assert.equal(source.fingerprint.sourceHashes[sourceId], expectedHash);
    assert.equal(source.sources.find(({ id }) => id === sourceId).contentHash, expectedHash);
  }
  const impo = source.sources.find(({ id }) => id === "impo-plan-2023");
  assert.equal(impo.visualInspection.status, "blocked");
  assert.deepEqual(impo.visualInspection.visuallyInspectedPdfPages, []);
  assert.match(impo.visualInspection.reason, /Cache miss/);
  assert.ok(audit.anomalies.some(({ field }) => field === "visualInspection"));
});

test("reproduce seis semestres y sólo las dos grillas optativas publicadas", () => {
  assert.deepEqual(Object.keys(projection.publishedPathways), source.projectionBaseline.pathwayIds);
  assert.equal(source.trajectories.find(({ id }) => id === "personalizada").specificOptionalGridPublished, false);
  assert.equal(source.trajectories.find(({ id }) => id === "recursos-naturales").specificOptionalGridPublished, false);
  assert.equal(source.trajectories.find(({ id }) => id === "sistemas-integrados").specificOptionalGridPublished, true);
  assert.equal(source.trajectories.find(({ id }) => id === "economico-social").specificOptionalGridPublished, true);

  for (const sourceTrajectory of source.trajectories) {
    const pathway = projection.publishedPathways[sourceTrajectory.id];
    assert.deepEqual(pathway.periods.map(({ label }) => label), expectedPeriodLabels);
    assert.ok(pathway.periods.every(({ label }) => !/RECURSOS NATURALES|ECONÓMICO Y SOCIAL|ACTIVIDADES/i.test(label)));
    for (const [index, sourcePeriod] of sourceTrajectory.periods.entries()) {
      assert.deepEqual(
        new Set(pathway.periods[index].courseIds),
        new Set(sourcePeriod.courseIds.map((sourceCourseId) => projectedCourseIdBySourceId.get(sourceCourseId))),
        `${sourceTrajectory.id}/${sourcePeriod.label}`,
      );
    }
  }
  assert.equal(Object.values(projection.publishedPathways)
    .flatMap(({ periods }) => periods)
    .reduce((sum, period) => sum + period.courseIds.length, 0), 124);
});

test("promueve sólo SPS y preserva las 42 candidatas con sus IDs", () => {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  assert.equal(projection.courses.length, 84);
  assert.equal(verified.length, 42);
  assert.equal(candidates.length, 42);
  assert.equal(projection.plan.courseCatalogAuditStatus, "partial");
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "SPS").id, "cucel-sps-2");
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "SPS").authorityStatus, "verified");
  assert.deepEqual(Object.fromEntries(["O31T", "CUT-O31T", "CUT-MITMR", "CUT-O33T"].map((code) => {
    const course = projection.courses.find(({ bedeliasCode }) => bedeliasCode === code);
    return [code, { id: course.id, status: course.authorityStatus }];
  })), {
    O31T: { id: "cucel-o31t-2", status: "candidate" },
    "CUT-O31T": { id: "cucel-cut-o31t", status: "candidate" },
    "CUT-MITMR": { id: "cucel-cut-mitmr", status: "candidate" },
    "CUT-O33T": { id: "cucel-cut-o33t", status: "candidate" },
  });
  assert.equal(projection.courseAuthority.records.length, 0);
});

test("modela abreviaturas sin carga como bloques y no como materias inventadas", () => {
  const sourceBlocks = projection.courses.filter((course) => course.fieldProvenance.credits === "official-source-no-load");
  assert.equal(sourceBlocks.length, 38);
  assert.ok(sourceBlocks.every((course) => course.curricularBlock === true
    && course.credits === 0
    && course.creditsPublished === false
    && course.fieldProvenance.credits === "official-source-no-load"));
  assert.equal(projection.courses.find(({ sourceCourseId }) => sourceCourseId === "MIMR").id, "cucel-mimr");
  assert.equal(projection.courses.find(({ sourceCourseId }) => sourceCourseId === "IERN").id, "cucel-iern");
  assert.equal(projection.courses.find(({ sourceCourseId }) => sourceCourseId === "BLD").name, "Botánica de leñosas y dendrología");
});

test("preserva los bloques 5/3/24 sin ubicarlos como cursos semestrales", () => {
  const structuralIds = source.projectionBaseline.preservedStructuralCourseIds;
  for (const courseId of structuralIds) {
    assert.ok(projection.courses.some((course) => course.id === courseId && course.curricularBlock === true));
  }
  const semesterIds = Object.values(projection.publishedPathways).flatMap(({ periods }) => periods.flatMap(({ courseIds }) => courseIds));
  assert.ok(!semesterIds.includes("cucel-sistemas-integrados-obligatorios-no-individualizados"));
  assert.ok(!semesterIds.includes("cucel-flexibles-adicionales-validados"));
  assert.ok(semesterIds.includes("cucel-trabajo-final"));
  for (const pathway of Object.values(projection.publishedPathways)) {
    assert.ok(pathway.catalogCourseIds.includes("cucel-sistemas-integrados-obligatorios-no-individualizados"));
    assert.ok(pathway.catalogCourseIds.includes("cucel-flexibles-adicionales-validados"));
  }
});

test("registra la correspondencia completa en revisión e inventario", () => {
  assert.equal(review.state, "official-trajectory-reproduced");
  assert.equal(review.projectionMechanism, "official-profiles");
  assert.equal(review.evidence.compareCoursePlacements, true);
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.currentProjection.primary, "official-profiles");
  assert.equal(inventoryEntry.evidence.expectedCoursePlacements, 124);
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 124);
  assert.deepEqual(inventoryEntry.evidence.pathways, source.projectionBaseline.pathwayIds.map((id) => ({ id, periodCount: 6 })));
});
