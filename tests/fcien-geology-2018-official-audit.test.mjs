import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";
import { validateGeologyProjection, validateGeologySource } from "../scripts/build-fcien-geologia-2018.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-geologia-2018.json");
const source = await readJson("data/fcien/geologia-2018-trajectory-review.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-geologia-2018.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en geologia:2018");

test("normaliza un único Plan 2018 de Geología en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-one-individual-geology-pathway");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Geología", 48, 360]);
  assert.deepEqual(plan.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "trayectoria-individual",
  }]);
  assert.deepEqual(audit.offerings.map(({ serviceCode }) => serviceCode), ["FCIEN"]);
  assert.deepEqual(Object.keys(plan.pathways), ["trayectoria-individual"]);
});

test("modela los 10 créditos transversales sin inflar el total oficial", () => {
  const credential = plan.creditStructure.credentials[0];
  const byNode = new Map(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.deepEqual(
    ["common-stage", "orientation-stage", "scientific-reflection-general"].map((nodeId) => byNode.get(nodeId)),
    [210, 140, 10],
  );
  assert.equal(["common-stage", "orientation-stage", "scientific-reflection-general"]
    .reduce((sum, nodeId) => sum + byNode.get(nodeId), 0), 360);
  assert.deepEqual(
    ["common-scientific-basic", "common-fundamental-geology", "common-deepening", "final-work"]
      .map((nodeId) => byNode.get(nodeId)),
    [90, 100, 20, 35],
  );
  assert.equal(plan.creditStructure.nodes.find(({ id }) => id === "final-work").parentId, "orientation-stage");
  const validation = credential.requiredCourseGroups.find(({ id }) => id === "validacion-final-plan");
  assert.match(validation.label, /130 créditos.*210 créditos comunes y 90 de orientación/i);
});

test("reproduce sólo la guía inicial oficial 2025 y preserva los candidatos", () => {
  const pathway = plan.pathways["trayectoria-individual"];
  assert.deepEqual(pathway.periods.map(({ label }) => label), ["Primer semestre sugerido (2025)"]);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [7]);
  assert.equal(plan.courses.length, 223);
  assert.equal(plan.rules.length, 220);
  assert.equal(plan.courses.some(({ name }) => /^Créditos:/i.test(name)), false);
  assert.equal(plan.courses.find(({ bedeliasCode }) => bedeliasCode === "BL01").authorityStatus, "candidate");
  assert.equal(plan.courses.find(({ bedeliasCode }) => bedeliasCode === "FQ-305EU").authorityStatus, "candidate");
  assert.deepEqual(plan.courses.find(({ bedeliasCode }) => bedeliasCode === "GL041").eligibleRequirementIds, ["final-work"]);
  assert.match(pathway.description, /No es una malla completa/i);
  const presentation = buildRegisteredPlanPresentation("trayectoria-individual", plan);
  assert.equal(presentation.generated, false);
  assert.equal(presentation.periods[0].courseIds.length, 7);
  assert.ok(presentation.courses.every(({ authorityStatus }) => authorityStatus === "verified"));
});

test("huella y generación offline protegen la frontera de códigos y cargas", () => {
  validateGeologySource(source, snapshot);
  validateGeologyProjection(source, plan, inventory.plans.find(({ planId }) => planId === source.planId));
  const lab = plan.courses.find(({ sourceCourseId }) => sourceCourseId === "geologia-laboratorio-fisica-i-cidu-2025");
  assert.deepEqual([lab.bedeliasCode, lab.credits], [undefined, 3]);
  assert.equal(plan.courses.find(({ bedeliasCode }) => bedeliasCode === "B0025").authorityStatus, "candidate");
  assert.equal(plan.courses.find(({ bedeliasCode }) => bedeliasCode === "B09").authorityStatus, "candidate");
});
