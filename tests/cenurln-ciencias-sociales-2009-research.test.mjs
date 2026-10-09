import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es-UY")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const source = await readJson("data/cenurln/ciencias-sociales-2009.json");
const snapshot = await readJson("data/bedelias/cenurln-licenciatura-en-ciencias-sociales-2009.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cenurln-licenciatura-en-ciencias-sociales-2009.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const audits = await readJson("data/bedelias/audits/official-source-audits.json");

const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
const review = reviews.reviews.find(({ planId }) => planId === source.planId);
const audit = audits.audits.find(({ identity }) => identity === source.auditIdentity);

test("D03ab resuelve la identidad como Plan 2009 sin ocultar la contradicción Plan 1992", () => {
  assert.equal(source.publication.identityStatus, "confirmed-plan-2009");
  assert.equal(source.sourcePortions.identityResolution.acceptedPlanYear, "2009");
  assert.match(source.sourcePortions.identityResolution.conflictingClaim, /Plan 1992/);
  assert.match(source.sourcePortions.identityResolution.resolution, /contenido desactualizado/);
  assert.ok(source.sources.some(({ id }) => id === "fcs-plan-2009"));
  assert.ok(source.sources.some(({ id }) => id === "udelar-carreras-interior"));
  assert.ok(source.sources.filter(({ id }) => id.includes("plan-2009") && id.includes("call")).length >= 3);
  assert.equal(audit.planYear, "2009");
  assert.equal(audit.reviewedAt, "2026-10-09");
  assert.match(audit.anomalies.find(({ field }) => field === "planYear").resolution, /Plan 1992/);
});

test("la evidencia normalizada conserva huella, créditos y alcance histórico exactos", () => {
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  const structure = source.sourcePortions.approvedCreditStructure;
  assert.equal(structure.initialCycle.modules.reduce((sum, module) => sum + module.credits, 0), 120);
  assert.equal(structure.advancedCycle.modules.reduce((sum, module) => sum + module.credits, 0), 240);
  assert.equal(structure.totalCredits, 360);

  const grid = source.sourcePortions.recoveredHistoricalGrid;
  assert.equal(grid.status, "historical-official-current-validity-unresolved");
  assert.equal(grid.periods.length, 6);
  assert.equal(grid.periods.flatMap(({ courses }) => courses).length, 27);
  assert.deepEqual(grid.periods.map(({ courses }) => courses.reduce((sum, course) => sum + course.credits, 0)), [24, 38, 40, 38, 38, 32]);
  assert.equal(grid.periods.flatMap(({ courses }) => courses).reduce((sum, course) => sum + course.credits, 0) + grid.finalWork.credits, 240);
  assert.equal(source.sources.find(({ id }) => id === "dcs-grid-2012-archived").contentHash, "sha256:aa5d96ac67c9ea2fe9c01e9b99439b0e00a395ac44c534e7408edbc8c86e2936");
});

test("las coincidencias históricas son exactas pero ninguna se promueve", () => {
  const snapshotCourses = snapshot.plan.courses;
  assert.equal(snapshotCourses.length, 425);
  assert.equal(source.bedeliasComparison.exactHistoricalMatches.length, 15);
  for (const match of source.bedeliasComparison.exactHistoricalMatches) {
    const candidates = snapshotCourses.filter(({ code }) => code === match.sourceCourseId);
    assert.equal(candidates.length, 1, match.sourceCourseId);
    assert.equal(normalize(candidates[0].name), normalize(match.sourceName), match.sourceCourseId);
    assert.equal(candidates[0].credits, match.credits, match.sourceCourseId);
  }
  assert.equal(source.bedeliasComparison.promotedCourseCount, 0);
  assert.equal(source.bedeliasComparison.candidateRetainedCount, 425);
  assert.equal(source.authorityPolicy.verifiedSourceCourseIds.length, 0);
  assert.equal(projection.courses.length, 425);
  assert.ok(projection.courses.every(({ authorityStatus }) => authorityStatus === "candidate"));
  assert.equal(projection.publishedPathways.bedelias.periods.length, 0);
});

test("el inventario deja un checkpoint research-pending y no importa mallas FCS ajenas", () => {
  assert.equal(review.state, "research-pending");
  assert.equal(review.projectionMechanism, "administrative-composition");
  assert.equal(review.evidence.sourceDataPath, "data/cenurln/ciencias-sociales-2009.json");
  assert.equal(review.evidence.historicalGridPeriodCount, 6);
  assert.equal(review.evidence.historicalExactBedeliasMatches, 15);
  assert.equal(review.evidence.promotedCourseCount, 0);
  assert.equal(inventoryEntry.state, "research-pending");
  assert.equal(inventoryEntry.currentProjection.primary, "administrative-composition");
  assert.equal(inventoryEntry.evidence.kind, "insufficient-current-trajectory-evidence");
  assert.match(inventoryEntry.evidence.reason, /falta confirmar la vigencia actual/i);
  assert.ok(inventoryEntry.conflictNotes.some((note) => /otras licenciaturas FCS/.test(note)));
  assert.ok(source.sources.every(({ url }) => !/ciencia-politica|licenciatura-en-desarrollo/i.test(url)));
});
