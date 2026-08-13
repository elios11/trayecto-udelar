import test from "node:test";
import assert from "node:assert/strict";

import { buildPrerequisiteRequests, parseRequirementOptions, samePrerequisiteTarget } from "../scripts/scrape-bedelias.mjs";

test("identifica el mismo destino de previaturas sin depender del texto completo de la fila", () => {
  assert.equal(samePrerequisiteTarget(
    { code: "13000", name: "TESIS", assessment: "course", hasDetails: false },
    { code: "13000", name: "Tesis", assessment: "course" },
  ), true);
});

test("no confunde curso y examen de una misma materia", () => {
  assert.equal(samePrerequisiteTarget(
    { code: "13000", name: "TESIS", assessment: "exam", hasDetails: true },
    { code: "13000", name: "TESIS", assessment: "course" },
  ), false);
});

test("tolera nombres con tildes y espacios distintos", () => {
  assert.equal(samePrerequisiteTarget(
    { code: "ABC01", name: "Producción   Agrícola", assessment: "course" },
    { code: "abc01", name: "Produccion Agricola", assessment: "course" },
  ), true);
});

test("no abre el sistema de previas cuando Bedelías no publica composición", () => {
  assert.deepEqual(buildPrerequisiteRequests({
    requestedCodes: [],
    requestedNames: [],
    planCourses: [],
    serviceCode: "FAGRO",
  }), { courseCodes: [], requests: [] });
});

test("conserva consultas explícitas aunque el plan no tenga composición publicada", () => {
  assert.deepEqual(buildPrerequisiteRequests({
    requestedCodes: ["13000", "13000"],
    requestedNames: ["TESIS"],
    planCourses: [],
    serviceCode: "FAGRO",
  }), {
    courseCodes: ["13000"],
    requests: [
      { kind: "code", value: "13000" },
      { kind: "name", value: "TESIS" },
    ],
  });
});

test("distingue actividad de examen de un examen aprobado", () => {
  assert.deepEqual(parseRequirementOptions(
    "Actividad Examen aprobada/reprobada en la U.C.B: E10 - INTRODUCCIÓN A LA MICROECONOMÍA",
  ), [{
    assessment: "exam-activity",
    serviceCode: null,
    code: "E10",
    name: "INTRODUCCIÓN A LA MICROECONOMÍA",
    raw: "Actividad Examen aprobada/reprobada en la U.C.B: E10 - INTRODUCCIÓN A LA MICROECONOMÍA",
  }]);
});
