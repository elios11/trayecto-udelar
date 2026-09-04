import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fq-quimico-2015.json");
const audit = registry.audits.find(({ identity }) => identity === "quimico:2015");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const coursesByCode = new Map();
for (const course of projection.courses.filter(({ bedeliasCode }) => bedeliasCode)) {
  if (!coursesByCode.has(course.bedeliasCode)) coursesByCode.set(course.bedeliasCode, []);
  coursesByCode.get(course.bedeliasCode).push(course);
}

const periodCredits = (pathway) => pathway.periods.map(({ courseIds }) => (
  courseIds.reduce((sum, id) => sum + courseById.get(id).credits, 0)
));

const periodCodes = (pathway, label) => pathway.periods
  .find((period) => period.label === label)
  .courseIds
  .map((id) => courseById.get(id).bedeliasCode ?? courseById.get(id).id);

test("publica un solo Plan 2015 con cuatro recorridos y tres sedes de alcance preciso", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-current-degree-four-trajectories-one-full-regional-orientation-and-one-partial-regional-start");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(projection.plan.degreeTitle, "Químico");
  assert.equal(projection.plan.year, "2015");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 450);
  assert.deepEqual(Object.keys(projection.pathways), [
    "agricola-medio-ambiente", "calidad", "materiales", "recorrido-sin-orientacion", "salto-primer-ano",
  ]);
  assert.deepEqual(projection.campuses.map(({ id, defaultPathwayId }) => [id, defaultPathwayId]), [
    ["montevideo", "agricola-medio-ambiente"],
    ["paysandu", "agricola-medio-ambiente"],
    ["salto", "salto-primer-ano"],
  ]);
  assert.deepEqual(projection.pathways["agricola-medio-ambiente"].campusIds, ["montevideo", "paysandu"]);
  assert.deepEqual(projection.pathways.calidad.campusIds, ["montevideo"]);
  assert.deepEqual(projection.pathways.materiales.campusIds, ["montevideo"]);
  assert.deepEqual(projection.pathways["recorrido-sin-orientacion"].campusIds, ["montevideo"]);
  assert.deepEqual(projection.pathways["salto-primer-ano"].campusIds, ["salto"]);
});

test("traslada los cuatro dameros vigentes sin mezclar sus grillas sugeridas", () => {
  const expectedLabels = [
    "Primer semestre", "Segundo semestre", "Tercer semestre", "Cuarto semestre", "Quinto semestre",
    "Sexto semestre", "Séptimo semestre", "Octavo semestre", "Noveno semestre", "Décimo semestre",
    "Validación de egreso",
  ];
  const pathways = [
    projection.pathways["agricola-medio-ambiente"],
    projection.pathways.calidad,
    projection.pathways.materiales,
    projection.pathways["recorrido-sin-orientacion"],
  ];
  for (const pathway of pathways) {
    assert.deepEqual(pathway.periods.map(({ label }) => label), expectedLabels);
    assert.deepEqual(periodCredits(pathway).slice(0, 4), [37, 44, 50, 43]);
    assert.deepEqual(periodCodes(pathway, "Décimo semestre"), [
      "964X", "fq-quimico-internado", "fq-quimico-proyecto-final",
    ]);
    const selected = pathway.periods.flatMap(({ courseIds }) => courseIds);
    assert.equal(new Set(selected).size, selected.length);
  }
  assert.deepEqual(periodCredits(pathways[0]).slice(4, 9), [46, 48, 39, 22, 5]);
  assert.deepEqual(periodCredits(pathways[1]).slice(4, 9), [31, 32, 36, 36, 19]);
  assert.deepEqual(periodCredits(pathways[2]).slice(4, 9), [31, 39, 40, 37, 10]);
  assert.deepEqual(periodCredits(pathways[3]).slice(4, 9), [46, 41, 27, 36, 5]);
  assert.deepEqual(periodCodes(pathways[0], "Octavo semestre"), ["719", "FCEA-A20", "733A"]);
  assert.deepEqual(periodCodes(pathways[1], "Sexto semestre").slice(3, 5), ["824", "788"]);
  assert.deepEqual(periodCodes(pathways[2], "Séptimo semestre").slice(2, 4), ["562", "516"]);
});

