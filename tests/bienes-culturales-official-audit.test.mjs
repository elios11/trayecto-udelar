import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation, GENERATED_PATHWAY_LABEL } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cenurso-tecnicatura-universitaria-en-bienes-culturales-2021.json");
const source = await readJson("data/fhce/bienes-culturales-2021-trajectory-review.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const audit = registry.audits.find((entry) => entry.identity === "tecnicatura universitaria en bienes culturales:2021");
const review = reviews.reviews.find((entry) => entry.planId === source.planId);
const inventoryEntry = inventory.plans.find((entry) => entry.planId === source.planId);
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

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
  const namesFor = (pathwayId) => buildRegisteredPlanPresentation(pathwayId, projection).periods
    .flatMap((period) => period.courseIds)
    .map((id) => coursesById.get(id).name);
  const historyNames = namesFor("historia-regional-y-local");
  const museologyNames = namesFor("museologia");
  const heritageNames = namesFor("patrimonio");

  for (const names of [historyNames, museologyNames, heritageNames]) {
    assert.ok(names.includes("Museología I"));
    assert.ok(names.includes("Patrimonio I"));
  }
  assert.ok(historyNames.includes("Trabajo Final Historia Regional y Local"));
  assert.ok(!historyNames.includes("Trabajo Final Museología"));
  assert.ok(museologyNames.includes("Museología II"));
  assert.ok(museologyNames.includes("Trabajo Final Museología"));
  assert.ok(!museologyNames.includes("Trabajo Final Patrimonio"));
  assert.ok(heritageNames.includes("Trabajo Final Patrimonio"));
  assert.ok(!heritageNames.includes("Trabajo Final Historia Regional y Local"));
});

test("documenta que FHCE todavía no publicó la malla anunciada", () => {
  assert.equal(source.publication.trajectoryStatus, "no-official-trajectory-documented");
  assert.equal(source.publication.trajectoryPublicationState, "announced-pending");
  assert.equal(source.trajectoryConclusion.temporary, true);
  assert.match(source.trajectoryConclusion.justification, /Próximamente/);
  assert.deepEqual(source.sources.find(({ id }) => id === "fhce-plan-2021").visuallyInspectedPages, [9, 10]);
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    assert.equal(source.fingerprint.sourceHashes[sourceId], digest(portion));
  }
  assert.equal(review.state, "no-official-trajectory-documented");
  assert.equal(review.evidence.kind, "documented-absence");
  assert.match(review.evidence.justification, /Próximamente/);
  assert.equal(inventoryEntry.state, "no-official-trajectory-documented");
  assert.equal(inventoryEntry.evidence.kind, "documented-absence");
});

test("mantiene el orden provisional como generado, no como trayectoria FHCE", () => {
  for (const pathwayId of source.projectionBaseline.pathwayIds) {
    assert.equal(projection.pathways[pathwayId].generatedFallback, true);
    const presentation = buildRegisteredPlanPresentation(pathwayId, projection);
    assert.equal(presentation.generated, true);
    assert.equal(presentation.label, GENERATED_PATHWAY_LABEL);
    assert.match(presentation.description, /materias candidatas/i);
    assert.doesNotMatch(presentation.description, /priorizando materias verificadas/i);
    assert.ok(presentation.periods.length > 0);
    assert.ok(presentation.periods.every(({ label, courseIds }) => (
      /^Selección orientativa Bedelías · parte \d+$/.test(label)
      && !/semestre|año/i.test(label)
      && courseIds.length <= 6
    )));
    const activeIds = presentation.periods.flatMap(({ courseIds }) => courseIds);
    assert.deepEqual(activeIds, source.projectionBaseline.fallbackCoreByPathway[pathwayId]);
    const activeCourses = presentation.courses.filter(({ id }) => activeIds.includes(id));
    assert.ok(activeCourses.every(({ provisional, eligibleRequirementIds, creditAllocations }) => (
      provisional === true && eligibleRequirementIds.length === 0 && creditAllocations.length === 0
    )));
  }
});

test("conserva IDs, catálogo y frontera de autoridad", () => {
  assert.deepEqual(
    projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified").map(({ id }) => id),
    source.projectionBaseline.verifiedCourseIds,
  );
  assert.deepEqual(
    projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").map(({ id }) => id),
    source.projectionBaseline.candidateCourseIds,
  );
  assert.equal(projection.courses.length, 64);
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
  assert.match(projection.plan.notice, /FHCE todavía no publicó la malla sugerida/i);
});
