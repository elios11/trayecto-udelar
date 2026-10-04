import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildComputacion1997Projection } from "../scripts/build-computacion-1997-trajectories.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const source = await readJson("data/fing/computacion-1997-trayectorias.json");
const projection = await readJson("app/data/computacion-1997-trayectorias.json");
const initialCatalog = await readJson("app/data/computacion-1997-bedelias.json");
const deferredCatalog = await readJson("app/data/computacion-1997-electivas.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

const expectedPlacements = {
  "pi-under-20": [["MI2", "1275"]],
  "pi-20-59": [
    ["MI2", "1023", "1373"], ["1061", "1151", "1030", "1321"], ["1062", "1031", "1027", "1026"],
    ["1466", "1323", "1025", "1033"], ["1537", "1324", "1325", "1944"], ["1911", "1327", "1446", "1945"],
    ["1650", "1783", "1340"], ["1721", "1224", "1225"], ["1730-A"], ["1730-B"],
  ],
  "pi-60-plus": [
    ["PI", "1030", "1023", "1373"], ["1061", "1031", "1026", "1321"], ["1062", "1027", "1324"],
    ["1025", "1323", "1466", "1033"], ["1650", "1537", "1325", "1944"], ["1911", "1327", "1446", "1945"],
    ["1783", "1340", "1151"], ["1721", "1224", "1225"], ["1730-A"], ["1730-B"],
  ],
  "august-pi-20-59": [
    ["MI2", "1023", "1373"], ["1061", "1030", "1027", "1321"], ["1062", "1466", "1323", "1224"],
    ["1026", "1031", "1324", "1537"], ["1911", "1327", "1446", "1225"], ["1025", "1783", "1325", "1944"],
    ["1033", "1721", "1945", "1151"], ["1650", "1340"], ["1730-A"], ["1730-B"],
  ],
  "august-pi-60-plus": [
    ["PI", "1030", "1023", "1373"], ["1061", "1031", "1027", "1321"], ["1062", "1466", "1323", "1224"],
    ["1025", "1026", "1324", "1537"], ["1911", "1327", "1446", "1225"], ["1650", "1783", "1325", "1944"],
    ["1033", "1721", "1151", "1945"], ["1340"], ["1730-A"], ["1730-B"],
  ],
};

test("la fuente curada conserva las cinco variantes y las 126 colocaciones del PDF", () => {
  assert.equal(source.source.documentSha256, "1695f507d635737823ace832d35d24e95aee0ca1508c9fe7445d42423434f089");
  assert.equal(source.source.pages, 5);
  assert.deepEqual(source.trajectories.map(({ id }) => id), Object.keys(expectedPlacements));
  for (const trajectory of source.trajectories) {
    assert.deepEqual(trajectory.periods.map(({ courseIds }) => courseIds), expectedPlacements[trajectory.id], trajectory.id);
  }
  assert.equal(source.trajectories.reduce((sum, trajectory) => sum + trajectory.periods.length, 0), 41);
  assert.equal(source.trajectories.reduce((sum, trajectory) => sum + trajectory.periods.flatMap(({ courseIds }) => courseIds).length, 0), 126);
});

test("las cuatro trayectorias completas suman 329 créditos y PI menor a 20 no inventa continuación", () => {
  const under20 = source.trajectories[0];
  assert.equal(under20.coverage, "partial-official");
  assert.equal(under20.continuation, "not-uniquely-published");
  assert.equal(under20.periods.length, 1);
  assert.equal(under20.periods[0].publishedCredits, null);
  for (const trajectory of source.trajectories.slice(1)) {
    assert.equal(trajectory.coverage, "complete-official");
    assert.equal(trajectory.periods.reduce((sum, period) => sum + period.publishedCredits, 0), 329, trajectory.id);
    assert.equal(trajectory.publishedTotalCredits, 329, trajectory.id);
  }
});

test("la proyección se regenera sin red y coincide exactamente con el artefacto guardado", async () => {
  assert.deepEqual(await buildComputacion1997Projection({ write: false, refreshInventory: false }), projection);
  for (const trajectory of source.trajectories) {
    assert.deepEqual(projection.trajectories[trajectory.id].periods, trajectory.periods, trajectory.id);
  }
});

test("preserva identidades históricas, alternativas y el catálogo diferido", () => {
  assert.equal(deferredCatalog.courses.length, 434);
  assert.equal(deferredCatalog.courses.find(({ id }) => id === "1275").credits, 3);
  assert.equal(initialCatalog.courses.find(({ code }) => code === "1354").credits, 10);
  assert.deepEqual(projection.courses.filter(({ id }) => id.startsWith("1730-")).map(({ id, bedeliasCode, credits }) => ({ id, bedeliasCode, credits })), [
    { id: "1730-A", bedeliasCode: "1730", credits: 15 },
    { id: "1730-B", bedeliasCode: "1730", credits: 15 },
  ]);
  const choices = source.trajectories.slice(1).flatMap(({ periods }) => periods.flatMap(({ choiceGroups = [] }) => choiceGroups));
  assert.ok(choices.every(({ selectedCourseId, alternativeCourseIds }) => selectedCourseId === "1340" && alternativeCourseIds.includes("1354")));
  assert.match(page, /buildExtendedPlan1997Courses\(extendedElectivesData\)\.filter\(\(course\) => !initialPlan1997CourseIds\.has\(course\.id\)\)/);
  assert.match(page, /activeProgressPlanId/);
});

test("el inventario cierra D03s con correspondencia exacta", () => {
  const plan = inventory.plans.find(({ planId }) => planId === "1997");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-profiles");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["pi-under-20", 1], ["pi-20-59", 10], ["pi-60-plus", 10], ["august-pi-20-59", 10], ["august-pi-60-plus", 10],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 126);
  assert.equal(plan.evidence.matchedCoursePlacements, 126);
});

test("la UI ofrece las cinco variantes y usa sus etiquetas oficiales por período", () => {
  assert.match(page, /Object\.entries\(plan1997TrajectoryData\.trajectories\)/);
  assert.match(page, /buildPlan1997Courses\(trajectoryId, plan1997AvailableCourses\)/);
  assert.match(page, /activePlan1997Trajectory\.periods\[Number\(semester\) - 1\]\?\.label/);
  assert.doesNotMatch(page, /Matemática Inicial sustituida por la Prueba Inicial/);
});
