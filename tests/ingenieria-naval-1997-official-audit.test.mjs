import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-ingenieria-naval-1997.json");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const audit = registry.audits.find(({ identity }) => identity === "ingenieria naval:1997");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "ingeniero-naval");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const courseByCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));

test("publica un único Plan 1997 vigente en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-degree-with-personalized-curriculum-and-suggested-trajectory");
  assert.equal(projection.plan.year, "1997");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 450);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), ["montevideo"]);
  assert.deepEqual(Object.keys(projection.pathways), ["curricula-personalizada", "curricula-sugerida-2017"]);
  assert.equal(credential.title, "Ingeniero Naval");
  assert.ok(Object.values(projection.pathways).every(({ credentialId }) => credentialId === credential.id));
});

test("respeta los 16 mínimos literales y deja trazada la inconsistencia del subtotal oficial", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.equal(Object.keys(requirements).length, 16);
  assert.equal(Object.values(requirements).reduce((sum, credits) => sum + credits, 0), 382);
  assert.equal(requirements["naval-matematica"], 70);
  assert.equal(requirements["naval-fluidos-energia"], 45);
  assert.equal(requirements["naval-construccion"], 32);
  assert.equal(requirements["naval-pasantia"], 20);
  assert.equal(requirements["naval-proyecto"], 15);
  assert.equal(requirements["naval-taller"], 6);
  assert.match(audit.anomalies.find(({ field }) => field === "officialMinimumSubtotal").resolution, /TOTAL 385/);
  assert.match(audit.anomalies.find(({ field }) => field === "officialMinimumSubtotal").resolution, /suman 382/);
  assert.doesNotMatch(projection.courses.find(({ id }) => id === "fing-naval-flexibilidad-hasta-450").name, /65|68/);
});

test("mantiene Taller, Pasantía, Proyecto y validación como requisitos nominales", () => {
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), [
    "naval-taller-nominal",
    "naval-pasantia-nominal",
    "naval-proyecto-nominal",
    "validacion-final-plan",
  ]);
  assert.deepEqual(
    credential.requiredCourseGroups[2].courseIds.map((id) => courseById.get(id).bedeliasCode),
    ["2019", "CP318"],
  );
  assert.equal(credential.minTotalCredits, 450);
});

test("la currícula sugerida conserva 464 créditos vigentes y representa una sola vez el curso anual", () => {
  const pathway = projection.pathways["curricula-sugerida-2017"];
  const selectedIds = pathway.periods.flatMap(({ courseIds }) => courseIds);
  const selectedCourses = selectedIds.map((id) => courseById.get(id));
  assert.equal(new Set(selectedIds).size, selectedIds.length);
  assert.equal(selectedCourses.reduce((sum, course) => sum + course.credits, 0), 464);
  assert.match(audit.anomalies.find(({ field }) => field === "suggestedCurriculumCredits").resolution, /suma 466/i);
  assert.match(audit.anomalies.find(({ field }) => field === "suggestedCurriculumCredits").resolution, /proyección actual suma 464/i);
  assert.equal(selectedCourses.filter(({ bedeliasCode }) => bedeliasCode === "2600").length, 1);
  assert.equal(pathway.periods.find(({ label }) => /anual/.test(label)).courseIds.length, 1);
  assert.equal(new Set(pathway.catalogCourseIds).size, pathway.catalogCourseIds.length);
  assert.equal(selectedIds.length + pathway.catalogCourseIds.length, projection.courses.length);
});

test("fusiona los tres códigos repetidos sin doble conteo del total", () => {
  assert.deepEqual(courseByCode.get("2041").creditAllocations.map(({ nodeId, credits }) => [nodeId, credits]), [
    ["naval-matematica", 6], ["naval-informatica", 4],
  ]);
  assert.deepEqual(courseByCode.get("1087").creditAllocations.map(({ nodeId, credits }) => [nodeId, credits]), [
    ["naval-matematica", 5], ["naval-informatica", 4],
  ]);
  assert.equal(courseByCode.get("1233").credits, 4);
  assert.equal(courseByCode.get("1233").creditAllocations.length, 2);
  for (const code of ["2041", "1087", "1233"]) {
    assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode === code).length, 1, code);
  }
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 329);
  assert.equal(audit.bedeliasComparison.normalizedCourseCount, 326);
  assert.equal(projection.courses.length, 328);
});

test("conserva previaturas, catálogo y referencias internas válidas", () => {
  assert.equal(projection.rules.length, 242);
  assert.equal(projection.plan.noPublishedRule, 149);
  for (const pathway of Object.values(projection.pathways)) {
    for (const id of [...pathway.periods.flatMap(({ courseIds }) => courseIds), ...(pathway.catalogCourseIds ?? [])]) {
      assert.ok(courseById.has(id), id);
    }
  }
  for (const group of credential.requiredCourseGroups) {
    assert.ok(group.courseIds.every((id) => courseById.has(id)), group.id);
  }
  assert.match(page, /missing\.map\(\(\{ id, name \}\) => <li key=\{id\}>\{name\}<\/li>\)/);
  const faculty = catalog.find(({ id }) => id === "bedelias-fing");
  const career = faculty.careers.find(({ label }) => label === "Ingeniería Naval");
  assert.equal(career.plans[0].id, "bedelias-fing-ingenieria-naval-1997");
  assert.equal(career.plans[0].defaultTrajectoryId, "curricula-personalizada");
});

test("cierra Naval y avanza la cola a Ingeniería Química", () => {
  assert.ok(!queue.queue.some(({ identity }) => identity === "ingenieria naval:1997"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 167);
  assert.equal(queue.counts.pendingCanonicalIdentities, 10);
  assert.equal(queue.queue[0].identity, "tecnologo en telecomunicaciones:2009");
});
