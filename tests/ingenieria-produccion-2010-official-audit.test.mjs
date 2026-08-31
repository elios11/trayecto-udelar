import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-ingenieria-de-produccion-2010.json");
const audit = registry.audits.find(({ identity }) => identity === "ingenieria de produccion:2010");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "ingeniero-produccion");

test("publica una sola Ingeniería de Producción con siete opciones territoriales", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-degree-with-central-and-regional-initial-trajectories");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(projection.plan.degreeTitle, "Ingeniero de Producción");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 450);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), [
    "montevideo",
    "maldonado",
    "paysandu",
    "rivera",
    "rocha",
    "salto",
    "tacuarembo",
  ]);
  assert.deepEqual(Object.keys(projection.pathways), [
    "montevideo-curricula-sugerida",
    "maldonado-inicial",
    "paysandu-inicial",
    "rivera-inicial",
    "rocha-inicial",
    "salto-inicial",
    "tacuarembo-inicial",
  ]);
});

test("filtra cada trayectoria por sede y explica dónde continúa el cursado", () => {
  for (const campus of projection.plan.campuses) {
    const pathway = projection.pathways[campus.defaultPathwayId];
    assert.deepEqual(pathway.campusIds, [campus.id]);
    assert.equal(pathway.periods[0].label, "Orientación del recorrido");
    assert.equal(pathway.periods[0].courseIds.length, 4);
    assert.equal(pathway.periods.at(-1).label, "Validación de egreso");
    assert.ok(pathway.catalogCourseIds.length >= 190);
  }
  assert.match(projection.pathways["maldonado-inicial"].description, /tercer semestre.*Montevideo/i);
  assert.match(projection.pathways["rivera-inicial"].description, /tercer semestre.*Montevideo/i);
  assert.match(projection.pathways["rocha-inicial"].description, /tercer semestre.*Montevideo/i);
  assert.match(projection.pathways["paysandu-inicial"].description, /Paysandú y Salto/i);
  assert.match(projection.pathways["paysandu-inicial"].description, /quinto semestre.*Montevideo/i);
  assert.match(projection.pathways["salto-inicial"].description, /Salto y Paysandú/i);
  assert.match(projection.pathways["tacuarembo-inicial"].description, /quinto semestre.*Montevideo/i);
});

test("conserva la currícula sugerida 2026 sin duplicar el proyecto anual", () => {
  const pathway = projection.pathways["montevideo-curricula-sugerida"];
  const firstSemester = pathway.periods.find(({ label }) => label === "Semestre 1 · obligatorias");
  const projectPeriods = pathway.periods.filter(({ label }) => /Proyecto anual/i.test(label));
  const byId = new Map(projection.courses.map((course) => [course.id, course]));
  assert.deepEqual(firstSemester.courseIds.map((id) => byId.get(id).bedeliasCode), ["1061", "1030", "1151", "1266", "1269"]);
  assert.equal(projectPeriods.length, 1);
  assert.equal(projectPeriods[0].courseIds.length, 1);
  assert.equal(byId.get(projectPeriods[0].courseIds[0]).bedeliasCode, "2099");
  assert.equal(byId.get(projectPeriods[0].courseIds[0]).credits, 30);
});

test("controla mínimos raíz y submínimos sin sumar las brechas dos veces", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.equal(requirements["production-basic"] + requirements["production-specific"] + requirements["production-industrial"] + requirements["production-integrative"], 400);
  assert.equal(credential.minTotalCredits - 400, 50);
  assert.equal(requirements["production-basic"] - (70 + 50 + 16 + 16), 8);
  assert.equal(requirements["production-specific"] - (60 + 30 + 20), 10);
  assert.equal(requirements["production-industrial"] - (7 * 5), 25);
  assert.equal(requirements["production-integrative"], 22 + 8 + 30);
  assert.equal(credential.requiredCourseGroups[0].id, "validacion-final-plan");
});

test("mantiene el catálogo completo, las reglas publicadas y las asignaciones de crédito", () => {
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 206);
  assert.equal(audit.bedeliasComparison.compositionGroupCount, 20);
  assert.equal(projection.courses.length, 261);
  assert.equal(projection.rules.length, 201);
  assert.equal(projection.plan.noPublishedRule, 46);
  assert.equal(new Set(projection.courses.map(({ id }) => id)).size, projection.courses.length);
  assert.ok(projection.courses.every(({ creditAllocations }) => creditAllocations?.length > 0));
});

test("ubica la carrera bajo FING y la mantiene cerrada al avanzar la cola", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-fing");
  const career = faculty.careers.find(({ label }) => label === "Ingeniería de Producción");
  assert.equal(career.plans[0].id, "bedelias-fing-ingenieria-de-produccion-2010");
  assert.equal(career.plans[0].defaultTrajectoryId, "montevideo-curricula-sugerida");
  assert.ok(!queue.queue.some(({ identity }) => identity === "ingenieria de produccion:2010"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 167);
  assert.equal(queue.counts.pendingCanonicalIdentities, 10);
  assert.equal(queue.queue[0].identity, "tecnologo en telecomunicaciones:2009");
});
