import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fq-licenciatura-en-tecnologias-de-la-quimica-2022.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en tecnologias de la quimica:2022");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const courseByCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));

const periodCredits = (pathway) => pathway.periods.map(({ courseIds }) => (
  courseIds.reduce((sum, id) => sum + courseById.get(id).credits, 0)
));

const availableCodes = (pathway) => new Set([
  ...pathway.periods.flatMap(({ courseIds }) => courseIds),
  ...(pathway.catalogCourseIds ?? []),
].map((id) => courseById.get(id)?.bedeliasCode).filter(Boolean));

test("publica una sola carrera y título con dos orientaciones oficiales", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-current-degree-two-official-orientations-one-campus");
  assert.equal(projection.plan.degreeTitle, "Licenciado en Tecnologías de la Química");
  assert.equal(projection.plan.year, "2022");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.plan.campuses.map(({ id, defaultPathwayId }) => [id, defaultPathwayId]), [
    ["montevideo", "biotecnologia"],
  ]);
  assert.deepEqual(Object.keys(projection.pathways), ["biotecnologia", "nanotecnologia"]);
  assert.deepEqual(Object.values(projection.pathways).map(({ campusIds }) => campusIds), [["montevideo"], ["montevideo"]]);
});

test("traslada sin duplicados los dos dameros vigentes de nueve semestres", () => {
  const bio = projection.pathways.biotecnologia;
  const nano = projection.pathways.nanotecnologia;
  const expectedLabels = [
    "Primer semestre", "Segundo semestre", "Tercer semestre", "Cuarto semestre", "Quinto semestre",
    "Sexto semestre", "Séptimo semestre", "Octavo semestre", "Noveno semestre", "Optativas y electivas",
    "Validación de egreso",
  ];
  assert.deepEqual(bio.periods.map(({ label }) => label), expectedLabels);
  assert.deepEqual(nano.periods.map(({ label }) => label), expectedLabels);
  assert.deepEqual(periodCredits(bio), [37, 41, 34, 34, 41, 35, 17, 17, 44, 0, 0]);
  assert.deepEqual(periodCredits(nano), [37, 41, 39, 40, 47, 23, 24, 9, 40, 0, 0]);
  for (const pathway of [bio, nano]) {
    const selected = pathway.periods.flatMap(({ courseIds }) => courseIds);
    assert.equal(new Set(selected).size, selected.length);
    assert.equal(selected.filter((id) => courseById.get(id)?.bedeliasCode === "LTQ2").length, 1);
  }
  assert.equal(courseByCode.get("512").credits, 5);
  assert.ok(bio.periods.find(({ label }) => label === "Octavo semestre").courseIds.includes(courseByCode.get("196").id));
  assert.ok(nano.periods.find(({ label }) => label === "Séptimo semestre").courseIds.includes(courseByCode.get("457").id));
});

test("controla los mínimos y la alternativa Practicantado o Proyecto por orientación", () => {
  const credentials = Object.fromEntries(projection.creditStructure.credentials.map((credential) => [credential.id, credential]));
  const expectedShared = {
    "ltq-basic": 150,
    "ltq-physical-mathematical": 50,
    "ltq-chemical-biological": 100,
    "ltq-project": 40,
  };
  for (const [profile, label] of [["bio", "biotecnologia"], ["nano", "nanotecnologia"]]) {
    const credential = credentials[`licenciado-tecnologias-quimica-${label}`];
    const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
    assert.equal(credential.minTotalCredits, 360);
    assert.deepEqual(Object.fromEntries(Object.entries(requirements).filter(([id]) => expectedShared[id] !== undefined)), expectedShared);
    assert.equal(requirements[`ltq-${profile}-professional`], 105);
    assert.equal(requirements[`ltq-${profile}-technological`], 90);
    assert.equal(requirements[`ltq-${profile}-business`], 15);
    assert.equal(requirements[`ltq-${profile}-flexible`], 65);
    assert.equal(requirements[`ltq-${profile}-optional`], 50);
    assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), ["ltq-final-activity", "validacion-final-plan"]);
    assert.deepEqual(credential.requiredCourseGroups[0].courseIds.map((id) => courseById.get(id).bedeliasCode), ["LTQ1", "LTQ2"]);
  }
  assert.equal(projection.pathways.biotecnologia.credentialId, "licenciado-tecnologias-quimica-biotecnologia");
  assert.equal(projection.pathways.nanotecnologia.credentialId, "licenciado-tecnologias-quimica-nanotecnologia");
});

test("filtra los catálogos de orientación y conserva las materias compartidas una sola vez", () => {
  const bioCodes = availableCodes(projection.pathways.biotecnologia);
  const nanoCodes = availableCodes(projection.pathways.nanotecnologia);
  assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).length, 291);
  assert.equal(new Set(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map(({ bedeliasCode }) => bedeliasCode)).size, 291);
  assert.ok(bioCodes.has("533"));
  assert.ok(!nanoCodes.has("533"));
  assert.ok(nanoCodes.has("457"));
  assert.ok(!bioCodes.has("457"));
  assert.ok(bioCodes.has("01X") && nanoCodes.has("01X"));
  assert.ok(projection.pathways.biotecnologia.catalogCourseIds.every((id) => !projection.pathways.biotecnologia.periods.flatMap(({ courseIds }) => courseIds).includes(id)));
  assert.ok(projection.pathways.nanotecnologia.catalogCourseIds.every((id) => !projection.pathways.nanotecnologia.periods.flatMap(({ courseIds }) => courseIds).includes(id)));
});

test("preserva composición, previaturas y referencias internas consistentes", () => {
  assert.equal(projection.courses.length, 294);
  assert.equal(projection.rules.length, 446);
  assert.equal(projection.plan.noPublishedRule, 31);
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 551);
  assert.equal(audit.bedeliasComparison.normalizedCourseCount, 291);
  for (const pathway of Object.values(projection.pathways)) {
    for (const id of [...pathway.periods.flatMap(({ courseIds }) => courseIds), ...(pathway.catalogCourseIds ?? [])]) {
      assert.ok(courseById.has(id), id);
    }
  }
});

test("registra una sola entrada en FQ y avanza la cola a Químico 2015", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-fq");
  const careers = faculty.careers.filter(({ label }) => label === "Licenciatura en Tecnologías de la Química");
  assert.equal(careers.length, 1);
  assert.equal(careers[0].plans.length, 1);
  assert.equal(careers[0].plans[0].id, "bedelias-fq-licenciatura-en-tecnologias-de-la-quimica-2022");
  assert.equal(careers[0].plans[0].defaultTrajectoryId, "biotecnologia");
  assert.equal(careers[0].plans[0].defaultCredentialId, "licenciado-tecnologias-quimica-biotecnologia");
  assert.ok(!queue.queue.some(({ identity }) => identity === "licenciatura en tecnologias de la quimica:2022"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 174);
  assert.equal(queue.counts.pendingCanonicalIdentities, 3);
  assert.equal(queue.queue[0].identity, "tecnico bach en cs quimicas:2015");
});
