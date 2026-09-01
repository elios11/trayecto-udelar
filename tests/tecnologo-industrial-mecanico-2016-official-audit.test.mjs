import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-tecnologo-industrial-mecanico-2016.json");
const audit = registry.audits.find(({ identity }) => identity === "tecnologo industrial mecanico:2016");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "tecnologo-industrial-mecanico");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));

const pathwayCredits = (pathway) => pathway.periods
  .flatMap(({ courseIds }) => courseIds)
  .reduce((sum, id) => sum + courseById.get(id).credits, 0);

test("publica un único Plan 2016 interinstitucional en Montevideo y Paysandú", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-joint-technologist-with-flexible-curriculum-four-example-profiles-and-two-campuses");
  assert.equal(projection.source.bedeliasContentHash, "cb38dbcb605d5c298485c22092449722fc4062ec832325be8b1e31598a985ff8");
  assert.equal(projection.plan.year, "2016");
  assert.equal(projection.plan.degreeTitle, "Tecnólogo Industrial Mecánico");
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.plan.minCredits, 270);
  assert.deepEqual(projection.plan.sharedWith, ["Universidad Tecnológica (UTEC)", "DGETP-UTU"]);
  assert.deepEqual(projection.campuses.map(({ id, defaultPathwayId }) => [id, defaultPathwayId]), [
    ["montevideo", "curricula-personalizada"],
    ["paysandu", "curricula-personalizada"],
  ]);

  const career = catalog.find(({ id }) => id === "bedelias-fing").careers
    .find(({ label }) => label === "Tecnólogo Industrial Mecánico");
  assert.equal(career.plans.length, 1);
  assert.equal(career.plans[0].id, "bedelias-fing-tecnologo-industrial-mecanico-2016");
  assert.equal(career.plans[0].defaultTrajectoryId, "curricula-personalizada");
  assert.equal(career.plans[0].defaultCredentialId, "tecnologo-industrial-mecanico");
});

test("ofrece currícula personalizada y cuatro perfiles guía sin separar títulos", () => {
  assert.deepEqual(Object.keys(projection.pathways), [
    "curricula-personalizada",
    "perfil-fluidos-energia",
    "perfil-diseno-materiales",
    "perfil-planta",
    "perfil-produccion",
  ]);
  for (const pathway of Object.values(projection.pathways)) {
    assert.equal(pathway.credentialId, "tecnologo-industrial-mecanico");
    assert.deepEqual(pathway.campusIds, ["montevideo", "paysandu"]);
    const selectedIds = pathway.periods.flatMap(({ courseIds }) => courseIds)
      .filter((id) => courseById.get(id).bedeliasCode);
    const catalogIds = pathway.catalogCourseIds ?? [];
    assert.equal(new Set([...selectedIds, ...catalogIds]).size, 44);
    assert.equal(new Set(selectedIds).size, selectedIds.length);
    assert.ok(catalogIds.every((id) => !selectedIds.includes(id)));
  }

  const expectedSemesterCredits = {
    "perfil-fluidos-energia": [46, 48, 52, 42, 45, 40],
    "perfil-diseno-materiales": [46, 48, 44, 44, 50, 30],
    "perfil-planta": [46, 48, 44, 40, 53, 40],
    "perfil-produccion": [46, 48, 52, 42, 50, 22],
  };
  for (const [id, credits] of Object.entries(expectedSemesterCredits)) {
    const semesterPeriods = projection.pathways[id].periods.filter(({ label }) => /^Semestre /.test(label));
    assert.deepEqual(semesterPeriods.map((period) => pathwayCredits({ periods: [period] })), credits);
  }
  assert.equal(pathwayCredits(projection.pathways["perfil-fluidos-energia"]), 273);
  assert.equal(pathwayCredits(projection.pathways["perfil-diseno-materiales"]), 262);
  assert.equal(pathwayCredits(projection.pathways["perfil-planta"]), 271);
  assert.equal(pathwayCredits(projection.pathways["perfil-produccion"]), 260);
  assert.match(projection.pathways["perfil-diseno-materiales"].description, /elección real de 10 créditos/i);
  assert.match(projection.pathways["perfil-produccion"].description, /elección real de 10 créditos/i);
});

test("controla los ocho mínimos, 270 créditos, Pasantía y validación final", () => {
  assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).length, 44);
  assert.equal(projection.courses.length, 48);
  assert.equal(projection.rules.length, 68);
  assert.equal(projection.plan.noPublishedRule, 8);
  assert.deepEqual(Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits])), {
    "industrial-taller": 20,
    "industrial-matematica": 40,
    "industrial-fisica": 36,
    "industrial-fluidos": 40,
    "industrial-materiales": 42,
    "industrial-produccion": 24,
    "industrial-electrotecnia": 30,
    "industrial-actividades": 10,
  });
  assert.equal(credential.nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0), 242);
  assert.equal(credential.minTotalCredits, 270);
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), [
    "industrial-pasantia-obligatoria",
    "validacion-final-plan",
  ]);
  const internship = courseById.get(credential.requiredCourseGroups[0].courseIds[0]);
  assert.deepEqual([internship.bedeliasCode, internship.credits], ["TIM80", 10]);
  assert.equal(courseById.get(credential.requiredCourseGroups[1].courseIds[0]).dataStatus, "manual-validation");

  const choiceBlocks = projection.courses.filter(({ name }) => /Elegí 10 créditos reales/.test(name));
  assert.equal(choiceBlocks.length, 2);
  assert.ok(choiceBlocks.every(({ credits, curricularBlock }) => credits === 0 && curricularBlock));
});

test("cierra la auditoría y avanza al Bachiller en Ciencias Químicas", () => {
  assert.ok(!queue.queue.some(({ identity }) => identity === "tecnologo industrial mecanico:2016"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 173);
  assert.equal(queue.counts.pendingCanonicalIdentities, 4);
  assert.equal(queue.queue[0].identity, "quimico:2015");
});
