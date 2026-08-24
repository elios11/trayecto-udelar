import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fcs-licenciatura-en-desarrollo-2009.json");
const audit = audits.audits.find((entry) => entry.identity === "licenciatura en desarrollo:2009");
const credential = projection.creditStructure.credentials[0];

test("publica una única Licenciatura en Desarrollo vigente con tres profundizaciones", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Desarrollo")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fcs");
  assert.equal(matches[0].career.plans[0].label, "Plan 2009 · vigente");
  assert.equal(projection.plan.degreeTitle, "Licenciado en Desarrollo");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.campuses.map(({ id, label }) => ({ id, label })), [
    { id: "montevideo", label: "Montevideo" },
  ]);
  assert.deepEqual(Object.keys(projection.pathways), [
    "desarrollo-economico",
    "desarrollo-territorial",
    "gestion-politicas-publicas",
  ]);
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});

test("conserva 120 créditos iniciales y los seis módulos avanzados por 240", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  const initialIds = ["led-ci-introduccion", "led-ci-metodos", "led-ci-tematicas", "led-ci-optativas"];
  const advancedIds = ["led-problemas", "led-profundizacion-teorica", "led-metodologia", "led-taller", "led-moi", "led-practica-final"];
  assert.deepEqual(initialIds.map((id) => requirements.get(id)), [48, 26, 8, 38]);
  assert.deepEqual(advancedIds.map((id) => requirements.get(id)), [60, 30, 30, 30, 35, 55]);
  assert.equal(initialIds.reduce((sum, id) => sum + requirements.get(id), 0), 120);
  assert.equal(advancedIds.reduce((sum, id) => sum + requirements.get(id), 0), 240);
  assert.equal(credential.nodeRequirements.reduce((sum, item) => sum + item.minCredits, 0), 360);
});

test("cada profundización muestra exactamente sus 35 créditos y ningún período vacío", () => {
  const expected = {
    "desarrollo-economico": ["fcs-moi-de-economia-publica", "fcs-moi-de-componente-metodologico", "fcs-moi-de-optativas"],
    "desarrollo-territorial": ["fcs-moi-dt-desarrollo-politico", "fcs-moi-dt-desarrollo-socioterritorial", "fcs-moi-dt-desarrollo-economico-territorial", "fcs-moi-dt-optativas"],
    "gestion-politicas-publicas": ["fcs-moi-gpp-estado-politicas-2", "fcs-moi-gpp-gestionando", "fcs-moi-gpp-seleccion"],
  };
  const byId = new Map(projection.courses.map((course) => [course.id, course]));
  for (const [pathwayId, exclusiveIds] of Object.entries(expected)) {
    const pathway = projection.pathways[pathwayId];
    const visibleIds = new Set(pathway.periods.flatMap((period) => period.courseIds));
    assert.ok(pathway.periods.every((period) => period.courseIds.length > 0));
    assert.ok(visibleIds.has("fcs-moi-herramientas-interdisciplinario"));
    assert.ok(exclusiveIds.every((id) => visibleIds.has(id)));
    const moiCredits = [...visibleIds]
      .map((id) => byId.get(id))
      .filter((course) => course.eligibleRequirementIds.includes("led-moi"))
      .reduce((sum, course) => sum + course.credits, 0);
    assert.equal(moiCredits, 35);
  }
  assert.ok(!projection.pathways["desarrollo-economico"].periods.flatMap((period) => period.courseIds)
    .includes("fcs-moi-dt-desarrollo-politico"));
});

test("exige el núcleo y las elecciones comunes sin inventar previaturas", () => {
  const groups = new Map(credential.requiredCourseGroups.map((group) => [group.id, group]));
  assert.deepEqual([groups.get("led-nucleo-obligatorio").minCompleted, groups.get("led-nucleo-obligatorio").courseIds.length], [33, 33]);
  assert.deepEqual([
    "led-ci-introduccion-alternativa",
    "led-ci-matematica",
    "led-ci-tematica",
    "led-metodo-practica",
  ].map((id) => [groups.get(id).minCompleted, groups.get(id).courseIds.length]), [[1, 3], [1, 2], [1, 5], [1, 2]]);
  assert.equal(projection.rules.length, 0);
  assert.match(projection.plan.notice, /no tiene previas reglamentadas/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "prerequisites").resolution, /no se convierten en bloqueos automáticos/i);
});
