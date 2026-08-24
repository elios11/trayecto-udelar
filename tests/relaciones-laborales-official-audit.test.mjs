import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fder-licenciatura-en-relaciones-laborales-2012.json");
const pageSource = await readFile(new URL("app/page.tsx", root), "utf8");
const audit = audits.audits.find((entry) => entry.identity === "licenciatura en relaciones laborales:2012");
const intermediate = projection.creditStructure.credentials.find((credential) => credential.id === "rrll-tecnico-asesor");
const degree = projection.creditStructure.credentials.find((credential) => credential.id === "bedelias-degree");

test("publica una sola Licenciatura en Relaciones Laborales Plan 2012", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Relaciones Laborales")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fder");
  assert.deepEqual(matches[0].career.plans, [{
    id: "bedelias-fder-licenciatura-en-relaciones-laborales-2012",
    label: "Plan 2012 · vigente",
    defaultTrajectoryId: "bedelias",
    defaultCredentialId: "bedelias-degree",
  }]);
  assert.equal(projection.plan.degreeTitle, "Licenciado en Relaciones Laborales");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 320);
  assert.deepEqual(projection.campuses.map(({ id, label }) => ({ id, label })), [{ id: "montevideo", label: "Montevideo" }]);
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});

test("representa los tres ciclos y los 96 créditos opcionales sin inventar asignaturas", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.deepEqual([...requirements.entries()].filter(([id]) => id.startsWith("rrll-")), [
    ["rrll-basico", 80],
    ["rrll-orientado", 120],
    ["rrll-profesional", 120],
  ]);
  assert.equal(projection.courses.length, 37);
  assert.equal(projection.pathways.bedelias.periods.length, 8);
  const optionalBlocks = projection.courses.filter((course) => course.curricularBlock);
  assert.deepEqual(optionalBlocks.map((course) => course.credits), [36, 30, 30]);
  assert.equal(optionalBlocks.reduce((sum, course) => sum + course.credits, 0), 96);
});

test("expone el título intermedio exacto y la credencial final", () => {
  assert.ok(intermediate);
  assert.equal(intermediate.title, "Técnico Asesor en Relaciones Laborales");
  assert.equal(intermediate.minTotalCredits, 200);
  assert.deepEqual(intermediate.nodeRequirements, [
    { nodeId: "rrll-basico", minCredits: 80 },
    { nodeId: "rrll-orientado", minCredits: 120 },
  ]);
  assert.deepEqual(intermediate.requiredCourseGroups.map((group) => [group.id, group.minCompleted]), [
    ["rrll-basico-obligatorio", 7],
    ["rrll-orientado-obligatorio", 12],
  ]);
  assert.equal(degree.minTotalCredits, 320);
  assert.equal(degree.requiredCourseGroups.find((group) => group.id === "rrll-metodologia").minCompleted, 1);
  assert.equal(degree.requiredCourseGroups.find((group) => group.id === "rrll-egreso").minCompleted, 1);
  assert.match(pageSource, /Título intermedio/);
  assert.match(pageSource, /intermediateCredential\.id/);
});

test("mantiene las tres modalidades actuales de egreso por 30 créditos", () => {
  const group = degree.requiredCourseGroups.find((entry) => entry.id === "rrll-egreso");
  assert.equal(group.courseIds.length, 3);
  assert.deepEqual(group.courseIds.map((id) => projection.courses.find((course) => course.id === id).credits), [30, 30, 30]);
  assert.deepEqual(group.courseIds.map((id) => projection.courses.find((course) => course.id === id).name), [
    "Monografía final de grado",
    "Pasantía final de grado",
    "Acreditación de práctica profesional",
  ]);
  assert.match(projection.plan.notice, /estar cursando la metodología/i);
  assert.equal(projection.rules.some((rule) => group.courseIds.includes(rule.target.code)), false);
});

test("automatiza créditos y cantidad de asignaturas dentro de sus ciclos correctos", () => {
  const rules = new Map(projection.rules.map((rule) => [rule.target.code, rule]));
  assert.equal(rules.size, 14);
  const techniqueTwo = rules.get("fder-tecnica-2");
  assert.deepEqual(techniqueTwo.expression.children.find((child) => child.groupCreditRequirement)?.groupCreditRequirement, {
    minimum: 80,
    groupCode: "rrll-basico",
    groupName: "Ciclo de Formación Básica",
  });
  assert.deepEqual(techniqueTwo.expression.children.find((child) => child.groupApprovalRequirement)?.groupApprovalRequirement, {
    minimum: 9,
    groupCode: "rrll-orientado-asignaturas",
    groupName: "Ciclo de Estudios Orientados",
  });
  assert.equal(projection.requirementCourseGroups["rrll-basico"].length, 8);
  assert.equal(projection.requirementCourseGroups["rrll-orientado-asignaturas"].length, 12);
  assert.match(pageSource, /groupApprovals\(expression\.groupApprovalRequirement\.groupCode\)/);
  assert.match(pageSource, /unidades aprobadas en/);
});