test("controla los mínimos oficiales y las tres alternativas de actividad final", () => {
  const credentials = Object.fromEntries(projection.creditStructure.credentials.map((credential) => [credential.id, credential]));
  const profiles = [
    ["quimico-agricola-medio-ambiente", "agricola"],
    ["quimico-calidad", "calidad"],
    ["quimico-materiales", "materiales"],
    ["quimico-sin-orientacion", "sin-orientacion"],
  ];
  for (const [credentialId, prefix] of profiles) {
    const credential = credentials[credentialId];
    const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
    assert.equal(credential.minTotalCredits, 450);
    assert.equal(requirements["quimico-basic"], 205);
    assert.equal(requirements["quimico-biological"], 22);
    assert.equal(requirements["quimico-physical-mathematical"], 60);
    assert.equal(requirements["quimico-chemical-first"], 123);
    assert.equal(requirements[`quimico-${prefix}-professional`], 126);
    assert.equal(requirements[`quimico-${prefix}-business`], 42);
    assert.equal(requirements[`quimico-${prefix}-chemical-second`], 43);
    assert.equal(requirements[`quimico-${prefix}-technology`], 41);
    assert.equal(requirements[`quimico-${prefix}-flexible`], 64);
    assert.equal(requirements[`quimico-${prefix}-optional`], 54);
    assert.equal(requirements["quimico-practicum"], 55);
    assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), ["quimico-final-activity", "validacion-final-plan"]);
    assert.equal(credential.requiredCourseGroups[0].minCompleted, 1);
    assert.deepEqual(credential.requiredCourseGroups[0].courseIds.map((id) => courseById.get(id).name), [
      "Practicantado", "Internado", "Proyecto específico del título",
    ]);
  }
});

test("limita Salto al primer año y conserva la continuidad sin exponer la carrera completa", () => {
  const salto = projection.pathways["salto-primer-ano"];
  assert.deepEqual(salto.periods.map(({ label }) => label), ["Orientación del recorrido"]);
  assert.equal(salto.periods[0].courseIds.length, 1);
  assert.equal(courseById.get(salto.periods[0].courseIds[0]).curricularBlock, true);
  assert.equal(salto.catalogCourseIds.length, 15);
  const codes = salto.catalogCourseIds.map((id) => courseById.get(id).bedeliasCode);
  assert.ok(codes.every((code) => code.startsWith("CENURLN-")));
  assert.ok(codes.includes("CENURLN-SRN05"));
  assert.ok(codes.includes("CENURLN-SRN12"));
  assert.ok(codes.includes("CENURLN-REF04"));
  assert.ok(!codes.includes("964X"));
  assert.ok(!salto.periods.flatMap(({ courseIds }) => courseIds).includes("fq-validacion-final-plan"));
});

test("preserva una composición única y la diferencia regional sólo como cobertura de previaturas", () => {
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 2381);
  assert.equal(audit.bedeliasComparison.normalizedCourseCount, 710);
  assert.equal(audit.bedeliasComparison.regionalComparisonStatus, "curriculum-match-prerequisite-coverage-difference");
  assert.equal(audit.bedeliasComparison.prerequisiteRuleCount, 641);
  assert.equal(audit.bedeliasComparison.noPublishedRuleCount, 180);
  assert.equal(audit.bedeliasComparison.regionalPrerequisiteRuleCount, 35);
  assert.equal(audit.bedeliasComparison.regionalNoPublishedRuleCount, 11);
  assert.equal(projection.rules.length, 461);
  assert.equal(projection.plan.noPublishedRule, 180);
  assert.equal(projection.courses.length, 724);
  assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).length, 714);
  assert.equal(coursesByCode.get("733").length, 2);
  assert.deepEqual(coursesByCode.get("733").map(({ credits }) => credits), [8, 4]);
  for (const pathway of Object.values(projection.pathways)) {
    for (const id of [...pathway.periods.flatMap(({ courseIds }) => courseIds), ...(pathway.catalogCourseIds ?? [])]) {
      assert.ok(courseById.has(id), id);
    }
  }
});

test("registra una sola carrera y avanza la cola a Técnico Bachiller 2015", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-fq");
  const careers = faculty.careers.filter(({ label }) => label === "Químico");
  assert.equal(careers.length, 1);
  assert.equal(careers[0].plans.length, 1);
  assert.equal(careers[0].plans[0].id, "bedelias-fq-quimico-2015");
  assert.equal(careers[0].plans[0].defaultTrajectoryId, "agricola-medio-ambiente");
  assert.equal(careers[0].plans[0].defaultCredentialId, "quimico-agricola-medio-ambiente");
  assert.ok(!queue.queue.some(({ identity }) => identity === "quimico:2015"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 176);
  assert.equal(queue.counts.pendingCanonicalIdentities, 1);
  assert.equal(queue.queue[0].identity, "odontologia:2011");
});
