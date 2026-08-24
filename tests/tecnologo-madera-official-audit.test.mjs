import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const snapshot = await readJson("data/bedelias/cur-tecnologo-en-madera-2012.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cur-tecnologo-en-madera-2012.json");
const audit = registry.audits.find((entry) => entry.identity === "tecnologo en madera:2012");

const flattenComposition = (node) => [node, ...(node.children ?? []).flatMap(flattenComposition)];

test("normaliza el plan conjunto vigente en Rivera", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-joint-plan-flexible-by-areas");
  assert.equal(projection.plan.year, "2011");
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.plan.minCredits, 270);
  assert.deepEqual(projection.plan.sharedWith, ["Facultad de Ingeniería", "DGETP-UTU"]);
  assert.deepEqual(projection.campuses.map((campus) => campus.label), ["Rivera"]);

  const faculty = catalog.find((candidate) => candidate.label === "Facultad de Agronomía");
  const career = faculty.careers.find((candidate) => candidate.label === "Tecnólogo en Madera");
  assert.deepEqual(career.plans.map((plan) => plan.label), ["Plan 2011 · vigente"]);
});

test("controla los mínimos por área y todas las actividades nominales obligatorias", () => {
  const credential = projection.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements, [
    { nodeId: "basic-mathematics", minCredits: 22 },
    { nodeId: "basic-physical", minCredits: 27 },
    { nodeId: "basic-biochemical", minCredits: 45 },
    { nodeId: "technology", minCredits: 110 },
    { nodeId: "technology-common", minCredits: 66 },
    { nodeId: "complementary", minCredits: 34 },
  ]);
  assert.equal(credential.minTotalCredits, 270);
  assert.deepEqual(
    credential.requiredCourseGroups.map((group) => [group.id, group.minCompleted, group.courseIds.length]),
    [
      ["mandatory-introductory-workshop", 1, 1],
      ["mandatory-common-technology", 10, 10],
      ["mandatory-complementary-activities", 4, 4],
      ["validacion-final-plan", 1, 1],
    ],
  );
});

test("conserva una sola vez cada unidad de la composición flexible", () => {
  const rawMatterNodes = flattenComposition(snapshot.plan.composition).filter((node) => node.nodeType === "Materia");
  const projectedCourses = projection.courses.filter((course) => course.dataStatus !== "manual-validation");
  const projectedKeys = projectedCourses.map((course) => `${course.bedeliasCode}:${course.name}`);

  assert.equal(rawMatterNodes.length, 63);
  assert.equal(projectedCourses.length, 63);
  assert.equal(new Set(projectedKeys).size, projectedKeys.length);
  assert.equal(projectedCourses.reduce((sum, course) => sum + course.credits, 0), 406);
  assert.ok(projectedCourses.reduce((sum, course) => sum + course.credits, 0) > projection.plan.minCredits);
  assert.match(projection.plan.notice, /currículo coherente aprobado por la Comisión/i);
});

test("no presenta los currículos tipo como menciones ni trayectorias certificadas", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.deepEqual(projection.creditStructure.credentials.map((credential) => credential.title), ["Tecnólogo en Madera"]);
  assert.match(audit.conclusion.normalization.join(" "), /combinaciones tipo.*no.*menciones|no.*trayectorias/i);
});
