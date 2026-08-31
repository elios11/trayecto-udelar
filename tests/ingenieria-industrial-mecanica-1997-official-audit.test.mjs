import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-ingenieria-industrial-mecanica-1997.json");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const audit = registry.audits.find(({ identity }) => identity === "ingenieria industrial mecanica:1997");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "ingeniero-industrial-mecanico");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const courseByCode = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));

const selectedCodes = (pathwayId) => new Set(projection.pathways[pathwayId].periods
  .flatMap(({ courseIds }) => courseIds)
  .map((id) => courseById.get(id)?.bedeliasCode)
  .filter(Boolean));

test("publica un solo Plan 1997 con perfiles y tramos territoriales del mismo título", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-degree-with-personalized-curriculum-guide-profiles-and-partial-regional-trajectories");
  assert.equal(projection.plan.year, "1997");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 450);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), ["montevideo", "paysandu", "tacuarembo"]);
  assert.deepEqual(Object.keys(projection.pathways), [
    "curricula-personalizada",
    "perfil-fluidos-energia",
    "perfil-diseno-materiales",
    "perfil-ingenieria-planta",
    "paysandu-inicial",
    "tacuarembo-inicial",
  ]);
  assert.equal(credential.title, "Ingeniero Industrial Mecánico");
  assert.ok(Object.values(projection.pathways).every(({ credentialId }) => credentialId === credential.id));
});

test("controla los mínimos fijos y las dos reglas alternativas sin sumar Electrotecnia y Química", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.equal(Object.values(requirements).reduce((sum, credits) => sum + credits, 0), 345);
  assert.equal(requirements["iim-electrotecnia"], undefined);
  assert.equal(requirements["iim-quimica"], undefined);
  assert.equal(credential.alternativeNodeRequirements.length, 2);
  assert.deepEqual(credential.alternativeNodeRequirements[0], {
    id: "iim-electrotecnia-o-quimica",
    label: "Electrotecnia o Química",
    minSatisfied: 1,
    options: [
      { nodeId: "iim-electrotecnia", minCredits: 18 },
      { nodeId: "iim-quimica", minCredits: 18 },
    ],
    sourceUrl: "https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/43888/1/PLMEC_1997.pdf",
  });
  assert.deepEqual(
    credential.alternativeNodeRequirements[1].options.map(({ nodeId, minCredits }) => [nodeId, minCredits]),
    [
      ["iim-matematica", 105], ["iim-fisica", 95], ["iim-fluidos-energia", 70], ["iim-materiales-diseno", 57],
      ["iim-produccion", 45], ["iim-control", 35], ["iim-electrotecnia", 43], ["iim-quimica", 43],
      ["iim-sistemas-operaciones", 45], ["iim-economicas-humanas", 33], ["iim-derecho-sociales", 29],
    ],
  );
  assert.match(page, /alternativeNodeRequirements/);
  assert.match(page, /alternativas cumplen el mínimo/);
});

test("mantiene Taller, Pasantía, Proyecto y validación como requisitos nominales", () => {
  assert.deepEqual(credential.requiredCourseGroups.map(({ id }) => id), [
    "iim-taller-nominal",
    "iim-pasantia-nominal",
    "iim-proyecto-nominal",
    "validacion-final-plan",
  ]);
  assert.deepEqual(
    credential.requiredCourseGroups[2].courseIds.map((id) => courseById.get(id).bedeliasCode),
    ["2054", "2004"],
  );
  assert.equal(credential.minTotalCredits, 450);
});

test("los perfiles tipo conservan sus bloques y el catálogo necesario para completar 450 créditos", () => {
  const fluid = projection.pathways["perfil-fluidos-energia"];
  const materials = projection.pathways["perfil-diseno-materiales"];
  const plant = projection.pathways["perfil-ingenieria-planta"];
  for (const pathway of [fluid, materials, plant]) {
    const selectedIds = pathway.periods.flatMap(({ courseIds }) => courseIds);
    assert.equal(new Set(selectedIds).size, selectedIds.length);
    assert.equal(new Set(pathway.catalogCourseIds).size, pathway.catalogCourseIds.length);
    assert.equal(selectedIds.length + pathway.catalogCourseIds.length, projection.courses.length - 31);
    assert.equal(pathway.periods[0].label, "Orientación del recorrido");
    assert.equal(pathway.periods.at(-1).label, "Validación de egreso");
  }
  assert.ok(selectedCodes("perfil-fluidos-energia").has("1818"));
  assert.ok(selectedCodes("perfil-diseno-materiales").has("1720"));
  assert.ok(selectedCodes("perfil-ingenieria-planta").has("1920"));
  assert.ok([fluid, materials, plant].every(({ periods }) => periods.flatMap(({ courseIds }) => courseIds).filter((id) => courseById.get(id)?.bedeliasCode === "2054").length === 1));
});

test("Paysandú y Tacuarembó muestran sólo el tramo oficial y continúan con catálogo central", () => {
  const paysandu = projection.pathways["paysandu-inicial"];
  const tacuarembo = projection.pathways["tacuarembo-inicial"];
  assert.deepEqual(paysandu.periods.filter(({ label }) => /Semestre/.test(label)).map(({ courseIds }) => courseIds.length), [5, 4, 5, 4]);
  assert.deepEqual(tacuarembo.periods.filter(({ label }) => /Semestre/.test(label)).map(({ courseIds }) => courseIds.length), [5, 4, 4]);
  assert.match(paysandu.description, /continúa en Montevideo/i);
  assert.match(tacuarembo.description, /cuenta una sola vez/i);
  assert.equal(projection.courses.filter(({ name }) => name === "Administración y Gestión de las Organizaciones I (TAC)").length, 1);
  assert.ok(paysandu.catalogCourseIds.some((id) => courseById.get(id)?.bedeliasCode === "2054"));
  assert.ok(tacuarembo.catalogCourseIds.some((id) => courseById.get(id)?.bedeliasCode === "2054"));
});

test("fusiona los tres códigos repetidos sin doble conteo del total", () => {
  assert.deepEqual(courseByCode.get("2041").creditAllocations.map(({ nodeId, credits }) => [nodeId, credits]), [
    ["iim-matematica", 6], ["iim-sistemas-operaciones", 4],
  ]);
  assert.equal(courseByCode.get("2041").credits, 10);
  assert.equal(courseByCode.get("1087").credits, 9);
  assert.equal(courseByCode.get("1233").credits, 4);
  assert.equal(courseByCode.get("1233").creditAllocations.length, 2);
  for (const code of ["2041", "1087", "1233"]) {
    assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode === code).length, 1, code);
  }
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 430);
  assert.equal(audit.bedeliasComparison.normalizedCourseCount, 427);
  assert.equal(projection.courses.length, 462);
});

test("conserva la cobertura de previaturas y refleja el siguiente hito", () => {
  assert.equal(projection.rules.length, 237);
  assert.equal(projection.plan.noPublishedRule, 251);
  const faculty = catalog.find(({ id }) => id === "bedelias-fing");
  const career = faculty.careers.find(({ label }) => label === "Ingeniería Industrial Mecánica");
  assert.equal(career.plans[0].id, "bedelias-fing-ingenieria-industrial-mecanica-1997");
  assert.equal(career.plans[0].defaultTrajectoryId, "curricula-personalizada");
  assert.ok(!queue.queue.some(({ identity }) => identity === "ingenieria industrial mecanica:1997"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 165);
  assert.equal(queue.counts.pendingCanonicalIdentities, 12);
  assert.equal(queue.queue[0].identity, "tecnologo en cartografia:2011");
});
