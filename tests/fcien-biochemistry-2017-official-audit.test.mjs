import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const source = await readJson("data/fcien/bioquimica-2017-trajectory-review.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-bioquimica-2017.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-bioquimica-2017.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en bioquimica:2017");
const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
const requirements = new Map(plan.creditStructure.nodes.map((node) => [node.id, node]));
const byCode = new Map(plan.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));

test("normaliza evidencia reproducible y confirma el Plan 2017 vigente", () => {
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    assert.equal(source.fingerprint.sourceHashes[sourceId], digest(portion));
  }
  assert.deepEqual([source.publication.planYear, source.publication.minimumCredits], ["2017", 360]);
  assert.equal(source.sources.find(({ id }) => id === "proposal-2025").contentHash, "sha256:2679f414fa3a490187e9e3c219720e04dac352ccc7587aa32ccb00516cd47f97");
  assert.match(source.sources.find(({ id }) => id === "faculty-booklet-2019").doesNotSupport.join(" "), /identidad técnica vigente/i);
  assert.equal(snapshot.contentHash, source.bedeliasComparison.snapshotContentHash.replace("sha256:", ""));
});

test("publica un único progreso y ocho semestres de la trayectoria sugerida 2025", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-one-suggested-flexible-pathway");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Bioquímica", 48, 360]);
  assert.deepEqual(Object.keys(plan.pathways), ["formacion-personalizada"]);
  assert.deepEqual(plan.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "formacion-personalizada",
  }]);
  const pathway = plan.pathways["formacion-personalizada"];
  assert.equal(pathway.generatedFallback, undefined);
  assert.deepEqual(pathway.periods.map(({ label }) => label), source.trajectoryConclusion.publicTemporalPeriods);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [6, 5, 5, 4, 3, 5, 6, 2]);
  assert.equal(pathway.periods.flatMap(({ courseIds }) => courseIds).length, 36);
  assert.deepEqual(inventoryEntry.evidence.pathways, [{ id: "formacion-personalizada", periodCount: 8 }]);
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 36);
});

test("preserva los 360 créditos, los mínimos, la Tesina y la validación transversal", () => {
  const credential = plan.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements, [
    { nodeId: "physical-mathematics", minCredits: 60 },
    { nodeId: "chemistry", minCredits: 70 },
    { nodeId: "biology", minCredits: 60 },
    { nodeId: "basic-biochemistry", minCredits: 45 },
    { nodeId: "humanities", minCredits: 6 },
    { nodeId: "orientation", minCredits: 33 },
    { nodeId: "thesis", minCredits: 40 },
  ]);
  assert.equal(credential.minTotalCredits, 360);
  assert.equal(requirements.get("social-productive").minCredits, 0);
  const thesis = byCode.get("BQ200");
  assert.deepEqual({ id: thesis.id, name: thesis.name, credits: thesis.credits, eligible: thesis.eligibleRequirementIds }, {
    id: "fcien-bq200-2",
    name: "Tesina de Grado",
    credits: 40,
    eligible: ["thesis"],
  });
  const thesisPlacements = plan.pathways["formacion-personalizada"].periods
    .filter(({ courseIds }) => courseIds.includes(thesis.id))
    .map(({ label }) => label);
  assert.deepEqual(thesisPlacements, ["Séptimo semestre"]);
  const eighth = plan.pathways["formacion-personalizada"].periods.find(({ label }) => label === "Octavo semestre");
  const continuation = plan.courses.find(({ sourceCourseId }) => sourceCourseId === "bioquimica-tesina-continuacion-s8");
  assert.ok(eighth.courseIds.includes(continuation.id));
  assert.deepEqual([continuation.credits, continuation.creditsPublished, continuation.curricularBlock], [0, false, true]);
  const validation = credential.requiredCourseGroups.find(({ id }) => id === "validacion-final-plan");
  assert.match(validation.label, /10 créditos de formación social\/productiva/i);
  assert.equal(plan.courses.find(({ id }) => id === validation.courseIds[0]).dataStatus, "manual-validation");
});

test("coteja sólo identidades inequívocas y conserva lo demás recuperable", () => {
  const matched = plan.courses.filter(({ authorityStatus, bedeliasCode }) => authorityStatus === "verified" && bedeliasCode);
  const sourceOnly = plan.courses.filter(({ authorityStatus, sourceCourseId }) => authorityStatus === "verified" && sourceCourseId);
  const candidates = plan.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  assert.equal(plan.courses.length, 439);
  assert.equal(matched.length, 28);
  assert.equal(sourceOnly.length, 10);
  assert.equal(sourceOnly.filter(({ creditsPublished }) => creditsPublished === false).length, 6);
  assert.equal(candidates.length, 400);
  assert.deepEqual(sourceOnly.filter(({ creditsPublished }) => creditsPublished !== false).map(({ name, credits }) => [name, credits]), [
    ["Seguridad y Prevención del Riesgo (I y II)", 4],
    ["Fisicoquímica I", 12],
    ["Biofísica", 13],
    ["Fisicoquímica Moderna", 11],
  ]);
  for (const code of ["BG268", "BG031", "BG982", "BG998", "BG952", "B0070", "BG827", "B0069", "BFQ04"]) {
    assert.equal(byCode.get(code).authorityStatus, "candidate", code);
  }
  const presentation = buildRegisteredPlanPresentation("formacion-personalizada", plan);
  assert.equal(presentation.generated, false);
  assert.ok(presentation.courses.every(({ authorityStatus, provisional }) => authorityStatus === "verified" && provisional !== true));
});

test("conserva alternativas y cohorte sin convertir opciones en obligaciones acumulativas", () => {
  const pathway = plan.pathways["formacion-personalizada"];
  const semesterSeven = pathway.periods.find(({ label }) => label === "Séptimo semestre");
  assert.ok(semesterSeven.courseIds.includes(byCode.get("B0015").id));
  assert.ok(semesterSeven.courseIds.includes(byCode.get("BG460").id));
  assert.equal(byCode.get("B0015").elective, true);
  assert.equal(byCode.get("BG460").elective, true);
  assert.ok(pathway.catalogCourseIds.includes(byCode.get("B0020").id));
  assert.ok(pathway.catalogCourseIds.includes(byCode.get("BG046").id));
  assert.ok(!semesterSeven.courseIds.includes(byCode.get("BG046").id));
  assert.match(plan.pathways["formacion-personalizada"].description, /no son acumulativas/i);
  assert.match(source.cohortRule, /anteriores a 2025.*no se exigirán/i);
  assert.ok(!plan.creditStructure.credentials[0].requiredCourseGroups.some(({ id }) => /microbiology|physiology|virology/.test(id)));
});
