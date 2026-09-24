import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const technologist = await readJson("app/data/bedelias-generated/bedelias-fhum-tecnologo-int-y-trad-lsu-esp-2025.json");
const degree = await readJson("app/data/bedelias-generated/bedelias-fhum-licenciatura-en-estudios-sordos-2025.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const loaderSource = await readFile(new URL("app/data/extracted-academic-loaders.ts", root), "utf8");

const planPdf = "https://fhce.edu.uy/wp-content/uploads/2025/06/PLAN_de_Licenciatura_de_Estudios_Sordos.pdf";
const sharedPlanIds = [
  "bedelias-fhum-tecnologo-int-y-trad-lsu-esp-2025",
  "bedelias-fhum-licenciatura-en-estudios-sordos-2025",
];
const periodLabels = (projection, pathwayId) => projection.publishedPathways[pathwayId].periods.map(({ label }) => label);
const publishedCourseIds = (projection, pathwayId) => projection.publishedPathways[pathwayId].periods.flatMap(({ courseIds }) => courseIds);
const nonRootMinima = (projection) => projection.creditStructure.nodes
  .filter(({ id }) => id !== "plan-total")
  .reduce((sum, { minCredits }) => sum + minCredits, 0);

test("publica las dos identidades 2025 con sus títulos, sedes y mínimos propios", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-fhum");
  const degreeCareer = faculty.careers.find(({ label }) => label === "Licenciatura en Estudios Sordos");
  const technologistCareer = faculty.careers.find(({ label }) => label === "Tecnólogo en Interpretación y Traducción LSU-español");

  assert.equal(degreeCareer.plans[0].id, sharedPlanIds[1]);
  assert.equal(technologistCareer.plans[0].id, sharedPlanIds[0]);
  assert.deepEqual(degree.campuses.map(({ id }) => id), ["montevideo"]);
  assert.deepEqual(technologist.campuses.map(({ id }) => id), ["montevideo", "salto"]);
  assert.deepEqual([degree.plan.minCredits, technologist.plan.minCredits], [360, 270]);
  assert.equal(nonRootMinima(technologist), 270);
  assert.equal(nonRootMinima(degree), 360);
});

test("reproduce los seis semestres comunes y los dos semestres finales sin inventar unidades flexibles", () => {
  const commonLabels = [
    "Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5", "Semestre 6",
    "Entre los semestres 1 y 6",
  ];
  for (const pathwayId of ["estudiante-oyente", "estudiante-sordo"]) {
    assert.deepEqual(periodLabels(technologist, pathwayId), commonLabels);
    assert.deepEqual(periodLabels(degree, pathwayId), [...commonLabels, "Semestre 7", "Semestre 8"]);
    assert.deepEqual(
      publishedCourseIds(degree, pathwayId).slice(0, 25),
      publishedCourseIds(technologist, pathwayId),
      pathwayId,
    );
  }

  const flexibleBlocks = degree.courses.filter(({ curricularBlock }) => curricularBlock);
  assert.ok(flexibleBlocks.length > 0);
  assert.ok(flexibleBlocks.every(({ credits, authorityStatus }) => credits === 0 && authorityStatus === "verified"));
  assert.equal(degree.courses.find(({ id }) => id === "fhum-lic-2025-trabajo-final").credits, 25);
});

test("distingue la lengua primera y la segunda lengua de cada recorrido", () => {
  const hearing = new Set(publishedCourseIds(technologist, "estudiante-oyente"));
  const deaf = new Set(publishedCourseIds(technologist, "estudiante-sordo"));

  assert.ok(hearing.has("fhum-tuilsu-2025-estructura-espanol"));
  assert.ok(hearing.has("fhum-il19-2"));
  assert.ok(!hearing.has("fhum-il17-2"));
  assert.ok(!hearing.has("fhum-il16-2"));
  assert.ok(deaf.has("fhum-il17-2"));
  assert.ok(deaf.has("fhum-il16-2"));
  assert.ok(!deaf.has("fhum-tuilsu-2025-estructura-espanol"));
  assert.ok(!deaf.has("fhum-il19-2"));
});

test("mantiene los candidatos auditables fuera de la malla y del catálogo normal", () => {
  for (const projection of [technologist, degree]) {
    const candidateIds = new Set(projection.courses
      .filter(({ authorityStatus }) => authorityStatus === "candidate")
      .map(({ id }) => id));
    assert.equal(candidateIds.size, 180);
    assert.ok(Object.values(projection.publishedPathways).every((pathway) => pathway.periods
      .flatMap(({ courseIds }) => courseIds)
      .every((id) => !candidateIds.has(id))));
    assert.ok(Object.values(projection.publishedPathways).every((pathway) => (pathway.catalogCourseIds ?? [])
      .every((id) => !candidateIds.has(id))));
  }
});

test("comparte progreso sólo entre las dos identidades respaldadas por el Plan 2025", () => {
  assert.match(loaderSource, /"bedelias-fhum-tecnologo-int-y-trad-lsu-esp-2025"[\s\S]*?progressPlanId: "bedelias-fhum-licenciatura-en-estudios-sordos-2025"/);
  assert.doesNotMatch(loaderSource, /"bedelias-fhum-interpretacion-lsu-espanol-lsu-2014"[\s\S]{0,1000}?progressPlanId:/);
  assert.match(technologist.plan.notice, /Plan 2014 permanece separado/);
  assert.match(degree.plan.notice, /sólo esas dos carreras comparten progreso/);
});

test("registra fuente oficial y correspondencia exacta para ambas identidades", () => {
  for (const planId of sharedPlanIds) {
    const review = reviews.reviews.find(({ planId: reviewedPlanId }) => reviewedPlanId === planId);
    assert.equal(review.state, "official-trajectory-reproduced");
    assert.equal(review.evidence.compareCoursePlacements, true);
    assert.ok(review.sources.some(({ url }) => url === planPdf));
  }
});
