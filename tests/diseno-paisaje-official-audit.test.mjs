import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";

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

test("conserva la composición de Bedelías para auditoría sin publicarla como oferta acreditable", () => {
  const rawMatterNodes = flattenComposition(snapshot.plan.composition).filter((node) => node.nodeType === "Materia");
  const projectedCourses = projection.courses.filter((course) => course.bedeliasCode);
  const projectedKeys = projectedCourses.map((course) => `${course.bedeliasCode}:${course.name}`);

  assert.equal(snapshot.plan.courses.length, 291);
  assert.equal(rawMatterNodes.length, 302);
  assert.equal(new Set(rawMatterNodes.map((node) => `${node.course.code}:${node.course.name}`)).size, 302);
  assert.equal(projectedCourses.length, 302);
  assert.equal(new Set(projectedKeys).size, projectedKeys.length);
  assert.equal(projectedCourses.reduce((sum, course) => sum + course.credits, 0), 2450);
  assert.ok(projectedCourses.some((course) => course.bedeliasCode === "FADU-G1085" && course.authorityStatus === "candidate"));
  assert.ok(projectedCourses.some((course) => course.bedeliasCode === "FAGRO-M000" && course.authorityStatus === "candidate"));
});

test("la referencia y el planificador muestran 29 unidades sin duplicar talleres ni Proyecto Final", () => {
  const presentation = buildRegisteredPlanPresentation("bedelias", projection);
  assert.equal(presentation.generated, false);
  assert.deepEqual(presentation.periods.map(({ label }) => label),
    [...Array.from({ length: 8 }, (_, index) => `Semestre ${index + 1}`), "Semestres 7 y 8 · Proyecto Final anual"]);
  const placed = presentation.periods.flatMap(({ courseIds }) => courseIds);
  assert.equal(placed.length, 29);
  assert.equal(new Set(placed).size, 29);
  assert.equal(presentation.courses.length, 29);
  assert.equal(presentation.courses.filter(({ bedeliasCode }) => bedeliasCode).length, 14);
  assert.ok(presentation.courses.every(({ authorityStatus }) => authorityStatus === "verified"));
  assert.deepEqual(presentation.courses.filter(({ name }) => name === "Proyecto Final de Paisaje").map(({ credits }) => credits), [40]);
  const allocated = {};
  for (const { creditAllocations } of presentation.courses) for (const { nodeId, credits } of creditAllocations) {
    allocated[nodeId] = (allocated[nodeId] ?? 0) + credits;
  }
  assert.deepEqual(allocated, {
    "transversal-introduction": 6, "science-technology": 101, "project-practice": 160, "theory-history": 43,
  });
  assert.equal(projection.publishedPathways.bedelias.catalogCourseIds?.length ?? 0, 0);
  for (const code of ["DP65", "DP63", "DP188", "DP73", "DP75", "DP184", "DP12", "DP012"]) {
    assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === code).authorityStatus, "candidate", code);
  }
});

test("no convierte la orientación individual en perfil o trayectoria certificada", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.match(projection.plan.notice, /Comisión de Carrera.*currículo individual/i);
  assert.equal(audit.conclusion.siteSpecificTrajectoryAvailability, false);
});
