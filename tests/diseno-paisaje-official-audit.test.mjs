import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const snapshot = await readJson("data/bedelias/cure-licenciatura-en-diseno-de-paisaje-2008.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cure-licenciatura-en-diseno-de-paisaje-2008.json");
const audit = registry.audits.find((entry) => entry.identity === "licenciatura en diseno de paisaje:2008");

const flattenComposition = (node) => [node, ...(node.children ?? []).flatMap(flattenComposition)];

test("normaliza el plan conjunto vigente como Plan 2007 en Maldonado", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-joint-plan-flexible-by-axes");
  assert.equal(projection.plan.year, "2007");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.plan.sharedWith, ["Facultad de Agronomía"]);
  assert.deepEqual(projection.campuses.map((campus) => campus.label), ["Maldonado"]);

  const faculty = catalog.find((candidate) => candidate.label === "Facultad de Arquitectura, Diseño y Urbanismo");
  const career = faculty.careers.find((candidate) => candidate.label === "Licenciatura en Diseño de Paisaje");
  assert.deepEqual(career.plans.map((plan) => plan.label), ["Plan 2007 · vigente"]);
});

test("hace operativa la distribución equivalente del Taller Transversal y los cuatro ejes", () => {
  const credential = projection.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements, [
    { nodeId: "transversal-introduction", minCredits: 6 },
    { nodeId: "science-technology", minCredits: 101 },
    { nodeId: "project-practice", minCredits: 160 },
    { nodeId: "theory-history", minCredits: 43 },
    { nodeId: "optional-elective", minCredits: 50 },
  ]);
  assert.equal(credential.nodeRequirements.reduce((sum, requirement) => sum + requirement.minCredits, 0), 360);
  assert.equal(credential.minTotalCredits, 360);
  assert.deepEqual(
    credential.requiredCourseGroups.map((group) => [group.id, group.minCompleted, group.courseIds.length]),
    [["validacion-final-plan", 1, 1]],
  );
});

test("conserva toda la oferta flexible, incluidas las electivas externas de la composición", () => {
  const rawMatterNodes = flattenComposition(snapshot.plan.composition).filter((node) => node.nodeType === "Materia");
  const projectedCourses = projection.courses.filter((course) => course.dataStatus !== "manual-validation");
  const projectedKeys = projectedCourses.map((course) => `${course.bedeliasCode}:${course.name}`);

  assert.equal(snapshot.plan.courses.length, 291);
  assert.equal(rawMatterNodes.length, 302);
  assert.equal(new Set(rawMatterNodes.map((node) => `${node.course.code}:${node.course.name}`)).size, 302);
  assert.equal(projectedCourses.length, 302);
  assert.equal(new Set(projectedKeys).size, projectedKeys.length);
  assert.equal(projectedCourses.reduce((sum, course) => sum + course.credits, 0), 2450);
  assert.ok(projectedCourses.some((course) => course.bedeliasCode === "FADU-G1085"));
  assert.ok(projectedCourses.some((course) => course.bedeliasCode === "FAGRO-M000"));
});

test("no convierte la orientación individual en perfil o trayectoria certificada", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.match(projection.plan.notice, /Comisión de Carrera.*currículo individual/i);
  assert.equal(audit.conclusion.siteSpecificTrajectoryAvailability, false);
});
