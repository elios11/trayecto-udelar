import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

const source = readJson("data/fder/abogacia-2016-trajectory-review.json");
const projection = readJson("app/data/bedelias-generated/bedelias-fder-abogacia-2016.json");
const inventory = readJson("data/official-trajectories/inventory.json");
const reviews = readJson("data/official-trajectories/reviews.json");
const catalog = readJson("app/data/extracted-academic-catalog.json");

test("D03ap versiona las fuentes, la inspección visual y sus conflictos sin resolverlos por intuición", () => {
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    assert.equal(source.fingerprint.sourceHashes[sourceId], digest(portion));
  }

  const grid = source.sources.find(({ id }) => id === "fder-grid-2024");
  assert.equal(grid.documentSha256, "sha256:3f4269f33517c296173d2000dd108d53cd35ca09a054588b530f1389d06ee0b3");
  assert.deepEqual(grid.visuallyInspectedPdfPages, [1, 2, 3]);
  assert.deepEqual(source.conflicts.map(({ field }) => field), [
    "flexible-periods",
    "grid-total",
    "consultorio-credits",
    "area-distribution",
    "procurador-total",
    "technical-duplicates",
  ]);
});

test("reproduce exactamente las 70 ubicaciones publicadas en diez semestres", () => {
  const expected = source.trajectories[0];
  const actual = projection.publishedPathways[expected.id];
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  const actualSourceRows = actual.periods.map((period) => ({
    label: period.label,
    courseIds: period.courseIds.map((id) => {
      const course = courseById.get(id);
      assert.ok(course, `Falta la fila proyectada ${id}`);
      return course.bedeliasCode ?? course.sourceCourseId;
    }),
  }));

  assert.deepEqual(actualSourceRows, expected.periods.map(({ label, courseIds }) => ({ label, courseIds })));
  assert.equal(actual.periods.length, 10);
  assert.equal(actual.periods.flatMap(({ courseIds }) => courseIds).length, 70);
  assert.equal(new Set(actual.periods.flatMap(({ courseIds }) => courseIds)).size, 70);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "11.1").id, "fder-11-1");
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "12.10").id, "fder-12-10");
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "51.8").id, "fder-51-8");
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "52.9").id, "fder-52-9");
});

test("publica sólo 65 materias exactas y cinco cupos flexibles, manteniendo 506 candidatas fuera de la trayectoria", () => {
  const verifiedBedelias = projection.courses.filter(({ authorityStatus, bedeliasCode }) => authorityStatus === "verified" && bedeliasCode);
  const verifiedSourceOnly = projection.courses.filter(({ authorityStatus, sourceCourseId }) => authorityStatus === "verified" && sourceCourseId);
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const candidateIds = new Set(candidates.map(({ id }) => id));
  const pathway = projection.publishedPathways[source.projectionBaseline.pathwayId];

  assert.deepEqual(verifiedBedelias.map(({ bedeliasCode }) => bedeliasCode).sort(), [...source.authorityPolicy.verifiedSourceCourseIds].sort());
  assert.deepEqual(verifiedSourceOnly.map(({ sourceCourseId }) => sourceCourseId).sort(), [...source.authorityPolicy.verifiedSourceOnlyIdentityKeys].sort());
  assert.deepEqual(verifiedSourceOnly.map(({ credits }) => credits), [6, 12, 14, 8, 8]);
  assert.ok(verifiedSourceOnly.every(({ curricularBlock }) => curricularBlock === true));
  assert.equal(candidates.length, 506);
  assert.equal(projection.courses.length, 577);
  assert.equal(pathway.periods.some(({ courseIds }) => courseIds.some((id) => candidateIds.has(id))), false);
  assert.ok(source.authorityPolicy.aggregateTechnicalRowsRemainCandidates.every((code) =>
    projection.courses.find(({ bedeliasCode }) => bedeliasCode === code)?.authorityStatus === "candidate"));
});

test("mantiene 450 créditos, seis mínimos, los conflictos de Consultorio y Procurador como título intermedio", () => {
  const nodes = projection.creditStructure.nodes.filter(({ parentId }) => parentId === "plan-total");
  assert.deepEqual(nodes.map(({ minCredits }) => minCredits), [66, 114, 90, 54, 78, 48]);
  assert.equal(nodes.reduce((sum, { minCredits }) => sum + minCredits, 0), 450);
  assert.equal(projection.plan.minCredits, 450);

  const consultorio1 = projection.courses.find(({ bedeliasCode }) => bedeliasCode === "51.8");
  const consultorio2 = projection.courses.find(({ bedeliasCode }) => bedeliasCode === "52.9");
  assert.equal(consultorio1.credits, 11);
  assert.equal(consultorio2.credits, 11);
  assert.match(consultorio1.creditConflict, /Bedelías conserva 10/);
  assert.match(consultorio2.creditConflict, /Bedelías conserva 10/);

  const credentials = new Map(projection.creditStructure.credentials.map((credential) => [credential.id, credential]));
  assert.equal(credentials.get("bedelias-degree").minTotalCredits, 450);
  assert.equal(credentials.get("bedelias-degree").nodeRequirements.length, 6);
  const procurador = credentials.get("procurador");
  assert.equal(procurador.title, "Procurador");
  assert.equal(procurador.minTotalCredits, 160);
  assert.deepEqual(procurador.nodeRequirements, [{ nodeId: "flexibles", minCredits: 4 }]);
  assert.equal(procurador.requiredCourseGroups[0].minCompleted, 19);
  assert.equal(procurador.requiredCourseGroups[0].courseIds.length, 19);
});

test("Montevideo y Salto comparten plan, trayectoria y progreso, sin convertir Procurador en carrera", () => {
  assert.deepEqual(projection.campuses, [
    { id: "montevideo", label: "Montevideo", official: true, defaultPathwayId: "grilla-plan-2016" },
    { id: "salto", label: "Salto", official: true, defaultPathwayId: "grilla-plan-2016" },
  ]);
  assert.deepEqual(projection.publishedPathways["grilla-plan-2016"].campusIds, ["montevideo", "salto"]);

  const faculty = catalog.find(({ id }) => id === "bedelias-fder");
  const abogacia = faculty.careers.find(({ id }) => id === "bedelias-fder-abogacia");
  assert.deepEqual(abogacia.plans.map(({ id }) => id), [source.planId]);
  assert.equal(faculty.careers.some(({ label }) => label === "Procurador"), false);

  const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.evidence.expectedCoursePlacements, 70);
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 70);
  assert.deepEqual(inventoryEntry.scope.territories, ["Montevideo", "Salto"]);
  assert.equal(review.state, "official-trajectory-reproduced");
  assert.equal(review.projectionMechanism, "official-periods");
});
