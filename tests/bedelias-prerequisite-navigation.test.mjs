import test from "node:test";
import assert from "node:assert/strict";

import { samePrerequisiteTarget } from "../scripts/scrape-bedelias.mjs";

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
