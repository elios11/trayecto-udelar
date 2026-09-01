import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-ingenieria-fisico-matematica-2017.json");
const audit = registry.audits.find(({ identity }) => identity === "ingenieria fisico matematica:2017");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "ingeniero-fisico-matematico");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const courseByCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));

const selectedCodes = (pathwayId) => new Set(projection.pathways[pathwayId].periods
  .flatMap(({ courseIds }) => courseIds)
  .map((id) => courseById.get(id)?.bedeliasCode)
  .filter(Boolean));

test("publica un solo Plan 2017, una currícula personalizada y ocho perfiles guía", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-degree-with-personalized-curriculum-and-guide-profiles");
  assert.equal(projection.plan.year, "2017");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 450);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), ["montevideo"]);
  assert.deepEqual(Object.keys(projection.pathways), [
    "curricula-personalizada",
    "perfil-procesos-industriales",
    "perfil-energia",
    "perfil-fisica",
    "perfil-mecanica-computacional",
    "perfil-investigacion-operaciones",
    "perfil-control",
    "perfil-ciencia-datos",
    "perfil-procesamiento-senales",
  ]);
  assert.equal(projection.creditStructure.credentials.length, 1);
  assert.equal(credential.title, "Ingeniero Físico-Matemático");
  assert.ok(Object.values(projection.pathways).every(({ credentialId, campusIds }) => (
    credentialId === credential.id && campusIds.length === 1 && campusIds[0] === "montevideo"
  )));
});

test("controla los mínimos oficiales, el proyecto y la aprobación del currículo", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  const rootMinimum = requirements["ifm-basicas"]
    + requirements["ifm-ciencias-ingenieria"]
    + requirements["ifm-aplicada"]
    + requirements["ifm-complementarios"];
  assert.equal(rootMinimum, 412);
  assert.equal(credential.minTotalCredits - rootMinimum, 38);
  assert.equal(requirements["ifm-basicas"] - requirements["ifm-fisica"] - requirements["ifm-matematica"], 50);
  assert.equal(requirements["ifm-ciencias-ingenieria"] - requirements["ifm-modelado"] - requirements["ifm-computacion"], 10);
  assert.equal(
    requirements["ifm-aplicada"]
      - requirements["ifm-tecnologica"]
      - requirements["ifm-talleres"]
      - requirements["ifm-pasantia"]
      - requirements["ifm-proyecto"],
    7,
  );
  assert.equal(requirements["ifm-complementarios"], requirements["ifm-ingenieria-sociedad"]);
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), ["ifm-proyecto-final", "validacion-final-plan"]);
  assert.deepEqual(
    credential.requiredCourseGroups[0].courseIds.map((id) => courseById.get(id).bedeliasCode),
    ["1885"],
  );
});

test("mantiene recomendaciones reemplazables y todo lo demás en el catálogo acreditable", () => {
  for (const pathway of Object.values(projection.pathways)) {
    const selectedIds = pathway.periods.flatMap(({ courseIds }) => courseIds);
    assert.equal(new Set(selectedIds).size, selectedIds.length);
    assert.equal(new Set(pathway.catalogCourseIds).size, pathway.catalogCourseIds.length);
    assert.equal(selectedIds.length + pathway.catalogCourseIds.length, projection.courses.length);
    assert.equal(pathway.periods[0].label, "Orientación del perfil");
    assert.equal(pathway.periods.at(-1).label, "Validación de egreso");
  }
  assert.equal(projection.pathways["curricula-personalizada"].periods.flatMap(({ courseIds }) => courseIds).length, 19);
  assert.equal(projection.pathways["curricula-personalizada"].catalogCourseIds.length, 312);
  assert.ok(selectedCodes("perfil-procesos-industriales").has("Q94"));
  assert.ok(selectedCodes("perfil-energia").has("5508"));
  assert.ok(selectedCodes("perfil-fisica").has("5715"));
  assert.ok(selectedCodes("perfil-mecanica-computacional").has("1884"));
  assert.ok(selectedCodes("perfil-investigacion-operaciones").has("1624"));
  assert.ok(selectedCodes("perfil-control").has("5905"));
  assert.ok(selectedCodes("perfil-ciencia-datos").has("1868"));
  assert.ok(selectedCodes("perfil-procesamiento-senales").has("1460"));
});

test("fusiona las seis unidades con créditos repartidos sin perder sus áreas", () => {
  const signals = courseByCode.get("1457");
  assert.equal(signals.credits, 11);
  assert.deepEqual(signals.creditAllocations.map(({ nodeId, credits }) => ({ nodeId, credits })), [
    { nodeId: "ifm-matematica", credits: 4 },
    { nodeId: "ifm-modelado", credits: 7 },
  ]);
  const initialWorkshop = courseByCode.get("5904");
  assert.equal(initialWorkshop.credits, 10);
  assert.deepEqual(initialWorkshop.creditAllocations.map(({ nodeId, credits }) => ({ nodeId, credits })), [
    { nodeId: "ifm-actividades-complementarias", credits: 6 },
    { nodeId: "ifm-talleres", credits: 4 },
  ]);
  for (const code of ["1457", "CENURLN-SRN06", "2416", "5904", "CENURLN-LIB49", "5720"]) {
    assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode === code).length, 1, code);
  }
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 335);
  assert.equal(audit.bedeliasComparison.normalizedCourseCount, 329);
  assert.equal(projection.courses.length, 331);
});

test("conserva las previaturas publicadas y no inventa las ausentes", () => {
  assert.equal(projection.rules.length, 241);
  assert.equal(projection.plan.publishedRules, 241);
  assert.equal(projection.plan.noPublishedRule, 34);
  assert.ok(projection.courses.every(({ creditAllocations }) => creditAllocations?.length > 0));
  assert.match(audit.anomalies.find(({ field }) => field === "profilesAreGuides").resolution, /mismo perfil|perfiles guía|opción personalizada/i);
  assert.match(audit.anomalies.find(({ field }) => field === "campusScope").resolution, /CIO/);
});

test("ubica la carrera bajo FING y avanza la cola al siguiente plan", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-fing");
  const career = faculty.careers.find(({ label }) => label === "Ingeniería Físico-matemática");
  assert.equal(career.plans[0].id, "bedelias-fing-ingenieria-fisico-matematica-2017");
  assert.equal(career.plans[0].defaultTrajectoryId, "curricula-personalizada");
  assert.ok(!queue.queue.some(({ identity }) => identity === "ingenieria fisico matematica:2017"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 169);
  assert.equal(queue.counts.pendingCanonicalIdentities, 8);
  assert.equal(queue.queue[0].identity, "bachiller en ciencias quimicas:2000");
});
