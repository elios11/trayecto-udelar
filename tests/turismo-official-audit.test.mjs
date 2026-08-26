import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const snapshot = await readJson("data/bedelias/cure-licenciatura-en-turismo-2014.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cure-licenciatura-en-turismo-2014.json");
const audit = registry.audits.find((entry) => entry.identity === "licenciatura en turismo:2014");

const flattenComposition = (node) => [node, ...(node.children ?? []).flatMap(flattenComposition)];

test("publica un solo Plan 2014 con sedes Maldonado y Salto", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-plan-two-campuses-flexible-by-modules");
  assert.equal(projection.plan.year, "2014");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.campuses.map((campus) => campus.label), ["Maldonado", "Salto"]);
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);

  const faculty = catalog.find((candidate) => candidate.label === "Facultad de Humanidades y Ciencias de la Educación");
  const career = faculty.careers.find((candidate) => candidate.label === "Licenciatura en Turismo");
  assert.deepEqual(career.plans.map((plan) => plan.label), ["Plan 2014 · vigente"]);
});

test("controla los seis mínimos que completan los 360 créditos", () => {
  const credential = projection.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements, [
    { nodeId: "introductory", minCredits: 67 },
    { nodeId: "instrumental", minCredits: 57 },
    { nodeId: "concepts", minCredits: 91 },
    { nodeId: "operational", minCredits: 69 },
    { nodeId: "application", minCredits: 46 },
    { nodeId: "thesis", minCredits: 30 },
  ]);
  assert.equal(credential.nodeRequirements.reduce((sum, requirement) => sum + requirement.minCredits, 0), 360);
  assert.equal(credential.minTotalCredits, 360);
});

test("reconoce obligaciones nominales y sus equivalencias administrativas", () => {
  const groups = new Map(projection.creditStructure.credentials[0].requiredCourseGroups.map((group) => [group.id, group]));
  assert.equal(groups.size, 21);
  assert.deepEqual([groups.get("mandatory-geography-one").minCompleted, groups.get("mandatory-geography-one").courseIds.length], [1, 3]);
  assert.deepEqual([groups.get("mandatory-introduction-tourism").minCompleted, groups.get("mandatory-introduction-tourism").courseIds.length], [1, 3]);
  assert.deepEqual([groups.get("mandatory-seminar").minCompleted, groups.get("mandatory-seminar").courseIds.length], [1, 3]);
  assert.deepEqual([groups.get("mandatory-professional-practice").minCompleted, groups.get("mandatory-professional-practice").courseIds.length], [1, 2]);
  assert.deepEqual([groups.get("mandatory-thesis").minCompleted, groups.get("mandatory-thesis").courseIds.length], [1, 1]);
  assert.deepEqual([groups.get("validacion-final-plan").minCompleted, groups.get("validacion-final-plan").courseIds.length], [1, 1]);
});

test("mantiene el catálogo flexible completo sin certificar perfiles personales", () => {
  const rawMatterNodes = flattenComposition(snapshot.plan.composition).filter((node) => node.nodeType === "Materia");
  const projectedCourses = projection.courses.filter((course) => course.dataStatus !== "manual-validation");
  assert.equal(rawMatterNodes.length, 382);
  assert.equal(projectedCourses.length, 382);
  assert.equal(projectedCourses.reduce((sum, course) => sum + course.credits, 0), 2942);
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.match(projection.plan.notice, /Comisión de Carrera.*módulo/i);
});

test("no reactiva los títulos binacionales sustituidos", () => {
  const faculty = catalog.find((candidate) => candidate.label === "Facultad de Humanidades y Ciencias de la Educación");
  const labels = faculty.careers.map((career) => career.label);
  assert.ok(labels.includes("Licenciatura en Turismo"));
  assert.ok(!labels.some((label) => /binacional|técnico en turismo/i.test(label)));
  assert.match(audit.conclusion.normalization.join(" "), /no reintroducir.*Binacional.*Técnico en Turismo/i);
});
