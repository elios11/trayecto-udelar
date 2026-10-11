import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

const source = readJson("data/fagro/ingenieria-agronomica-2020-trajectory-review.json");
const projection = readJson("app/data/bedelias-generated/bedelias-fagro-ingeniero-agronomo-2020.json");
const inventory = readJson("data/official-trajectories/inventory.json");
const snapshot = readJson("data/bedelias/fagro-ingeniero-agronomo-2020.json");
const blockById = new Map(source.blocks.map((block) => [block.id, block]));

test("D03ai conserva evidencia reproducible del Plan 2020 y sus límites de autoridad", () => {
  assert.equal(source.publication.officialPlanYear, "2020");
  assert.equal(source.publication.minimumCredits, 450);
  assert.equal(source.publication.durationSemesters, 10);
  assert.equal(source.publication.mandatorySequence, false);
  assert.deepEqual(source.creditRequirements.filter(({ parentId }) => !parentId).map(({ minCredits }) => minCredits), [90, 180, 180]);
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    assert.equal(source.fingerprint.sourceHashes[sourceId], digest(portion));
    assert.equal(source.sources.find(({ id }) => id === sourceId).contentHash, digest(portion));
  }

  const plan = source.sources.find(({ id }) => id === "plan-2020");
  const implementation = source.sources.find(({ id }) => id === "arcusur-implementation-2022");
  assert.equal(plan.rawPdfContentHash, "sha256:6013c05243034b6894fb7e53def80225b7c0a5f8d0fba4c7da60314c61c1f308");
  assert.deepEqual(plan.visuallyInspectedPdfPages, [4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(implementation.rawPdfContentHash, "sha256:42a01f916ff96e2a0e42d3ee5556ebec9337dceead7615f838411f50fea63bf7");
  assert.deepEqual(implementation.visuallyInspectedPdfPages, [51, 52]);
  assert.match(source.sourcePortions["career-page"].boundary, /Plan 1989/);
  assert.equal(source.currentOffer2026.projectionAuthority, false);
  assert.match(source.currentOffer2026.reason, /oferta (?:año )?2026/i);
});

test("las dos grillas tentativas reproducen diez semestres de 45 créditos", () => {
  assert.equal(source.blocks.length, 61);
  assert.deepEqual(source.trajectories.map(({ id }) => id), ["maximo-afo-iii", "minimo-afo-iii"]);
  assert.deepEqual(source.trajectories.map(({ periods }) => periods.reduce((total, period) => total + period.courseIds.length, 0)), [45, 49]);

  for (const trajectory of source.trajectories) {
    assert.equal(trajectory.periods.length, 10);
    assert.deepEqual(trajectory.periods.map(({ label }) => label), Array.from({ length: 10 }, (_, index) => `Semestre ${index + 1}`));
    const totals = trajectory.periods.map((period) => period.courseIds.reduce((total, id) => total + blockById.get(id).credits, 0));
    assert.deepEqual(totals, Array(10).fill(45));
    assert.equal(totals.reduce((total, credits) => total + credits, 0), 450);
  }
  assert.equal(source.blocks.some(({ name }) => /Plan 1989/i.test(name)), false);
});

test("la proyección publica sólo los bloques oficiales y conserva 717 candidatas recuperables", () => {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  assert.equal(snapshot.plan.courses.length, 717);
  assert.equal(verified.length, 61);
  assert.equal(candidates.length, 717);
  assert.equal(new Set(candidates.map(({ bedeliasCode }) => bedeliasCode)).size, 717);
  assert.equal(projection.courses.length, 778);
  assert.equal(projection.plan.courseCatalogAuditStatus, "partial");
  assert.equal(projection.publishedRules.length, 0);
  assert.match(projection.plan.notice, /oferta 2026/);
  assert.match(projection.plan.notice, /Plan 1989/);

  const candidateIds = new Set(candidates.map(({ id }) => id));
  for (const trajectory of source.trajectories) {
    const pathway = projection.publishedPathways[trajectory.id];
    assert.equal(pathway.periods.length, 10);
    assert.equal(pathway.periods.flatMap(({ courseIds }) => courseIds).some((id) => candidateIds.has(id)), false);
    assert.equal(pathway.periods.reduce((total, period) => total + period.courseIds.length, 0),
      trajectory.periods.reduce((total, period) => total + period.courseIds.length, 0));
  }
  assert.deepEqual(projection.campuses.map(({ id }) => id), ["montevideo", "paysandu", "salto"]);
  assert.ok(projection.campuses.every(({ defaultPathwayId }) => defaultPathwayId === "maximo-afo-iii"));
});

test("el inventario confirma las 94 colocaciones de D03ai", () => {
  const entry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.equal(entry.currentProjection.primary, "official-profiles");
  assert.deepEqual(entry.scope.territories, ["Montevideo", "Paysandú", "Salto"]);
  assert.deepEqual(entry.scope.pathwayIds, ["maximo-afo-iii", "minimo-afo-iii"]);
  assert.deepEqual(entry.evidence.pathways, [
    { id: "maximo-afo-iii", periodCount: 10 },
    { id: "minimo-afo-iii", periodCount: 10 },
  ]);
  assert.equal(entry.evidence.expectedCoursePlacements, 94);
  assert.equal(entry.evidence.matchedCoursePlacements, 94);
});
