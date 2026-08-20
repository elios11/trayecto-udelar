import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cut-tecnologo-carnico-2010.json");
const audit = audits.audits.find((entry) => entry.identity === "tecnologo carnico:2010");

test("publica una sola carrera compartida con dos sedes del mismo plan", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Tecnólogo Cárnico")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fvet");
  assert.equal(matches[0].career.plans[0].label, "Plan 2010 · vigente");
  assert.equal(projection.plan.degreeTitle, "Tecnólogo Cárnico");
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.plan.minCredits, 262);
  assert.deepEqual(projection.plan.sharedWith, [
    "Facultad de Agronomía",
    "Facultad de Ingeniería",
    "Facultad de Química",
    "DGETP-UTU",
  ]);
  assert.deepEqual(projection.campuses.map(({ id, label }) => ({ id, label })), [
    { id: "tacuarembo", label: "Tacuarembó" },
    { id: "durazno", label: "Durazno" },
  ]);
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.deepEqual(projection.pathways.bedelias.campusIds, ["tacuarembo", "durazno"]);
});

test("conserva los mínimos normativos de los tres ejes y el trabajo final", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.deepEqual([
    "tc-basico", "tc-basico-obligatorio", "tc-basico-optativo",
    "tc-tecnologia", "tc-tecnologia-obligatoria", "tc-tecnologia-optativa",
    "tc-integral", "tc-integral-obligatoria", "tc-integral-optativa",
    "tc-trabajo-final",
  ].map((id) => requirements.get(id)), [57, 45, 12, 142, 101, 41, 48, 28, 20, 15]);
  assert.equal(57 + 142 + 48 + 15, 262);
  assert.equal(45 + 101 + 28 + 15, 189);
  assert.equal(12 + 41 + 20, 73);
});

test("muestra obligatorias y un catálogo optativo sin volverlo obligatorio completo", () => {
  const creditsFor = (requirementId) => projection.courses
    .filter((course) => course.eligibleRequirementIds.includes(requirementId))
    .reduce((total, course) => total + course.credits, 0);
  assert.equal(creditsFor("tc-basico-obligatorio"), 45);
  assert.equal(creditsFor("tc-tecnologia-obligatoria"), 101);
  assert.equal(creditsFor("tc-integral-obligatoria"), 28);
  assert.equal(creditsFor("tc-trabajo-final"), 15);
  assert.equal(creditsFor("tc-basico-optativo"), 12);
  assert.equal(creditsFor("tc-tecnologia-optativa"), 48);
  assert.equal(creditsFor("tc-integral-optativa"), 20);

  const optatives = projection.courses.filter((course) => course.name.includes("optativa"));
  assert.equal(optatives.length, 15);
  assert.equal(optatives.reduce((total, course) => total + course.credits, 0), 80);
  assert.equal(projection.rules.length, 0);
  assert.match(audit.anomalies.find((entry) => entry.field === "optionalCredits").resolution, /73 créditos optativos/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "prerequisites").resolution, /no inventa correlatividades/i);
});

test("mantiene el trabajo final como requisito explícito de egreso", () => {
  const group = projection.creditStructure.credentials[0].requiredCourseGroups
    .find((entry) => entry.id === "tc-trabajo-final-obligatorio");
  assert.equal(group.minCompleted, 1);
  assert.deepEqual(group.courseIds, ["cut-trabajo-final"]);
  assert.match(projection.plan.notice, /trabajo final de 15 créditos/i);
});
