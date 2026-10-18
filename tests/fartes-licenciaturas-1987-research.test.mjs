import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

function collectMatterNodes(node, output = []) {
  if (Array.isArray(node)) {
    for (const child of node) collectMatterNodes(child, output);
    return output;
  }
  if (!node || typeof node !== "object") return output;
  if (node.nodeType === "Materia") output.push(node);
  for (const value of Object.values(node)) collectMatterNodes(value, output);
  return output;
}

const planCases = [
  {
    slug: "direccion-coral",
    planId: "bedelias-fartes-licenciatura-en-direccion-coral-1987",
    auditIdentity: "licenciatura en direccion coral:1987",
    periodLengths: [8, 7, 6, 6, 6, 3, 3],
    sourcePages: [49, 50, 51],
    candidateCount: 122,
    projectionCourseCount: 123,
    candidateIdsHash: "sha256:c1bccfdfaf2d493c87932d66d03019e4ab72a48f1cf9898d92e4d66048739983",
  },
  {
    slug: "direccion-orquestal",
    planId: "bedelias-fartes-licenciatura-en-direccion-orquestal-1987",
    auditIdentity: "licenciatura en direccion orquestal:1987",
    periodLengths: [8, 5, 6, 6, 5, 4, 4],
    sourcePages: [49, 50, 51],
    candidateCount: 119,
    projectionCourseCount: 120,
    candidateIdsHash: "sha256:42333bf4b3aa835d8b28c02a3c8c66acab476c2b47f50e257b7ace3f402de624",
  },
  {
    slug: "musicologia",
    planId: "bedelias-fartes-licenciatura-en-musicologia-1987",
    auditIdentity: "licenciatura en musicologia:1987",
    periodLengths: [7, 6, 6, 6],
    sourcePages: [53, 54],
    candidateCount: 144,
    projectionCourseCount: 145,
    candidateIdsHash: "sha256:108b30369b448268b1aeb2174315bbb94da1675fd164f25e125fbee7da8d26a4",
  },
];

