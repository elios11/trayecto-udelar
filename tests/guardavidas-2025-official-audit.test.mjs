import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-isef-tecnicatura-en-guardavidas-2025.json");
const audit = registry.audits.find(({ identity }) => identity === "tecnicatura en guardavidas:2025");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const pathway = projection.pathways.bedelias;

const periodCredits = (label) => pathway.periods
  .find((period) => period.label === label)
  .courseIds
  .reduce((sum, id) => sum + courseById.get(id).credits, 0);

test("publica una única Tecnicatura Plan 2025 vigente en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-current-plan-montevideo-with-one-policy-alternative");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(projection.plan.degreeTitle, "Técnico Guardavidas");
  assert.equal(projection.plan.year, "2025");
  assert.equal(projection.plan.durationMonths, 24);
  assert.equal(projection.plan.minCredits, 160);
  assert.deepEqual(projection.campuses.map(({ id, defaultPathwayId }) => [id, defaultPathwayId]), [["montevideo", "bedelias"]]);
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.match(projection.plan.notice, /Maldonado mantiene el Curso anterior/i);
});

test("traslada los cuatro semestres normativos sin inflar la alternativa de políticas públicas", () => {
  assert.deepEqual(pathway.periods.map(({ label }) => label), [
    "Primer semestre",
    "Segundo semestre",
    "Tercer semestre",
    "Cuarto semestre",
    "Cuarto semestre — elegí una unidad de políticas públicas",
    "Formación flexible",
    "Validación de egreso",
  ]);
  assert.deepEqual(pathway.periods.slice(0, 4).map(({ courseIds }) => courseIds.length), [4, 4, 3, 3]);
  assert.deepEqual(pathway.periods.slice(0, 4).map(({ label }) => periodCredits(label)), [40, 32, 30, 26]);
  const policyPeriod = pathway.periods[4];
  assert.equal(periodCredits(policyPeriod.label), 12);
  assert.deepEqual(policyPeriod.courseIds.map((id) => courseById.get(id).name), [
    "Políticas Públicas, Tiempo Libre y Ocio",
    "Políticas Públicas y Salud",
  ]);
  assert.equal(new Set(pathway.periods.slice(0, 5).flatMap(({ courseIds }) => courseIds)).size, 16);
});

test("controla 134 créditos obligatorios por área, 26 flexibles y una alternativa de dos", () => {
  const credential = projection.creditStructure.credentials[0];
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.deepEqual(requirements, {
    "guardavidas-salvamento": 50,
    "guardavidas-geociencias-salud": 42,
    "guardavidas-humanas-sociales": 42,
    "guardavidas-flexible": 26,
  });
  assert.equal(Object.values(requirements).reduce((sum, credits) => sum + credits, 0), 160);
  assert.equal(credential.minTotalCredits, 160);
  assert.deepEqual(credential.requiredCourseGroups.map(({ id, minCompleted, courseIds }) => [id, minCompleted, courseIds.length]), [
    ["guardavidas-nucleo-obligatorio", 14, 14],
    ["guardavidas-politicas-publicas", 1, 2],
    ["validacion-final-plan", 1, 1],
  ]);
  const flexible = courseById.get(pathway.periods[5].courseIds[0]);
  assert.equal(flexible.credits, 26);
  assert.equal(flexible.curricularBlock, true);
  assert.equal(courseById.get(pathway.periods[6].courseIds[0]).curricularBlock, true);
});

test("documenta la cobertura real de Bedelías sin inventar previaturas", () => {
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 16);
  assert.equal(audit.bedeliasComparison.normalizedCourseCount, 16);
  assert.equal(audit.bedeliasComparison.compositionGroupCount, 4);
  assert.equal(audit.bedeliasComparison.prerequisiteRuleCount, 16);
  assert.equal(audit.bedeliasComparison.publishedRuleCount, 0);
  assert.equal(audit.bedeliasComparison.noPublishedRuleCount, 16);
  assert.equal(projection.rules.length, 0);
  for (const id of pathway.periods.flatMap(({ courseIds }) => courseIds)) assert.ok(courseById.has(id), id);
});

test("registra una sola carrera y deja únicamente Odontología 2011 en la cola", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-isef");
  const careers = faculty.careers.filter(({ label }) => label === "Tecnicatura en Guardavidas");
  assert.equal(careers.length, 1);
  assert.equal(careers[0].plans.length, 1);
  assert.equal(careers[0].plans[0].id, "bedelias-isef-tecnicatura-en-guardavidas-2025");
  assert.equal(careers[0].plans[0].defaultTrajectoryId, "bedelias");
  assert.equal(careers[0].plans[0].defaultCredentialId, "tecnico-guardavidas");
  assert.ok(!queue.queue.some(({ identity }) => identity === "tecnicatura en guardavidas:2025"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 176);
  assert.equal(queue.counts.pendingCanonicalIdentities, 1);
  assert.equal(queue.queue[0].identity, "odontologia:2011");
});
