import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCourseRecord, normalizeExpressionNode } from "../scripts/scrape-bedelias.mjs";

const rawNode = (label) => ({ kind: "requirement", sourceType: "default", label, children: [] });

test("normaliza mínimos de aprobación por grupo de FADU", () => {
  const node = normalizeExpressionNode(rawNode("1 aprobación/es en el Grupo: 9371 - PRÁCTICAS CURRICULARES DE ENSEÑANZA"));
  assert.equal(node.parserStatus, "parsed");
  assert.deepEqual(node.groupApprovalRequirement, {
    minimum: 1,
    groupCode: "9371",
    groupName: "PRÁCTICAS CURRICULARES DE ENSEÑANZA",
  });
});

test("normaliza códigos de grupo con guiones usados por FAGRO", () => {
  const curricular = normalizeExpressionNode(rawNode("135 créditos en el Grupo: 2020-2-3 - ASIGNATURAS OBLIGATORIAS"));
  const electives = normalizeExpressionNode(rawNode("12 créditos en el Grupo: UC-ELE - ELECTIVAS"));

  assert.deepEqual(curricular.groupCreditRequirement, {
    minimum: 135,
    groupCode: "2020-2-3",
    groupName: "ASIGNATURAS OBLIGATORIAS",
  });
  assert.deepEqual(electives.groupCreditRequirement, {
    minimum: 12,
    groupCode: "UC-ELE",
    groupName: "ELECTIVAS",
  });
  assert.equal(curricular.parserStatus, "parsed");
  assert.equal(electives.parserStatus, "parsed");
});

test("normaliza mínimos de créditos por ciclo usados por FCIEN", () => {
  const node = normalizeExpressionNode(rawNode("90 créditos en el Ciclo: 22 - TRAMO COMÚN"));
  assert.deepEqual(node.cycleCreditRequirement, {
    minimum: 90,
    cycleCode: "22",
    cycleName: "TRAMO COMÚN",
  });
  assert.equal(node.parserStatus, "parsed");
});

test("normaliza créditos e inscripción por perfil de FADU", () => {
  const credits = normalizeExpressionNode(rawNode("250 créditos en el Perfil: PERFIL PRODUCTO"));
  const enrollment = normalizeExpressionNode(rawNode("Inscripción a perfil: PERFIL TEXTIL - INDUMENTARIA"));
  assert.deepEqual(credits.profileCreditRequirement, { minimum: 250, profileName: "PERFIL PRODUCTO" });
  assert.deepEqual(enrollment.profileEnrollmentRequirement, { profileName: "PERFIL TEXTIL - INDUMENTARIA" });
  assert.equal(credits.parserStatus, "parsed");
  assert.equal(enrollment.parserStatus, "parsed");
});

test("conserva mínimos de créditos entre alternativas de FADU", () => {
  const node = normalizeExpressionNode(rawNode(
    "24 créditos entre: PUB00 - PROYECTO URBANO BASICO PUB01 - PROYECTO URBANO BASICO TALLER APOLO R0800 - PROYECTO URBANO BASICO 1",
  ));
  assert.equal(node.parserStatus, "parsed");
  assert.equal(node.creditOptionsRequirement.minimum, 24);
  assert.deepEqual(node.creditOptionsRequirement.options.map((option) => option.code), ["PUB00", "PUB01", "R0800"]);
  assert.equal(node.creditOptionsRequirement.options[1].name, "PROYECTO URBANO BASICO TALLER APOLO");
});

test("repara códigos locales cuyo nombre comienza con otro código institucional", () => {
  assert.deepEqual(normalizeCourseRecord({
    serviceCode: "A0190",
    code: "MTR801 TRANSITION NUMÉRIQUE/ BIM",
    name: "",
    credits: 3,
    raw: "A0190 - MTR801 TRANSITION NUMÉRIQUE/ BIM - créditos: 3",
  }), {
    serviceCode: null,
    code: "A0190",
    name: "MTR801 TRANSITION NUMÉRIQUE/ BIM",
    credits: 3,
    raw: "A0190 - MTR801 TRANSITION NUMÉRIQUE/ BIM - créditos: 3",
  });
});

test("repara materias externas cuyo código institucional es numérico", () => {
  assert.deepEqual(
    normalizeCourseRecord({
      serviceCode: null,
      code: "FING",
      name: "1886 - TOPOLOGIA Y ANALISIS REAL",
      credits: 10,
      raw: "FING - 1886 - TOPOLOGIA Y ANALISIS REAL - créditos: 10",
    }),
    {
      serviceCode: "FING",
      code: "1886",
      name: "TOPOLOGIA Y ANALISIS REAL",
      credits: 10,
      raw: "FING - 1886 - TOPOLOGIA Y ANALISIS REAL - créditos: 10",
    },
  );
});