const inventory = await readJson("data/official-trajectories/inventory.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const audits = await readJson("data/bedelias/audits/official-source-audits.json");

for (const planCase of planCases) {
  planCase.source = await readJson(`data/fartes/${planCase.slug}-1987.json`);
  planCase.snapshot = await readJson(`data/bedelias/fartes-licenciatura-en-${planCase.slug}-1987.json`);
  planCase.projection = await readJson(`app/data/bedelias-generated/${planCase.planId}.json`);
  planCase.inventoryEntry = inventory.plans.find(({ planId }) => planId === planCase.planId);
  planCase.review = reviews.reviews.find(({ planId }) => planId === planCase.planId);
  planCase.audit = audits.audits.find(({ identity }) => identity === planCase.auditIdentity);
}

test("D03at conserva las tres reconstrucciones secundarias sin presentarlas como planes oficiales", () => {
  for (const planCase of planCases) {
    const { source } = planCase;
    assert.equal(source.fingerprint.value, digest(source.sourcePortions), planCase.slug);
    assert.equal(source.publication.trajectoryStatus, "research-pending", planCase.slug);
    assert.equal(source.authorityPolicy.allowSecondaryGridProjection, false, planCase.slug);
    assert.deepEqual(source.authorityPolicy.verifiedSourceCourseIds, [], planCase.slug);

    const grid = source.sourcePortions.secondaryHistoricalGrid;
    assert.equal(grid.status, "secondary-reconstruction-original-authority-unavailable", planCase.slug);
    assert.deepEqual(grid.periods.map(({ courses }) => courses.length), planCase.periodLengths, planCase.slug);
    assert.equal(grid.periods.flatMap(({ courses }) => courses).length,
      planCase.periodLengths.reduce((total, count) => total + count, 0), planCase.slug);
    assert.deepEqual(grid.sourcePages, planCase.sourcePages, planCase.slug);
    assert.equal(grid.creditsPublished, false, planCase.slug);
    assert.equal(grid.courseCodesPublished, false, planCase.slug);
    assert.ok(grid.originalAuthorityRecords.some((record) => record.includes("2642/87")), planCase.slug);
    assert.ok(grid.originalAuthorityRecords.some((record) => record.includes("7704/87")), planCase.slug);
    assert.ok(source.sources.every(({ trajectoryEvidence }) => trajectoryEvidence === false), planCase.slug);
    assert.ok(source.sourceExclusions.some(({ source: name }) => name.includes("Plan 2005")), planCase.slug);
  }
});

test("la búsqueda institucional mantiene una brecha concreta sin afirmar ausencia", () => {
  const expectedAuthorities = [
    "Facultad de Artes e Instituto de Música",
    "Portal central y Comisión Sectorial de Enseñanza, Universidad de la República",
    "Repositorio Colibri, Universidad de la República",
    "Diario Oficial e IMPO",
  ];
  for (const planCase of planCases) {
    const { source, audit } = planCase;
    assert.equal(source.sourcePortions.institutionalSearch.status, "primary-records-not-located", planCase.slug);
    assert.deepEqual(source.sourcePortions.institutionalSearch.queries.map(({ authority }) => authority), expectedAuthorities, planCase.slug);
    assert.equal(source.sourcePortions.missingInstitutionalPlanReference.status, "referenced-but-not-exposed", planCase.slug);
    assert.match(source.checkpoint.requiredEvidenceToClose, /2642\/87 y 7704\/87/, planCase.slug);
    assert.doesNotMatch(JSON.stringify(source), /no-official-trajectory-documented/, planCase.slug);
    assert.equal(audit.reviewedAt, "2026-10-17", planCase.slug);
    assert.ok(audit.anomalies.some(({ field }) => field === "trajectory"), planCase.slug);
  }
});

test("las identidades técnicas conservan IDs, estado candidate y créditos desconocidos como cero", () => {
  for (const planCase of planCases) {
    const { source, snapshot, projection } = planCase;
    assert.equal(collectMatterNodes(snapshot.plan).length, planCase.candidateCount, planCase.slug);
    assert.equal(snapshot.contentHash, source.bedeliasComparison.snapshotContentHash.replace("sha256:", ""), planCase.slug);

    const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
    const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
    assert.equal(projection.courses.length, planCase.projectionCourseCount, planCase.slug);
    assert.equal(candidates.length, planCase.candidateCount, planCase.slug);
    assert.ok(candidates.every(({ credits }) => credits === 0), planCase.slug);
    assert.equal(new Set(projection.courses.map(({ id }) => id)).size, planCase.projectionCourseCount, planCase.slug);
    assert.equal(digest(candidates.map(({ id }) => id).sort()), planCase.candidateIdsHash, planCase.slug);
    assert.deepEqual(verified.map(({ id, credits }) => ({ id, credits })), [
      { id: "fartes-validacion-final-plan", credits: 0 },
    ], planCase.slug);
    assert.equal(source.bedeliasComparison.promotedCourseCount, 0, planCase.slug);
  }
});

test("inventario y proyecciones sólo publican la validación final", () => {
  for (const planCase of planCases) {
    const { source, projection, inventoryEntry, review } = planCase;
    assert.equal(review.state, "research-pending", planCase.slug);
    assert.equal(review.projectionMechanism, "administrative-composition", planCase.slug);
    assert.equal(review.evidence.kind, "insufficient-primary-trajectory-evidence", planCase.slug);
    assert.equal(review.evidence.secondaryGridPeriodCount, planCase.periodLengths.length, planCase.slug);
    assert.equal(review.evidence.secondaryGridCoursePlacements,
      planCase.periodLengths.reduce((total, count) => total + count, 0), planCase.slug);
    assert.equal(review.evidence.promotedCourseCount, 0, planCase.slug);
    assert.equal(review.evidence.candidateRetainedCount, planCase.candidateCount, planCase.slug);

    assert.equal(inventoryEntry.state, "research-pending", planCase.slug);
    assert.equal(inventoryEntry.currentProjection.primary, "administrative-composition", planCase.slug);
    assert.equal(inventoryEntry.evidence.kind, "insufficient-primary-trajectory-evidence", planCase.slug);
    assert.equal(inventoryEntry.evidence.promotedCourseCount, 0, planCase.slug);
    assert.equal(inventoryEntry.evidence.candidateRetainedCount, planCase.candidateCount, planCase.slug);
    assert.deepEqual(projection.publishedPathways.bedelias.periods, [
      { label: "Validación de egreso", courseIds: ["fartes-validacion-final-plan"] },
    ], planCase.slug);
    assert.equal(projection.source.reviewedAt, source.reviewedAt, planCase.slug);
  }
});

test("Dirección Coral, Dirección Orquestal, Musicología y el Plan 2005 permanecen separados", () => {
  assert.equal(new Set(planCases.map(({ planId }) => planId)).size, 3);
  assert.equal(new Set(planCases.map(({ auditIdentity }) => auditIdentity)).size, 3);
  assert.equal(new Set(planCases.map(({ review }) => review.evidence.sourceDataPath)).size, 3);
  for (const planCase of planCases) {
    assert.equal(planCase.source.planId, planCase.planId, planCase.slug);
    assert.equal(planCase.source.auditIdentity, planCase.auditIdentity, planCase.slug);
    assert.doesNotMatch(planCase.review.evidence.sourceDataPath, /musica-2005/, planCase.slug);
    assert.doesNotMatch(planCase.review.evidence.projectionDataPath, /musica-2005/, planCase.slug);
  }
  assert.ok(reviews.reviews.some(({ planId }) => planId === "bedelias-fartes-licenciatura-en-musica-2005"));
});
