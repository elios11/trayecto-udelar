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

const source = await readJson("data/fartes/composicion-1987.json");
const snapshot = await readJson("data/bedelias/fartes-licenciatura-en-composicion-1987.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fartes-licenciatura-en-composicion-1987.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const audits = await readJson("data/bedelias/audits/official-source-audits.json");

const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
const review = reviews.reviews.find(({ planId }) => planId === source.planId);
const audit = audits.audits.find(({ identity }) => identity === source.auditIdentity);

test("D03as conserva una reconstrucción secundaria exacta sin presentarla como plan oficial", () => {
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  assert.equal(source.publication.trajectoryStatus, "research-pending");
  assert.equal(source.authorityPolicy.allowSecondaryGridProjection, false);
  assert.deepEqual(source.authorityPolicy.verifiedSourceCourseIds, []);

  const grid = source.sourcePortions.secondaryHistoricalGrid;
  assert.equal(grid.status, "secondary-reconstruction-original-authority-unavailable");
  assert.equal(grid.periods.length, 7);
  assert.deepEqual(grid.periods.map(({ courses }) => courses.length), [8, 5, 6, 6, 5, 4, 4]);
  assert.equal(grid.periods.flatMap(({ courses }) => courses).length, 38);
  assert.equal(grid.creditsPublished, false);
  assert.equal(grid.courseCodesPublished, false);
  assert.ok(grid.originalAuthorityRecords.some((record) => record.includes("2642/87")));
  assert.ok(grid.originalAuthorityRecords.some((record) => record.includes("7704/87")));
  assert.ok(source.sources.every(({ trajectoryEvidence }) => trajectoryEvidence === false));
  assert.ok(source.sourceExclusions.some(({ source: name }) => name.includes("Plan 2005")));
});

test("la búsqueda institucional registra la brecha sin afirmar ausencia", () => {
  const search = source.sourcePortions.institutionalSearch;
  assert.equal(search.status, "primary-records-not-located");
  assert.deepEqual(search.queries.map(({ authority }) => authority), [
    "Facultad de Artes e Instituto de Música",
    "Portal central y Comisión Sectorial de Enseñanza, Universidad de la República",
    "Repositorio Colibri, Universidad de la República",
    "Diario Oficial e IMPO",
  ]);
  assert.equal(source.sourcePortions.missingInstitutionalPlanReference.status, "referenced-but-not-exposed");
  assert.match(source.checkpoint.requiredEvidenceToClose, /2642\/87 y 7704\/87/);
  assert.doesNotMatch(JSON.stringify(source), /no-official-trajectory-documented/);
  assert.equal(audit.reviewedAt, "2026-10-17");
  assert.ok(audit.anomalies.some(({ field }) => field === "trajectory"));
});

test("las 129 identidades técnicas mantienen IDs, estado candidate y cero créditos", () => {
  assert.equal(collectMatterNodes(snapshot.plan).length, 129);
  assert.equal(snapshot.contentHash, source.bedeliasComparison.snapshotContentHash.replace("sha256:", ""));

  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  assert.equal(projection.courses.length, 130);
  assert.equal(candidates.length, 129);
  assert.ok(candidates.every(({ credits }) => credits === 0));
  assert.equal(new Set(projection.courses.map(({ id }) => id)).size, 130);
  assert.equal(digest(candidates.map(({ id }) => id).sort()), source.bedeliasComparison.candidateCourseIdsHash);
  assert.deepEqual(verified.map(({ id, credits }) => ({ id, credits })), [
    { id: "fartes-validacion-final-plan", credits: 0 },
  ]);
  assert.equal(source.bedeliasComparison.promotedCourseCount, 0);
});

test("el inventario conserva research-pending y sólo publica la validación de egreso", () => {
  assert.equal(review.state, "research-pending");
  assert.equal(review.projectionMechanism, "administrative-composition");
  assert.equal(review.evidence.kind, "insufficient-primary-trajectory-evidence");
  assert.equal(review.evidence.secondaryGridPeriodCount, 7);
  assert.equal(review.evidence.secondaryGridCoursePlacements, 38);
  assert.equal(review.evidence.promotedCourseCount, 0);
  assert.equal(review.evidence.candidateRetainedCount, 129);

  assert.equal(inventoryEntry.state, "research-pending");
  assert.equal(inventoryEntry.currentProjection.primary, "administrative-composition");
  assert.equal(inventoryEntry.evidence.kind, "insufficient-primary-trajectory-evidence");
  assert.equal(inventoryEntry.evidence.promotedCourseCount, 0);
  assert.equal(inventoryEntry.evidence.candidateRetainedCount, 129);
  assert.deepEqual(projection.publishedPathways.bedelias.periods, [
    { label: "Validación de egreso", courseIds: ["fartes-validacion-final-plan"] },
  ]);
  assert.equal(projection.source.reviewedAt, source.reviewedAt);
});
