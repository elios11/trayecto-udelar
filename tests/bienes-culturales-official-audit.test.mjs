import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cenurso-tecnicatura-universitaria-en-bienes-culturales-2021.json");
const audit = registry.audits.find((entry) => entry.identity === "tecnicatura universitaria en bienes culturales:2021");

test("normaliza Bienes Culturales como un único Plan 2021 con tres menciones", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(projection.plan.degreeTitle, "Técnico Universitario en Bienes Culturales");
  assert.equal(projection.plan.durationMonths, 30);
  assert.equal(projection.plan.minCredits, 200);
  assert.deepEqual(Object.keys(projection.pathways), [
    "historia-regional-y-local",
    "museologia",
    "patrimonio",
  ]);
  const catalogMatches = catalog.flatMap((faculty) => faculty.careers)
    .filter((career) => career.label === "Tecnicatura Universitaria en Bienes Culturales");
  assert.equal(catalogMatches.length, 1);
  assert.equal(catalogMatches[0].plans.length, 1);
});

test("ofrece las tres sedes sin inventar variantes territoriales", () => {
  const campusIds = ["colonia", "paysandu", "tacuarembo"];
  assert.deepEqual(projection.campuses.map((campus) => campus.id), campusIds);
  for (const pathway of Object.values(projection.pathways)) {
    assert.deepEqual(pathway.campusIds, campusIds);
  }
  assert.ok(audit.offerings.every((offering) => offering.curriculumVariant === false));
  assert.equal(audit.conclusion.siteSpecificTrajectoryAvailability, false);
});

test("proyecta el tronco común y sólo la rama de la mención elegida", () => {
  const coursesById = new Map(projection.courses.map((course) => [course.id, course]));
  const namesFor = (pathwayId) => projection.pathways[pathwayId].periods
    .flatMap((period) => period.courseIds)
    .map((id) => coursesById.get(id).name);
  const historyNames = namesFor("historia-regional-y-local");
  const museologyNames = namesFor("museologia");
  const heritageNames = namesFor("patrimonio");

  for (const names of [historyNames, museologyNames, heritageNames]) {
    assert.ok(names.includes("Museología I"));
    assert.ok(names.includes("Patrimonio I"));
    assert.ok(names.includes("Actividades integradas de formación específica"));
  }
  assert.ok(historyNames.includes("Trabajo Final Historia Regional y Local"));
  assert.ok(!historyNames.includes("Trabajo Final Museología"));
  assert.ok(museologyNames.includes("Museología II"));
  assert.ok(museologyNames.includes("Trabajo Final Museología"));
  assert.ok(!museologyNames.includes("Trabajo Final Patrimonio"));
  assert.ok(heritageNames.includes("Trabajo Final Patrimonio"));
  assert.ok(!heritageNames.includes("Trabajo Final Historia Regional y Local"));
});

test("controla los 200 créditos oficiales sin exigir todo el catálogo flexible", () => {
  const expected = {
    "history-and-heritage": 91,
    museology: 26,
    "cultural-management": 20,
    "modern-language": 4,
    "specific-formation": 29,
    "elective-activities": 20,
    "integrated-general": 3,
    "integrated-specific": 7,
  };
  const credential = projection.creditStructure.credentials[0];
  assert.equal(credential.minTotalCredits, 200);
  assert.deepEqual(Object.fromEntries(credential.nodeRequirements.map((entry) => [entry.nodeId, entry.minCredits])), expected);
  assert.equal(Object.values(expected).reduce((sum, credits) => sum + credits, 0), 200);
  assert.equal(projection.courses.filter((course) => course.curricularBlock).length, 1);
  assert.match(projection.plan.notice, /optativas, electivas y actividades integradas son flexibles/i);
});
