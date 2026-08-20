import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cut-ingenieria-forestal-2013.json");
const audit = audits.audits.find((entry) => entry.identity === "ingenieria forestal:2013");

test("publica una sola Ingeniería Forestal compartida y con sede Tacuarembó", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Ingenieria Forestal")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fagro");
  assert.equal(matches[0].career.plans.length, 1);
  assert.equal(matches[0].career.plans[0].label, "Plan 2013 · vigente");
  assert.equal(projection.plan.degreeTitle, "Ingeniero Forestal");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 450);
  assert.deepEqual(projection.plan.sharedWith, ["Facultad de Ingeniería", "Facultad de Química"]);
  assert.deepEqual(projection.campuses.map(({ id, label }) => ({ id, label })), [
    { id: "tacuarembo", label: "Tacuarembó" },
  ]);
});

test("conserva los mínimos oficiales de las áreas y subáreas", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.deepEqual([
    "if-introductoria", "if-ciencias-basicas", "if-biociencias", "if-ecologia-silvicultura",
    "if-procesos-industriales", "if-gestion", "if-complementaria", "if-trabajo-final",
  ].map((id) => requirements.get(id)), [5, 120, 64, 72, 68, 52, 34, 35]);
  assert.deepEqual(["if-matematica", "if-fisica", "if-quimica", "if-informatica"].map((id) => requirements.get(id)), [45, 30, 30, 15]);
  assert.deepEqual(["if-celular-fisiologia", "if-botanica", "if-biociencias-aplicadas"].map((id) => requirements.get(id)), [24, 20, 20]);
  assert.deepEqual(["if-silvicultura-basica", "if-paisaje", "if-silvicultura-aplicada"].map((id) => requirements.get(id)), [20, 30, 22]);
  assert.deepEqual(["if-fluidos-energia", "if-electrotecnia-control", "if-materiales-diseno", "if-tecnologia-madera"].map((id) => requirements.get(id)), [20, 15, 15, 18]);
  assert.deepEqual(["if-politica-legislacion", "if-economia", "if-sistemas-gestion", "if-operaciones-logistica"].map((id) => requirements.get(id)), [6, 16, 14, 16]);
});

test("representa los 450 créditos como bloques y no inventa orientaciones ni previaturas", () => {
  assert.equal(projection.courses.reduce((total, course) => total + course.credits, 0), 450);
  assert.ok(projection.courses.every((course) => course.curricularBlock === true));
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.equal(projection.pathways.bedelias.label, "Malla oficial");
  assert.equal(projection.rules.length, 0);
  assert.match(audit.anomalies.find((entry) => entry.field === "courseComposition").resolution, /bloques de crédito/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "prerequisites").resolution, /No se codifica/i);
});
