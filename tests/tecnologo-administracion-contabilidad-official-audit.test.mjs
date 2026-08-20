import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cenurso-tecnologo-en-administracion-y-contabilidad-2012.json");
const loaders = await readFile(new URL("app/data/extracted-academic-loaders.ts", root), "utf8");
const audit = audits.audits.find((entry) => entry.identity === "tecnologo en administracion y contabilidad:2012");

test("publica una sola carrera TAC bajo FCEA con cinco semestres", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Tecnólogo en Administración y Contabilidad")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fcea");
  assert.equal(matches[0].career.plans.length, 1);
  assert.equal(matches[0].career.plans[0].label, "Plan 2012 · vigente");
  assert.equal(projection.plan.degreeTitle, "Tecnólogo en Administración y Contabilidad");
  assert.equal(projection.plan.minCredits, 225);
  assert.equal(projection.plan.durationMonths, 30);
  assert.match(loaders, /"bedelias-cenurso-tecnologo-en-administracion-y-contabilidad-2012"[\s\S]*pathwayLabel: "Mención"/);
});

test("filtra las siete menciones según las seis sedes oficiales", () => {
  assert.deepEqual(Object.keys(projection.pathways), [
    "cooperativismo-asociativismo", "agroindustria", "comunicacion-organizacional",
    "turismo", "gestion-ambiental", "salud", "mineria",
  ]);
  assert.deepEqual(projection.campuses.map((campus) => campus.label), [
    "Colonia", "Mercedes", "Tacuarembó", "Maldonado", "Rocha", "Treinta y Tres",
  ]);
  assert.deepEqual(projection.pathways["cooperativismo-asociativismo"].campusIds, ["colonia", "mercedes"]);
  assert.deepEqual(projection.pathways.agroindustria.campusIds, ["tacuarembo"]);
  assert.deepEqual(projection.pathways.mineria.campusIds, ["treinta-y-tres"]);
  assert.equal(projection.campuses.find((campus) => campus.id === "tacuarembo").defaultPathwayId, "agroindustria");
  assert.equal(projection.campuses.find((campus) => campus.id === "treinta-y-tres").defaultPathwayId, "mineria");
});

test("conserva los 200 créditos comunes y los 25 flexibles de la mención", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.deepEqual(Object.fromEntries([...requirements].filter(([id]) => id !== "plan-total")), {
    "tac-administracion": 50,
    "tac-contabilidad": 70,
    "tac-juridica": 30,
    "tac-economia": 10,
    "tac-metodos": 20,
    "tac-integradoras": 20,
    "tac-flexibles": 25,
  });
  const required = projection.creditStructure.credentials[0].requiredCourseGroups[0];
  assert.equal(required.minCompleted, 20);
  assert.equal(required.courseIds.length, 20);
  const courses = new Map(projection.courses.map((course) => [course.id, course]));
  assert.equal(required.courseIds.reduce((sum, id) => sum + courses.get(id).credits, 0), 200);
  for (const pathway of Object.values(projection.pathways)) {
    const ids = new Set(pathway.periods.flatMap((period) => period.courseIds));
    const flexible = [...ids].map((id) => courses.get(id))
      .filter((course) => course.eligibleRequirementIds.includes("tac-flexibles"));
    assert.ok(flexible.reduce((sum, course) => sum + course.credits, 0) >= 25);
    assert.ok(required.courseIds.every((id) => ids.has(id)));
  }
});

test("no mezcla las opciones específicas entre menciones", () => {
  const idsFor = (pathwayId) => new Set(projection.pathways[pathwayId].periods.flatMap((period) => period.courseIds));
  const cooperative = idsFor("cooperativismo-asociativismo");
  const communication = idsFor("comunicacion-organizacional");
  const environmental = idsFor("gestion-ambiental");
  const health = idsFor("salud");
  assert.ok(cooperative.has("cenurso-coop-administracion"));
  assert.ok(!cooperative.has("cenurso-com-analisis-1"));
  assert.ok(communication.has("cenurso-com-analisis-1"));
  assert.ok(!communication.has("cenurso-coop-administracion"));
  assert.ok(environmental.has("cenurso-amb-calidad-agua"));
  assert.ok(health.has("cenurso-amb-calidad-agua"));
  assert.ok(!health.has("cenurso-amb-derecho"));
  assert.equal(projection.rules.length, 0);
  assert.match(audit.anomalies.find((entry) => entry.field === "prerequisites").resolution, /No se inventan bloqueos/i);
});
