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

test("cada profundización reproduce ocho semestres y mantiene su MOI en el catálogo flexible", () => {
  assert.equal(projection.courses.length, 55);
  const expected = {
    "desarrollo-economico": ["fcs-moi-de-economia-publica", "fcs-moi-de-componente-metodologico", "fcs-moi-de-optativas"],
    "desarrollo-territorial": ["fcs-moi-dt-desarrollo-politico", "fcs-moi-dt-desarrollo-socioterritorial", "fcs-moi-dt-desarrollo-economico-territorial", "fcs-moi-dt-optativas"],
    "gestion-politicas-publicas": ["fcs-moi-gpp-estado-politicas-2", "fcs-moi-gpp-gestionando", "fcs-moi-gpp-seleccion"],
  };
  const byId = new Map(projection.courses.map((course) => [course.id, course]));
  for (const [pathwayId, exclusiveIds] of Object.entries(expected)) {
    const pathway = projection.pathways[pathwayId];
    assert.deepEqual(pathway.periods.map(({ label }) => label), [
      "1.er semestre",
      "2.º semestre",
      "3.er semestre",
      "4.º semestre",
      "5.º semestre",
      "6.º semestre",
      "7.º semestre",
      "8.º semestre",
    ]);
    assert.ok(pathway.periods.every((period) => period.courseIds.length > 0));
    assert.deepEqual(pathway.catalogCourseIds, ["fcs-ci-optativas-generales", ...exclusiveIds]);
    const visibleIds = new Set([
      ...pathway.periods.flatMap((period) => period.courseIds),
      ...pathway.catalogCourseIds,
    ]);
    assert.ok(visibleIds.has("fcs-moi-herramientas-interdisciplinario"));
    assert.ok(exclusiveIds.every((id) => visibleIds.has(id)));
    const moiCredits = [...visibleIds]
      .map((id) => byId.get(id))
      .filter((course) => course.eligibleRequirementIds.includes("led-moi"))
      .reduce((sum, course) => sum + course.credits, 0);
    assert.equal(moiCredits, 35);
  }
  const projectedIds = new Set(Object.values(projection.pathways).flatMap((pathway) => [
    ...pathway.periods.flatMap((period) => period.courseIds),
    ...pathway.catalogCourseIds,
  ]));
  assert.equal(projectedIds.size, 55);
  assert.ok(!projection.pathways["desarrollo-economico"].catalogCourseIds.includes("fcs-moi-dt-desarrollo-politico"));

  const third = projection.pathways["desarrollo-economico"].periods.find(({ label }) => label === "3.er semestre");
  const fourth = projection.pathways["desarrollo-economico"].periods.find(({ label }) => label === "4.º semestre");
  assert.ok(third.courseIds.includes("fcs-ci-bases-desarrollo"));
  assert.ok(third.courseIds.includes("fcs-led-analisis-macro"));
  assert.ok(fourth.courseIds.includes("fcs-ci-desafios-contemporaneos"));
  assert.ok(fourth.courseIds.includes("fcs-led-objeto-metodo"));

  const desarrolloEconomicoCatalog = projection.pathways["desarrollo-economico"].catalogCourseIds;
  assert.ok(!desarrolloEconomicoCatalog.includes("fcs-led-metodos-cuantitativos-aplicados"));
  assert.match(audit.anomalies.find((entry) => entry.field === "doubleCounting").resolution, /no duplica/i);

  const malla = audit.sources.find(({ url }) => url.endsWith("Malla-curricular_LED-2306.pdf"));
  const trayectoria = audit.sources.find(({ url }) => url.endsWith("Febrero-20211-1.pdf"));
  assert.equal(malla.contentHash, "sha256:474e297b370a6f3ec6577d7910be8e35057976ce73f401d286a9405d9f0e1c0d");
  assert.equal(trayectoria.contentHash, "sha256:92be0e25bd5f9164104764a0810dfcf5f81e197bd0a4d2b840f432a78a1549cb");
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
