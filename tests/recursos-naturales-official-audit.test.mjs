import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const snapshot = await readJson("data/bedelias/cur-licenciatura-en-recursos-naturales-2010.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cur-licenciatura-en-recursos-naturales-2010.json");
const audit = registry.audits.find((entry) => entry.identity === "licenciatura en recursos naturales:2010");

test("normaliza una única Licenciatura en Recursos Naturales de Facultad de Ciencias en Rivera", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-plan-one-offering-flexible-by-areas");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(projection.plan.degreeTitle, "Licenciado en Recursos Naturales");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(snapshot.plan.metadata.duration, "60 meses");
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.campuses, [{
    id: "rivera",
    label: "Rivera",
    official: true,
    defaultPathwayId: "bedelias",
  }]);

  const faculty = catalog.find((candidate) => candidate.label === "Facultad de Ciencias");
  const career = faculty.careers.find((candidate) => candidate.label === "Licenciatura en Recursos Naturales");
  assert.deepEqual(career.plans.map((plan) => plan.label), ["Plan 2010 · vigente"]);
});

test("controla los siete mínimos oficiales y los 360 créditos totales", () => {
  const credential = projection.creditStructure.credentials[0];
  const expected = {
    "physical-mathematics": 50,
    "chemistry-biology": 75,
    geosciences: 40,
    "natural-resources": 65,
    "social-sciences": 38,
    optional: 15,
    thesis: 40,
  };
  assert.equal(credential.minTotalCredits, 360);
  assert.deepEqual(
    Object.fromEntries(credential.nodeRequirements.map((entry) => [entry.nodeId, entry.minCredits])),
    expected,
  );
  assert.equal(Object.values(expected).reduce((sum, credits) => sum + credits, 0), 323);
  assert.ok(projection.courses.reduce((sum, course) => sum + course.credits, 0) > 360);
  assert.match(projection.plan.notice, /catálogo disponible no es obligatorio completo/i);
});

test("mantiene el catálogo flexible y exige tesina y validación de la Comisión de Carrera", () => {
  assert.equal(projection.courses.filter((course) => course.dataStatus !== "manual-validation").length, 378);
  assert.deepEqual(projection.pathways.bedelias.periods.slice(0, 7).map((period) => period.label), [
    "ÁREA FÍSICO - MATEMÁTICA",
    "ÁREA QUÍMICA - BIOLOGÍA",
    "ÁREA GEOCIENCIAS",
    "ÁREA RECURSOS NATURALES",
    "ÁREA CIENCIAS SOCIALES",
    "OPTATIVAS",
    "TESINA DE GRADUACIÓN",
  ]);
  const credential = projection.creditStructure.credentials[0];
  const thesis = credential.requiredCourseGroups.find((group) => group.id === "mandatory-thesis");
  assert.deepEqual([thesis.minCompleted, thesis.courseIds.length], [1, 1]);
  const thesisCourse = projection.courses.find((course) => course.bedeliasCode === "RN500");
  assert.equal(thesisCourse.credits, 40);
  assert.ok(thesis.courseIds.includes(thesisCourse.id));

  const validation = credential.requiredCourseGroups.find((group) => group.id === "validacion-final-plan");
  assert.equal(validation.minCompleted, 1);
  assert.match(validation.label, /Comisión de Carrera/i);
});

