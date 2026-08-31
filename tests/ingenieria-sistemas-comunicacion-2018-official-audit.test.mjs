import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-ingenieria-en-sistemas-de-comunicacion-2018.json");
const audit = registry.audits.find(({ identity }) => identity === "ingenieria en sistemas de comunicacion:2018");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "ingeniero-sistemas-comunicacion");
const courseByCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));

test("publica un solo Plan 2018 y cuatro perfiles del mismo título en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-degree-with-suggested-profiles-and-personalized-curriculum");
  assert.equal(projection.plan.degreeTitle, "Ingeniero en Sistemas de Comunicación");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 450);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), ["montevideo"]);
  assert.deepEqual(Object.keys(projection.pathways), [
    "perfil-general-personalizado",
    "perfil-electronica-comunicaciones",
    "perfil-redes-telecomunicaciones",
    "perfil-procesamiento-informacion-senales",
  ]);
  assert.equal(projection.creditStructure.credentials.length, 1);
  assert.ok(Object.values(projection.pathways).every(({ credentialId }) => credentialId === credential.id));
});

test("controla los mínimos oficiales, el proyecto y la aprobación del perfil", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.equal(requirements["isc-basica"] + requirements["isc-basico-tecnologica"] + requirements["isc-tecnologica"] + requirements["isc-complementaria"], 337);
  assert.equal(requirements["isc-matematica"] + requirements["isc-fisica"], requirements["isc-basica"]);
  assert.equal(
    requirements["isc-electrica"] + requirements["isc-digitales"] + requirements["isc-electronica"] + requirements["isc-comunicacion"] + requirements["isc-programacion"],
    requirements["isc-basico-tecnologica"],
  );
  assert.equal(
    requirements["isc-transmision"] + requirements["isc-computacion"] + requirements["isc-procesamiento"] + requirements["isc-integradoras"],
    requirements["isc-tecnologica"],
  );
  assert.equal(requirements["isc-industrial"] + requirements["isc-sociedad"], requirements["isc-complementaria"]);
  assert.equal(credential.minTotalCredits - 337, 113);
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), ["isc-proyecto-final", "validacion-final-plan"]);
  const projectGroup = credential.requiredCourseGroups[0];
  assert.deepEqual(projectGroup.courseIds.map((id) => projection.courses.find((course) => course.id === id).bedeliasCode), ["2061", "2062"]);
});

test("mantiene las recomendaciones como trayectorias y las opcionales como catálogo", () => {
  const expectedNamedCredits = {
    "perfil-general-personalizado": 383,
    "perfil-electronica-comunicaciones": 406,
    "perfil-redes-telecomunicaciones": 405,
    "perfil-procesamiento-informacion-senales": 416,
  };
  const byId = new Map(projection.courses.map((course) => [course.id, course]));
  for (const [pathwayId, expectedCredits] of Object.entries(expectedNamedCredits)) {
    const pathway = projection.pathways[pathwayId];
    const selectedCredits = pathway.periods
      .flatMap(({ courseIds }) => courseIds)
      .reduce((sum, id) => sum + byId.get(id).credits, 0);
    assert.equal(selectedCredits, expectedCredits);
    assert.ok(pathway.catalogCourseIds.length >= 182);
    assert.equal(new Set(pathway.catalogCourseIds).size, pathway.catalogCourseIds.length);
    assert.equal(pathway.periods[0].label, "Orientación del perfil");
    assert.equal(pathway.periods.at(-1).label, "Validación de egreso");
  }
  assert.match(byId.get(projection.pathways["perfil-general-personalizado"].periods[0].courseIds[0]).name, /alcanzar 450 créditos/i);
});

test("fusiona cada curso con créditos repartidos sin perder sus áreas", () => {
  const antennas = courseByCode.get("5803");
  assert.equal(antennas.credits, 10);
  assert.deepEqual(antennas.creditAllocations.map(({ nodeId, credits }) => ({ nodeId, credits })), [
    { nodeId: "isc-fisica", credits: 2 },
    { nodeId: "isc-transmision", credits: 8 },
  ]);
  const randomSignals = courseByCode.get("1460");
  assert.equal(randomSignals.credits, 8);
  assert.deepEqual(randomSignals.creditAllocations.map(({ nodeId, credits }) => ({ nodeId, credits })), [
    { nodeId: "isc-comunicacion", credits: 5 },
    { nodeId: "isc-transmision", credits: 3 },
  ]);
  assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode === "5803").length, 1);
  assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode === "1460").length, 1);
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 227);
  assert.equal(audit.bedeliasComparison.normalizedCourseCount, 222);
  assert.equal(projection.courses.length, 224);
});

test("conserva previaturas y discrepancias orientativas sin inventar reglas", () => {
  assert.equal(projection.rules.length, 194);
  assert.equal(projection.plan.publishedRules, 194);
  assert.equal(projection.plan.noPublishedRule, 36);
  assert.match(audit.anomalies.find(({ field }) => field === "suggestedProfileTotals").resolution, /451/);
  assert.match(audit.anomalies.find(({ field }) => field === "profilesAreNotCredentials").resolution, /mismo título/i);
  assert.ok(projection.courses.every(({ creditAllocations }) => creditAllocations?.length > 0));
});

test("ubica la carrera bajo FING y conserva la siguiente identidad pendiente", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-fing");
  const career = faculty.careers.find(({ label }) => label === "Ingeniería en Sistemas de Comunicación");
  assert.equal(career.plans[0].id, "bedelias-fing-ingenieria-en-sistemas-de-comunicacion-2018");
  assert.equal(career.plans[0].defaultTrajectoryId, "perfil-general-personalizado");
  assert.ok(!queue.queue.some(({ identity }) => identity === "ingenieria en sistemas de comunicacion:2018"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 165);
  assert.equal(queue.counts.pendingCanonicalIdentities, 12);
  assert.equal(queue.queue[0].identity, "tecnologo en cartografia:2011");
});
