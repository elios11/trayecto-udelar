import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";
import { validateHumanBiologySource, validateHumanBiologyProjection } from "../scripts/build-fcien-biologia-humana-2004.mjs";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const source = await readJson("data/fcien/biologia-humana-2004-trajectory-review.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-biologia-humana-2004.json");
const projection = await readJson(`app/data/bedelias-generated/${source.planId}.json`);
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
const reviews = await readJson("data/official-trajectories/reviews.json");
const review = reviews.reviews.find(({ planId }) => planId === source.planId);
const inventory = await readJson("data/official-trajectories/inventory.json");
const entry = inventory.plans.find(({ planId }) => planId === source.planId);
const hash = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

test("D03aw cierra sólo la ausencia actual explícita, no la posibilidad futura de trayectorias", () => {
  validateHumanBiologySource(source, snapshot);
  validateHumanBiologyProjection(source, projection, entry);
  assert.equal(review.state, "no-official-trajectory-documented");
  assert.equal(review.evidence.temporary, true);
  assert.match(review.evidence.justification, /Próximamente/);
  assert.match(review.evidence.reviewTrigger, /filas nominales/);
  assert.equal(audit.conclusion.trajectoryStatus, review.state);
  assert.equal(audit.conclusion.trajectorySourceDataPath, review.evidence.sourceDataPath);
  assert.equal(projection.source.reviewedAt, source.reviewedAt);
  assert.match(projection.plan.notice, /recorrido orientativo generado por Trayecto/);
});

test("D03aw guarda huellas de porciones, versiones normativas y fuentes recuperadas", () => {
  assert.equal(source.fingerprint.value, hash(source.sourcePortions));
  for (const item of source.sources) {
    const evidence = review.sources.find(({ url }) => url === item.url);
    assert.equal(evidence.contentHash, hash(source.sourcePortions[item.id]));
    assert.equal(evidence.reviewedAt, source.reviewedAt);
  }
  assert.equal(source.sourcePortions["colibri-record"].year, "2004");
  assert.equal(source.sourcePortions["colibri-record"].citationPlanLabel, "2011");
  assert.deepEqual(source.sourcePortions["impo-plan-2004"].originalCommonSpecificPercentages, [63, 37]);
  assert.deepEqual(source.sourcePortions["impo-correction-2004"].correctedCommonSpecificPercentages, [67, 33]);
  assert.equal(source.sourcePortions["udelar-catalog-current"].durationMonths, 60);
  assert.equal(projection.plan.durationMonths, 48);
});

test("D03aw conserva tres propuestas históricas sin convertirlas en mallas actuales", () => {
  const proposal = source.sourcePortions["cse-initial-proposals-2021"];
  assert.equal(proposal.status, "historical-proposal-current-adoption-not-demonstrated");
  assert.deepEqual(proposal.initialTracks, ["Científico/Tecnológico", "Medicina/biológico", "Social/Humanística"]);
  assert.deepEqual(proposal.proposedCreditsRange, [80, 90]);
  assert.equal(proposal.proposedDurationSemesters, 2);
  assert.deepEqual(proposal.nominalCoursePeriodRows, []);
  assert.equal(proposal.projectionAllowed, false);
  assert.equal(proposal.currentAdoptionEvidence, false);
  assert.deepEqual(Object.keys(projection.pathways), ["curriculo-personalizado"]);
});

test("D03aw conserva 1797 registros y 2032 candidatas sin acreditarlas ni ocultar el recorrido provisorio", () => {
  assert.equal(snapshot.plan.courses.length, 1797);
  assert.equal(source.authorityPolicy.promotedCourseCount, 0);
  const presentation = buildRegisteredPlanPresentation("curriculo-personalizado", projection);
  assert.equal(presentation.label, "Recorrido orientativo generado");
  assert.equal(presentation.generated, true);
  assert.equal(presentation.courses.length, 2032);
  assert.equal(presentation.periods.flatMap(({ courseIds }) => courseIds).length, 48);
  assert.ok(presentation.periods.every(({ label }) => !/semestre|año/i.test(label)));
  assert.ok(presentation.courses.every(({ provisional, eligibleRequirementIds, creditAllocations }) => provisional && eligibleRequirementIds.length === 0 && creditAllocations.length === 0));
  assert.deepEqual(projection.publishedPathways["curriculo-personalizado"].periods.map(({ courseIds }) => courseIds), [["fcien-validacion-final-plan"]]);
  assert.equal(projection.plan.minCredits, 360);
});

test("D03aw rechaza evidencia alterada, promociones y períodos oficiales fabricados", () => {
  const alteredSource = structuredClone(source);
  alteredSource.sourcePortions["fhce-mallas-current"].pendingHeading = "Publicada";
  assert.throws(() => validateHumanBiologySource(alteredSource, snapshot), /Huella/);
  const promoted = structuredClone(projection);
  promoted.courses[0].authorityStatus = "verified";
  assert.throws(() => validateHumanBiologyProjection(source, promoted, entry));
  const invented = structuredClone(projection);
  invented.publishedPathways["curriculo-personalizado"].periods.push({ label: "Semestre 1", courseIds: [invented.courses[0].id] });
  invented.courses[0].authorityStatus = "verified";
  assert.throws(() => validateHumanBiologyProjection(source, invented, entry));
});
