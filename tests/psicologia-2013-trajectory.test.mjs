import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifySource } from "../scripts/build-psicologia-2013.mjs";

const readJson = (relative) => JSON.parse(readFileSync(new URL(`../${relative}`, import.meta.url), "utf8"));
const source = readJson("data/psico/psicologia-2013-malla-2025.json");
const projection = readJson("app/data/bedelias-generated/bedelias-psico-licenciatura-en-psicologia-2013.json");
const inventory = readJson("data/official-trajectories/inventory.json");
const coursesById = new Map(projection.courses.map((course) => [course.id, course]));

test("la malla actual de Psicología conserva ocho semestres y los espacios transversales", () => {
  verifySource(source, projection);
  assert.equal(source.source.printedUpdate, "diciembre de 2025");
  assert.equal(source.source.documentSha256, "728c7ea5b865364e66d662a253cf24480190e4b3d8cf8016c5dedcf2d44ec5e8");
  assert.equal(Object.values(source.moduleMinimums).reduce((sum, value) => sum + value, 0), 315);
  assert.equal(source.cooperationMaximumCredits, 5);
  assert.deepEqual(source.crossPeriodBlocks.find(({ id }) => id === "psico-malla-idioma").publishedCodes, ["643G", "644G"]);
  assert.equal(source.crossPeriodBlocks.find(({ id }) => id === "psico-malla-practica-graduacion").credits, 20);
});

test("la proyección publica cada identidad curricular sin multiplicar bandas ni admitir candidatas", () => {
  const pathway = projection.publishedPathways["malla-2025"];
  assert.ok(pathway);
  assert.deepEqual(pathway.periods.map(({ label }) => label), source.periods.map(({ semester }) => `Semestre ${semester}`));
  const placements = pathway.periods.flatMap(({ courseIds }) => courseIds);
  assert.equal(placements.length, 43);
  assert.equal(new Set(placements).size, placements.length);
  assert.ok(placements.every((id) => coursesById.get(id)?.authorityStatus === "verified"));
  assert.ok(placements.includes("psico-psico-malla-intervenciones"));
  assert.ok(!placements.includes("psico-662a"));
  assert.equal(coursesById.get("psico-662a").authorityStatus, "candidate");
  assert.deepEqual(["psico-643g", "psico-644g"].map((id) => coursesById.get(id)?.authorityStatus), ["verified", "verified"]);
  assert.equal(projection.courses.filter(({ authorityStatus, bedeliasCode }) => authorityStatus === "verified" && bedeliasCode).length, 40);
  assert.equal(projection.courses.filter(({ authorityStatus, sourceCourseId }) => authorityStatus === "verified" && sourceCourseId?.startsWith("psico-malla-")).length, 10);
  assert.deepEqual(projection.plan.campuses.map(({ defaultPathwayId }) => defaultPathwayId), ["malla-2025", "malla-2025", "malla-2025"]);
  assert.deepEqual(Object.fromEntries(projection.creditStructure.nodes.filter(({ id }) => id !== "plan-total")
    .map(({ id, minCredits }) => [id, minCredits])),
  { psychology: 145, methodology: 60, practice: 50, articulation: 40, referential: 20, cooperation: 0 });
});

test("el inventario valida exactamente las ubicaciones auditadas y declara el alcance parcial", () => {
  const entry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.equal(entry.evidence.partial, true);
  assert.equal(entry.evidence.expectedCoursePlacements, 43);
  assert.equal(entry.evidence.matchedCoursePlacements, 43);
  assert.equal(entry.evidence.pathways[0].periodCount, 8);
});
