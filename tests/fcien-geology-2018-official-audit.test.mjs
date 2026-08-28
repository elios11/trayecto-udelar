import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-geologia-2018.json");
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

test("proyecta el catálogo flexible, el trabajo final y nombres de materias íntegros", () => {
  const pathway = plan.pathways["trayectoria-individual"];
  assert.deepEqual(pathway.periods.map(({ label }) => label), [
    "Tramo común · Científico-básica",
    "Tramo común · Geología fundamental",
    "Tramo común · Profundización",
    "Tramo de orientación · Científico-básica",
    "Tramo de orientación · Geología fundamental",
    "Tramo de orientación · Profundización",
    "Reflexión científica y formación general",
    "Trabajo final",
    "Validación de egreso",
  ]);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => courseIds.length), [32, 29, 24, 13, 14, 33, 74, 1, 1]);
  assert.equal(plan.courses.length, 221);
  assert.equal(plan.rules.length, 220);
  assert.equal(plan.courses.some(({ name }) => /^Créditos:/i.test(name)), false);
  assert.equal(plan.courses.find(({ bedeliasCode }) => bedeliasCode === "BL01").name, "Bioética y Ética del Investigador");
  assert.equal(plan.courses.find(({ bedeliasCode }) => bedeliasCode === "FQ-305EU").name, "Bases Jurídicas de la Empresa");
  assert.deepEqual(plan.courses.find(({ bedeliasCode }) => bedeliasCode === "GL041").eligibleRequirementIds, ["final-work"]);
  assert.match(pathway.description, /no son menciones ni títulos certificados separados/i);
});
