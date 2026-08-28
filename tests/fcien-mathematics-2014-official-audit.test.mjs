import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fcien-licenciatura-en-matematica-2014.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en matematica:2014");
const credentials = new Map(plan.creditStructure.credentials.map((credential) => [credential.id, credential]));
const requirements = (id) => new Map(credentials.get(id).nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));

test("normaliza el Plan 2014 vigente como una carrera de cuatro años en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-six-regulated-mathematics-profiles");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.durationMonths, plan.plan.minCredits], ["Licenciado en Matemática", 48, 360]);
  assert.deepEqual(plan.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "perfil-matematica",
  }]);
  assert.match(audit.anomalies.find(({ field }) => field === "durationMonths").resolution, /60 meses.*cuatro años/i);
});

test("vincula cada perfil con sus metas sin confundirlo con un título intermedio", () => {
  const pathwayIds = [
    "perfil-matematica",
    "orientacion-ciencia-datos",
    "perfil-ciencias-computacion",
    "perfil-ciencias-fisicas",
    "perfil-ciencias-biologicas",
    "perfil-ingenieria-electrica",
  ];
  assert.deepEqual(Object.keys(plan.pathways), pathwayIds);
  assert.deepEqual(Object.keys(plan.pathways).map((id) => plan.pathways[id].credentialId), pathwayIds);
  assert.deepEqual([...credentials.keys()], pathwayIds);

  const faculty = catalog.find(({ id }) => id === "bedelias-fcien");
  const career = faculty.careers.find(({ label }) => label === "Licenciatura en Matemática");
  assert.equal(career.plans[0].defaultTrajectoryId, "perfil-matematica");
  assert.equal(career.plans[0].defaultCredentialId, "perfil-matematica");
});

test("aplica los mínimos del Perfil en Matemática y de Ciencia de Datos", () => {
  const mathematics = requirements("perfil-matematica");
  assert.deepEqual([mathematics.get("area-a"), mathematics.get("area-b"), mathematics.get("area-c")], [284, 36, 8]);
  assert.deepEqual([mathematics.get("a-seminars"), mathematics.get("monograph")], [10, 24]);

  const dataScience = requirements("orientacion-ciencia-datos");
  assert.deepEqual([
    dataScience.get("area-a"),
    dataScience.get("a-probability-statistics"),
    dataScience.get("area-b"),
    dataScience.get("b-computer-science"),
    dataScience.get("area-c"),
    dataScience.get("area-e"),
  ], [284, 48, 36, 36, 8, 10]);
  assert.match(credentials.get("orientacion-ciencia-datos").title, /Orientación en Ciencia de Datos/);
});

test("aplica los cuatro perfiles en otras ciencias sobre el catálogo compartido", () => {
  const expected = [
    ["perfil-ciencias-computacion", "b-computer-science"],
    ["perfil-ciencias-fisicas", "b-physical-sciences"],
    ["perfil-ciencias-biologicas", "b-biological-sciences"],
    ["perfil-ingenieria-electrica", "b-electrical-engineering"],
  ];
  for (const [credentialId, profileNode] of expected) {
    const profile = requirements(credentialId);
    assert.deepEqual([profile.get("area-a"), profile.get("area-b"), profile.get(profileNode), profile.get("area-c")], [220, 96, 72, 8]);
    assert.equal(credentials.get(credentialId).requiredCourseGroups[0].id, "validacion-final-plan");
  }
  assert.equal(plan.creditStructure.nodes.find(({ id }) => id === "monograph").parentId, "area-a");
});

test("mantiene la oferta flexible por áreas y reglas trazables", () => {
  const periods = plan.pathways["perfil-matematica"].periods;
  assert.deepEqual(periods.map(({ label }) => label), [
    "Matemática · Cálculo",
    "Matemática · Álgebra lineal",
    "Matemática · Álgebra",
    "Matemática · Análisis",
    "Matemática · Geometría",
    "Matemática · Probabilidad y estadística",
    "Matemática · Topología",
    "Matemática · Otras subáreas",
    "Matemática · Seminarios",
    "Otras ciencias · Ciencias biológicas",
    "Otras ciencias · Ciencias de la computación",
    "Otras ciencias · Ciencias físicas",
    "Otras ciencias · Ingeniería eléctrica",
    "Historia y Filosofía de la Ciencia",
    "Educación Matemática",
    "Prácticas sociales y productivas",
    "Trabajo monográfico",
    "Validación de egreso",
  ]);
  assert.equal(plan.courses.length, 367);
  assert.equal(plan.rules.length, 292);
  assert.equal(plan.courses.some(({ name }) => /^Créditos:/i.test(name)), false);
  assert.deepEqual(plan.courses.find(({ bedeliasCode }) => bedeliasCode === "IN35").eligibleRequirementIds, ["b-computer-science"]);
  assert.deepEqual(plan.courses.find(({ bedeliasCode }) => bedeliasCode === "FI01").eligibleRequirementIds, ["b-physical-sciences"]);
  assert.match(plan.pathways["perfil-matematica"].description, /plan individual flexible/i);
});
