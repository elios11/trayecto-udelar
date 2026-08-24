import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cucel-tecnologo-en-sistemas-integrados-de-produccion-agropecuaria-2022.json");
const audit = registry.audits.find((entry) => entry.identity === "tecnologo en sistemas integrados de produccion agropecuaria:2022");

test("publica un único TESIPA Plan 2022 vigente en Melo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(projection.plan.year, "2022");
  assert.equal(projection.plan.degreeTitle, "Tecnólogo en Sistemas Integrados de Producción Agropecuaria");
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.plan.minCredits, 270);
  assert.deepEqual(projection.campuses, [{
    id: "melo-cerro-largo",
    label: "Melo, Cerro Largo",
    official: true,
    defaultPathwayId: "personalizada",
  }]);
  assert.deepEqual(projection.plan.sharedWith, ["Facultad de Agronomía", "Facultad de Veterinaria"]);
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});

test("controla los 270 créditos por área sin exigir todo el catálogo", () => {
  const expected = {
    "integrated-production": 64,
    "natural-resources": 37,
    "economic-social": 26,
    "integrative-activities": 40,
    "flexible-credits": 79,
    "final-project": 24,
  };
  const credential = projection.creditStructure.credentials[0];
  assert.equal(credential.minTotalCredits, 270);
  assert.deepEqual(Object.fromEntries(credential.nodeRequirements.map((entry) => [entry.nodeId, entry.minCredits])), expected);
  assert.equal(Object.values(expected).reduce((sum, credits) => sum + credits, 0), 270);

  const available = Object.fromEntries(Object.keys(expected).map((nodeId) => [
    nodeId,
    projection.courses
      .filter((course) => course.eligibleRequirementIds.includes(nodeId))
      .reduce((sum, course) => sum + course.credits, 0),
  ]));
  assert.deepEqual(available, {
    "integrated-production": 64,
    "natural-resources": 51,
    "economic-social": 59,
    "integrative-activities": 54,
    "flexible-credits": 79,
    "final-project": 24,
  });
  assert.equal(projection.courses.reduce((sum, course) => sum + course.credits, 0), 331);
  assert.match(projection.plan.notice, /semiabierto/i);
});

test("hace operables sólo los saldos que Bedelías no individualiza", () => {
  const blocks = projection.courses.filter((course) => course.curricularBlock);
  assert.deepEqual(blocks.map((course) => [course.name, course.credits, course.eligibleRequirementIds[0]]), [
    ["Créditos obligatorios de Sistemas Integrados no individualizados en Bedelías", 5, "integrated-production"],
    ["Optativas o electivas adicionales validadas por la Comisión de Carrera", 3, "flexible-credits"],
    ["Trabajo Final: pasantía académica o proyecto de conclusión de carrera", 24, "final-project"],
  ]);
  assert.equal(projection.courses.filter((course) => course.dataStatus === "bedelias-composition").length, 43);
  assert.ok(audit.anomalies.some((entry) => entry.field === "missingFinalProject"));
  assert.ok(audit.anomalies.some((entry) => entry.field === "structuralCreditGaps"));
});

test("ofrece una trayectoria personalizada y tres énfasis no certificados", () => {
  assert.deepEqual(Object.keys(projection.pathways), [
    "personalizada",
    "sistemas-integrados",
    "recursos-naturales",
    "economico-social",
  ]);
  const expectedPeriods = [
    "SISTEMAS INTEGRADOS DE PRODUCCIÓN",
    "RECURSOS NATURALES Y SOSTENIBILIDAD",
    "ECONÓMICO Y SOCIAL",
    "ACTIVIDADES INTEGRADORAS",
    "ACTIVIDADES COMPLEMENTARIAS",
    "OPTATIVAS Y ELECTIVAS",
    "Ajustes estructurales del plan",
    "Trabajo Final",
  ];
  for (const pathway of Object.values(projection.pathways)) {
    assert.deepEqual(pathway.periods.map((period) => period.label), expectedPeriods);
    assert.equal(pathway.periods.flatMap((period) => period.courseIds).length, projection.courses.length);
    assert.deepEqual(pathway.campusIds, ["melo-cerro-largo"]);
  }
  assert.equal(audit.conclusion.siteSpecificTrajectoryAvailability, false);
  assert.match(audit.anomalies.find((entry) => entry.field === "suggestedPathways").resolution, /ejemplos no certificados/i);
});
