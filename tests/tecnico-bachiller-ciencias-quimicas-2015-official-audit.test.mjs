import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fq-tecnico-bach-en-cs-quimicas-2015.json");
const audit = registry.audits.find(({ identity }) => identity === "tecnico bach en cs quimicas:2015");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));

const periodCredits = (pathway, label) => pathway.periods
  .find((period) => period.label === label)
  .courseIds
  .reduce((sum, id) => sum + courseById.get(id).credits, 0);

test("publica una tecnicatura Plan 2015 de ingreso directo sin confundirla con el título intermedio Plan 2000", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-current-direct-entry-degree-montevideo-complete-salto-first-year");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(projection.plan.degreeTitle, "Técnico Bachiller en Ciencias Químicas");
  assert.equal(projection.plan.year, "2015");
  assert.equal(projection.plan.durationMonths, 30);
  assert.equal(projection.plan.minCredits, 225);
  assert.deepEqual(Object.keys(projection.pathways), ["montevideo", "salto-primer-ano"]);
  assert.deepEqual(projection.campuses.map(({ id, defaultPathwayId }) => [id, defaultPathwayId]), [
    ["montevideo", "montevideo"],
    ["salto", "salto-primer-ano"],
  ]);
});

test("traslada las 24 unidades y los cinco semestres del damero vigente", () => {
  const montevideo = projection.pathways.montevideo;
  assert.deepEqual(montevideo.periods.map(({ label }) => label), [
    "Primer semestre", "Segundo semestre", "Tercer semestre", "Cuarto semestre", "Quinto semestre", "Validación de egreso",
  ]);
  assert.deepEqual(montevideo.periods.slice(0, 5).map(({ courseIds }) => courseIds.length), [4, 5, 5, 4, 6]);
  assert.deepEqual(montevideo.periods.slice(0, 5).map(({ label }) => periodCredits(montevideo, label)), [26, 34, 39, 30, 46]);
  assert.equal(montevideo.periods.slice(0, 5).flatMap(({ courseIds }) => courseIds).length, 24);
  assert.equal(new Set(montevideo.periods.slice(0, 5).flatMap(({ courseIds }) => courseIds)).size, 24);
  assert.deepEqual(montevideo.periods[4].courseIds.map((id) => courseById.get(id).bedeliasCode), [
    "501", "502X", "503", "520A", "190", "512L",
  ]);
});

test("controla los mínimos 175/84/91 y 50 flexibles con 35 optativos", () => {
  const credential = projection.creditStructure.credentials[0];
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.equal(credential.minTotalCredits, 225);
  assert.equal(requirements["tbcq-basic"], 175);
  assert.equal(requirements["tbcq-physical-biological"], 84);
  assert.equal(requirements["tbcq-chemical"], 91);
  assert.equal(requirements["tbcq-flexible"], 50);
  assert.equal(requirements["tbcq-optional"], 35);
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), ["tbcq-nucleo-vigente", "validacion-final-plan"]);
  assert.equal(credential.requiredCourseGroups[0].minCompleted, 24);
  assert.equal(credential.requiredCourseGroups[0].courseIds.length, 24);
});

test("Salto muestra sólo el primer año del mismo plan y conserva la continuidad en Montevideo", () => {
  const salto = projection.pathways["salto-primer-ano"];
  const montevideo = projection.pathways.montevideo;
  assert.deepEqual(salto.campusIds, ["salto"]);
  assert.deepEqual(salto.periods.map(({ label }) => label), ["Orientación del recorrido", "Primer semestre", "Segundo semestre"]);
  assert.equal(courseById.get(salto.periods[0].courseIds[0]).curricularBlock, true);
  assert.deepEqual(salto.periods[1].courseIds, montevideo.periods[0].courseIds);
  assert.deepEqual(salto.periods[2].courseIds, montevideo.periods[1].courseIds);
  assert.deepEqual(salto.catalogCourseIds.map((id) => courseById.get(id).bedeliasCode), ["CENURLN-CBB22", "CENURLN-CBB24"]);
  assert.ok(!salto.periods.some(({ label }) => label === "Validación de egreso"));
});

test("preserva composición y previaturas sin convertir menor cobertura regional en otra currícula", () => {
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 491);
  assert.equal(audit.bedeliasComparison.normalizedCourseCount, 489);
  assert.equal(audit.bedeliasComparison.compositionGroupCount, 6);
  assert.equal(audit.bedeliasComparison.regionalComparisonStatus, "curriculum-match-prerequisite-coverage-difference");
  assert.equal(audit.bedeliasComparison.prerequisiteRuleCount, 429);
  assert.equal(audit.bedeliasComparison.publishedRuleCount, 149);
  assert.equal(audit.bedeliasComparison.noPublishedRuleCount, 280);
  assert.equal(audit.bedeliasComparison.regionalPrerequisiteRuleCount, 9);
  assert.equal(projection.rules.length, 149);
  assert.equal(projection.plan.noPublishedRule, 280);
  assert.equal(projection.courses.length, 493);
  for (const pathway of Object.values(projection.pathways)) {
    for (const id of [...pathway.periods.flatMap(({ courseIds }) => courseIds), ...(pathway.catalogCourseIds ?? [])]) {
      assert.ok(courseById.has(id), id);
    }
  }
});

test("registra una sola carrera y avanza la cola a Guardavidas 2025", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-fq");
  const careers = faculty.careers.filter(({ label }) => label === "Técnico Bachiller en Ciencias Químicas");
  assert.equal(careers.length, 1);
  assert.equal(careers[0].plans.length, 1);
  assert.equal(careers[0].plans[0].id, "bedelias-fq-tecnico-bach-en-cs-quimicas-2015");
  assert.equal(careers[0].plans[0].defaultTrajectoryId, "montevideo");
  assert.equal(careers[0].plans[0].defaultCredentialId, "tecnico-bachiller-ciencias-quimicas");
  assert.ok(!queue.queue.some(({ identity }) => identity === "tecnico bach en cs quimicas:2015"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 176);
  assert.equal(queue.counts.pendingCanonicalIdentities, 1);
  assert.equal(queue.queue[0].identity, "odontologia:2011");
});
