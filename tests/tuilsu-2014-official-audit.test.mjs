import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-interpretacion-lsu-espanol-lsu-2014.json");
const reviews = await readJson("data/official-trajectories/reviews.json");
const loaderSource = await readFile(new URL("app/data/extracted-academic-loaders.ts", root), "utf8");
const officialAudit = audits.audits.find(({ identity }) => identity === "interpretacion lsu espanol lsu:2014");
const credentials = new Map(projection.creditStructure.credentials.map((credential) => [credential.id, credential]));
const courses = new Map(projection.courses.map((course) => [course.id, course]));
const publishedIds = (pathwayId) => projection.publishedPathways[pathwayId].periods.flatMap(({ courseIds }) => courseIds);

test("publica una sola carrera TUILSU con los planes 2025 y 2014 separados", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Tecnólogo en Interpretación y Traducción LSU-español")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fhum");
  assert.deepEqual(matches[0].career.plans.map(({ id }) => id), [
    "bedelias-fhum-tecnologo-int-y-trad-lsu-esp-2025",
    "bedelias-fhum-interpretacion-lsu-espanol-lsu-2014",
  ]);
  assert.deepEqual(
    [projection.plan.degreeTitle, projection.plan.durationMonths, projection.plan.minCredits],
    ["Tecnólogo en Interpretación y Traducción LSU-español", 36, 270],
  );
  assert.match(projection.plan.notice, /progreso propio/);
});

test("ofrece Montevideo y Salto sin convertir Tacuarembó en sede vigente", () => {
  assert.deepEqual(projection.campuses.map(({ id }) => id), ["montevideo", "salto"]);
  assert.ok(Object.values(projection.publishedPathways)
    .every(({ campusIds }) => campusIds.join(",") === "montevideo,salto"));
  const tacuarembo = officialAudit.offerings.find(({ serviceCode }) => serviceCode === "CUT");
  assert.equal(tacuarembo.admissionStatus, "historical-not-current");
  assert.equal(officialAudit.conclusion.regionalCurriculumVariant, false);
});

test("reproduce seis semestres y separa correctamente los recorridos lingüísticos", () => {
  const labels = ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5", "Semestre 6"];
  assert.deepEqual(Object.keys(projection.publishedPathways), ["estudiante-oyente", "estudiante-sordo"]);
  for (const pathway of Object.values(projection.publishedPathways)) {
    assert.deepEqual(pathway.periods.map(({ label }) => label), labels);
  }

  const hearing = new Set(publishedIds("estudiante-oyente"));
  const deaf = new Set(publishedIds("estudiante-sordo"));
  assert.ok(hearing.has("fhum-tuilsu-2014-estructura-espanol"));
  assert.ok(hearing.has("fhum-il19-2"));
  assert.ok(!hearing.has("fhum-il17-2"));
  assert.ok(!hearing.has("fhum-il16-2"));
  assert.ok(deaf.has("fhum-il17-2"));
  assert.ok(deaf.has("fhum-il16-2"));
  assert.ok(!deaf.has("fhum-tuilsu-2014-estructura-espanol"));
  assert.ok(!deaf.has("fhum-il19-2"));
});

test("controla los siete mínimos oficiales que suman 270 créditos", () => {
  const nodes = projection.creditStructure.nodes.filter(({ id }) => id !== "plan-total");
  assert.deepEqual(nodes.map(({ minCredits }) => minCredits), [112, 52, 46, 22, 10, 26, 2]);
  assert.equal(nodes.reduce((sum, { minCredits }) => sum + minCredits, 0), 270);
  for (const credential of credentials.values()) {
    assert.equal(credential.minTotalCredits, 270);
    assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 270);
  }
});

test("preserva candidatos fuera de la UI y representa elecciones genéricas con cero créditos", () => {
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const candidateIds = new Set(candidates.map(({ id }) => id));
  assert.equal(candidates.length, 180);
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified").length, 30);
  assert.ok(Object.values(projection.publishedPathways).every((pathway) => pathway.periods
    .flatMap(({ courseIds }) => courseIds)
    .every((id) => !candidateIds.has(id))));
  assert.ok(Object.values(projection.publishedPathways).every((pathway) => (pathway.catalogCourseIds ?? []).length === 0));
  const blocks = projection.courses.filter(({ curricularBlock }) => curricularBlock);
  assert.equal(blocks.length, 6);
  assert.ok(blocks.every(({ credits, authorityStatus }) => credits === 0 && authorityStatus === "verified"));
});

test("mantiene identidad y progreso independientes de los planes 2025", () => {
  assert.doesNotMatch(loaderSource, /"bedelias-fhum-interpretacion-lsu-espanol-lsu-2014"[\s\S]{0,1000}?progressPlanId:/);
  assert.notEqual(
    courses.get("fhum-tuilsu-2014-estructura-espanol").id,
    "fhum-tuilsu-2025-estructura-espanol",
  );
  const review = reviews.reviews.find(({ planId }) => planId === "bedelias-fhum-interpretacion-lsu-espanol-lsu-2014");
  assert.equal(review.state, "official-trajectory-reproduced");
  assert.equal(review.evidence.compareCoursePlacements, true);
  assert.match(review.conflictNotes.join(" "), /no publica una equivalencia ni una migración automática/);
});
