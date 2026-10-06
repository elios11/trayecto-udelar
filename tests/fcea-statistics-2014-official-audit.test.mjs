import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const source = await readJson("data/fcea/estadistica-2014-trayectorias.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcea-licenciatura-en-estadistica-2014.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en estadistica:2014");
const coursesById = new Map(plan.courses.map((course) => [course.id, course]));
const coursesBySourceId = new Map();
for (const course of plan.courses) {
  for (const sourceId of [course.bedeliasCode, course.sourceCourseId].filter(Boolean)) coursesBySourceId.set(sourceId, course);
}

test("versiona las cuatro grillas vigentes y protege su huella normalizada", () => {
  assert.equal(source.source.authority, "Facultad de Ciencias Económicas y de Administración, Udelar");
  assert.equal(source.source.reviewedAt, "2026-10-06");
  assert.equal(source.source.effectiveAt, "2026-07");
  assert.equal(source.source.documents.length, 5);
  assert.equal(digest({ courses: source.courses, profiles: source.profiles }), source.fingerprints.normalizedCurriculum);
  assert.equal(source.courses.length, 121);
  assert.deepEqual(source.profiles.map(({ id }) => id), ["economia", "tecnologico", "bioestadistico", "actuarial-demografico"]);
  assert.ok(source.profiles.every(({ periods }) => periods.length === 8));
  assert.deepEqual(source.profiles.map(({ periods }) => periods.flatMap(({ placements }) => placements).length), [82, 78, 64, 69]);
  assert.ok(source.profiles.every(({ periods }) => periods.every(({ courseIds, placements }) => (
    JSON.stringify(courseIds) === JSON.stringify(placements.map(({ sourceId }) => sourceId))
  ))));
});

test("reproduce código y ubicación de cada identidad oficial en los cuatro perfiles", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Estadística", 48, 360]);
  assert.deepEqual(Object.keys(plan.pathways), ["actuarial-demografico", "bioestadistico", "economia", "tecnologico"]);
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);

  for (const profile of source.profiles) {
    assert.deepEqual(plan.publishedPathways[profile.id].periods.map(({ label, courseIds }) => ({
      label,
      courseIds: courseIds.map((courseId) => coursesById.get(courseId)?.bedeliasCode ?? coursesById.get(courseId)?.sourceCourseId),
    })), profile.periods.map(({ label, courseIds }) => ({ label, courseIds })), profile.id);
  }
});

test("publica sólo las 121 identidades demostradas y ofrece la unión sin duplicados", () => {
  assert.equal(plan.courses.length, 121);
  assert.ok(plan.courses.every(({ authorityStatus, dataStatus }) => authorityStatus === "verified" && dataStatus === "official-curriculum"));
  assert.ok(plan.courseAuthority.records.some(({ status }) => status === "rejected"));
  const allCourseIds = new Set(plan.courses.map(({ id }) => id));
  for (const [profileId, pathway] of Object.entries(plan.pathways)) {
    const periodIds = pathway.periods.flatMap(({ courseIds }) => courseIds);
    assert.equal(new Set(periodIds).size, periodIds.length, profileId);
    assert.deepEqual(new Set([...periodIds, ...pathway.catalogCourseIds]), allCourseIds, profileId);
    assert.equal(new Set([...periodIds, ...pathway.catalogCourseIds]).size, periodIds.length + pathway.catalogCourseIds.length, profileId);
  }
});

test("conserva un solo título, cuatro perfiles y los mínimos normativos", () => {
  assert.equal(plan.creditStructure.credentials.length, 4);
  assert.deepEqual(new Set(plan.creditStructure.credentials.map(({ title }) => title)), new Set(["Licenciado en Estadística"]));
  for (const credential of plan.creditStructure.credentials) {
    assert.deepEqual(credential.nodeRequirements.map(({ minCredits }) => minCredits), [85, 85, 30, 60, 10, 20, 70]);
    assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
    assert.deepEqual(credential.requiredCourseGroups, []);
  }
  assert.ok(plan.courses.every(({ eligibleRequirementIds }) => eligibleRequirementIds.includes("free-distribution")));
});

test("preserva IDs de progreso y resuelve créditos y nombres contra FCEA", () => {
  assert.equal(coursesBySourceId.get("MC10").id, "fcea-mc10-2");
  assert.equal(coursesBySourceId.get("118E").id, "fcea-118e-2");
  assert.equal(coursesBySourceId.get("330").id, "fcea-330-2");
  assert.equal(coursesBySourceId.get("P14").id, "fcea-p14-2");
  assert.deepEqual([coursesBySourceId.get("P14").name, coursesBySourceId.get("P14").credits], ["Trabajo Final de Grado", 30]);
  assert.deepEqual([coursesBySourceId.get("FING-1030").credits, coursesBySourceId.get("FING-1031").credits], [9, 9]);
  assert.deepEqual([coursesBySourceId.get("FING-1223").credits, coursesBySourceId.get("FING-1450").credits], [8, 8]);
  assert.deepEqual([coursesBySourceId.get("FING-1886").credits, coursesBySourceId.get("FING-2512").credits], [12, 10]);
  assert.deepEqual([coursesBySourceId.get("FCIEN-BG456").name, coursesBySourceId.get("FCIEN-BG456").credits], ["Biología General I (FCIEN)", 11]);
  for (const sourceId of ["FING-2046", "FCIEN-BG793", "FING-SENALES-SISTEMAS-SIN-CODIGO", "FQ-BIOINFORMATICA-SIN-CODIGO", "FCIEN-APRENDIZAJE-SEMI-SUPERVISADO-SIN-CODIGO"]) {
    assert.ok(coursesBySourceId.has(sourceId), sourceId);
  }
  assert.equal(coursesBySourceId.get("FING-SENALES-SISTEMAS-SIN-CODIGO").bedeliasCode, undefined);
  assert.equal(coursesBySourceId.get("FQ-BIOINFORMATICA-SIN-CODIGO").bedeliasCode, undefined);
  assert.ok(plan.audit.anomalies.some(({ field }) => field === "technologyGridMathematics"));
  assert.ok(plan.audit.anomalies.some(({ field }) => field === "bio335Area"));
});

test("mantiene alternativas y opciones como oferta, no como obligaciones acumulativas", () => {
  const technology = source.profiles.find(({ id }) => id === "tecnologico");
  assert.deepEqual(technology.alternatives[0].sourceIds, ["FING-1061", "MC10", "MC11"]);
  assert.deepEqual(technology.alternatives[1].sourceIds, ["MC31", "FING-1062"]);
  assert.ok(technology.periods[7].placements.some(({ sourceId, inclusion }) => sourceId === "FING-5824" && inclusion === "opcional"));
  assert.ok(source.profiles.find(({ id }) => id === "bioestadistico").periods[4].placements.some(({ sourceId, area }) => sourceId === "335" && area === "I"));
});
