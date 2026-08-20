import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cure-licenciatura-en-gestion-ambiental-2011.json");
const loaders = await readFile(new URL("app/data/extracted-academic-loaders.ts", root), "utf8");
const audit = audits.audits.find((entry) => entry.identity === "licenciatura en gestion ambiental:2011");

test("publica una sola Licenciatura en Gestión Ambiental bajo CURE", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Gestión Ambiental")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-cure");
  assert.equal(matches[0].career.plans.length, 1);
  assert.equal(matches[0].career.plans[0].label, "Plan 2011 · vigente");
  assert.equal(projection.plan.degreeTitle, "Licenciado en Gestión Ambiental");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.match(loaders, /"bedelias-cure-licenciatura-en-gestion-ambiental-2011"[\s\S]*pathwayLabel: "Perfil"/);
});

test("conserva los mínimos oficiales de ambos ciclos", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.equal(requirements.get("lga-basico"), 180);
  assert.equal(requirements.get("lga-profundizacion"), 180);
  assert.deepEqual([
    "lga-basico-exactas", "lga-basico-naturales", "lga-basico-sociales",
    "lga-basico-interdisciplina", "lga-basico-tecnico", "lga-basico-optativas",
  ].map((id) => requirements.get(id)), [24, 24, 24, 48, 24, 36]);
  assert.deepEqual([
    "lga-profundizacion-taller", "lga-profundizacion-cursos",
    "lga-profundizacion-monografia", "lga-profundizacion-final",
  ].map((id) => requirements.get(id)), [24, 91, 20, 45]);
  const required = projection.creditStructure.credentials[0].requiredCourseGroups[0];
  assert.equal(required.minCompleted, 5);
  assert.equal(required.courseIds.length, 5);
  assert.equal(projection.courses.find((course) => course.id === "cure-monografia").credits, 20);
  assert.equal(projection.courses.find((course) => course.id === "cure-trabajo-final").credits, 45);
});

test("filtra los cinco perfiles por las tres sedes oficiales", () => {
  assert.deepEqual(Object.keys(projection.pathways), [
    "manejo-ecosistemas",
    "gestion-sostenible-sistemas-agrarios",
    "contaminacion-ambiental",
    "ordenamiento-territorial",
    "recursos-pesqueros",
  ]);
  assert.deepEqual(projection.campuses.map((campus) => campus.label), ["Maldonado", "Rocha", "Treinta y Tres"]);
  assert.deepEqual(projection.pathways["gestion-sostenible-sistemas-agrarios"].campusIds, ["maldonado", "rocha", "treinta-y-tres"]);
  for (const id of ["manejo-ecosistemas", "contaminacion-ambiental", "ordenamiento-territorial", "recursos-pesqueros"]) {
    assert.deepEqual(projection.pathways[id].campusIds, ["maldonado", "rocha"]);
  }
  assert.equal(projection.campuses.find((campus) => campus.id === "treinta-y-tres").defaultPathwayId, "gestion-sostenible-sistemas-agrarios");
});

test("muestra opciones flexibles sin mezclar cursos fundamentales entre perfiles", () => {
  const idsFor = (pathwayId) => new Set(projection.pathways[pathwayId].periods.flatMap((period) => period.courseIds));
  const ecosystems = idsFor("manejo-ecosistemas");
  const agrarian = idsFor("gestion-sostenible-sistemas-agrarios");
  const contamination = idsFor("contaminacion-ambiental");
  const territory = idsFor("ordenamiento-territorial");
  const fisheries = idsFor("recursos-pesqueros");
  for (const ids of [ecosystems, agrarian, contamination, territory, fisheries]) {
    assert.ok(ids.has("cure-taller-1"));
    assert.ok(ids.has("cure-derecho-ambiental"));
    assert.ok(ids.has("cure-monografia"));
  }
  assert.ok(ecosystems.has("cure-biodiversidad-2"));
  assert.ok(!agrarian.has("cure-biodiversidad-2"));
  assert.ok(agrarian.has("cure-agroecologia"));
  assert.ok(contamination.has("cure-ecotoxicologia"));
  assert.ok(territory.has("cure-metodologias-planificacion"));
  assert.ok(fisheries.has("cure-gestion-recursos-pesqueros"));
  assert.equal(projection.rules.length, 0);
  assert.match(audit.anomalies.find((entry) => entry.field === "prerequisites").resolution, /No se inventan bloqueos/i);
});
