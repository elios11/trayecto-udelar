import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const report = await readJson("data/bedelias/inventory/ui-extracted-plans.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fic-licenciatura-en-comunicacion-2012.json");
const audit = audits.audits.find((entry) => entry.identity === "licenciatura en comunicacion:2012");

const pathwayIds = [
  "audiovisual",
  "educativa-comunitaria",
  "investigacion-analisis",
  "multimedia-tecnologias",
  "organizacional",
  "periodismo",
  "publicidad",
];

test("publica una sola Licenciatura en Comunicación Plan 2012", () => {
  const fic = catalog.find((faculty) => faculty.id === "bedelias-fic");
  const communicationCareers = fic.careers.filter((career) => /comunicaci[oó]n/i.test(career.label));
  assert.equal(communicationCareers.length, 1);
  assert.equal(communicationCareers[0].label, "Licenciatura en Comunicación");
  assert.deepEqual(communicationCareers[0].plans, [{
    id: "bedelias-fic-licenciatura-en-comunicacion-2012",
    label: "Plan 2012 · vigente",
    defaultTrajectoryId: "audiovisual",
    defaultCredentialId: "bedelias-degree",
  }]);
  assert.equal(projection.plan.degreeTitle, "Licenciado en Comunicación");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "audiovisual",
  }]);
});

test("unifica las cuatro identidades administrativas sin perder trazabilidad", () => {
  const aliases = [
    "licenciatura en ciencias de la comunicacion:2012",
    "licenciatura en comunicacion generacion 2014:2012",
    "licenciatura en comunicacion plan 2012 version 2019:2012",
  ];
  for (const identity of aliases) {
    const alias = audits.audits.find((entry) => entry.identity === identity);
    assert.equal(alias.conclusion.canonicalIdentity, "licenciatura en comunicacion:2012");
    assert.equal(alias.conclusion.excludeFromCurrentUi, true);
    assert.ok(!report.plans.some((plan) => plan.identity === identity));
  }
  assert.ok(report.plans.some((plan) => plan.identity === "licenciatura en comunicacion:2012"));
});

test("expone las siete orientaciones vigentes con 360 créditos cada una", () => {
  assert.deepEqual(Object.keys(projection.pathways), pathwayIds);
  const coursesById = new Map(projection.courses.map((course) => [course.id, course]));
  for (const [pathwayId, pathway] of Object.entries(projection.pathways)) {
    assert.deepEqual(pathway.campusIds, ["montevideo"]);
    const ids = pathway.periods.flatMap((period) => period.courseIds);
    const credits = ids.reduce((sum, id) => sum + coursesById.get(id).credits, 0);
    assert.equal(credits, 360, pathwayId);
    assert.equal(ids.filter((id) => /orient-prof/.test(id)).length, 1, pathwayId);
    assert.equal(ids.filter((id) => /orient-grad/.test(id)).length, 1, pathwayId);
    assert.equal(ids.filter((id) => /stg1/.test(id)).length, 1, pathwayId);
    assert.equal(ids.filter((id) => /stg2/.test(id)).length, 1, pathwayId);
  }
});

test("conserva mínimos modulares y requisitos integrales de egreso", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.deepEqual(Object.fromEntries([...requirements].filter(([id]) => id.startsWith("fic-") && id !== "fic-libre")), {
    "fic-lm": 58,
    "fic-tc": 50,
    "fic-scp": 50,
    "fic-metodologia": 40,
    "fic-pi": 84,
  });
  const degree = projection.creditStructure.credentials.find((credential) => credential.id === "bedelias-degree");
  assert.equal(degree.minTotalCredits, 360);
  const integral = degree.requiredCourseGroups.find((group) => group.id === "fic-egreso-integral");
  assert.equal(integral.minCompleted, 27);
  for (const expected of ["Trabajo Final de Grado", "Experiencia de investigación", "Experiencia de extensión universitaria", "Práctica preprofesional", "Unidad curricular electiva en otra carrera universitaria"]) {
    assert.ok(integral.courseIds.some((id) => projection.courses.find((course) => course.id === id)?.name === expected), expected);
  }
  assert.equal(projection.courses.find((course) => course.name === "Trabajo Final de Grado").credits, 40);
  assert.match(projection.plan.notice, /oferta concreta cambia por semestre/i);
  assert.ok(!projection.courses.some((course) => course.name === "Comunicación e Inteligencia Artificial"));
});

test("automatiza el tránsito del 50% entre ciclos sin confundir créditos totales", () => {
  assert.equal(projection.requirementCourseGroups["fic-ciclo-inicial"].length, 12);
  assert.equal(projection.requirementCourseGroups["fic-ciclo-profundizacion"].length, 19);
  assert.equal(projection.rules.length, 48);
  const initialGate = projection.rules.find((rule) => rule.target.name === "Lenguaje, Cultura y Pensamiento");
  const graduationGate = projection.rules.find((rule) => rule.target.name === "Trabajo Final de Grado");
  assert.deepEqual(initialGate.expression.children[0].groupCreditRequirement, {
    minimum: 45,
    groupCode: "fic-ciclo-inicial",
    groupName: "Ciclo Inicial",
  });
  assert.deepEqual(graduationGate.expression.children[0].groupCreditRequirement, {
    minimum: 67.5,
    groupCode: "fic-ciclo-profundizacion",
    groupName: "Ciclo de Profundización",
  });
  assert.equal(audit.conclusion.canonicalModel, "one-current-plan-with-seven-changeable-orientations");
});
