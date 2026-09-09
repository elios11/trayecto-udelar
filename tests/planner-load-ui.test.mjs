import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("permite definir un objetivo accesible por semestre y quitarlo", () => {
  assert.match(page, /Definir objetivo de carga/);
  assert.match(page, /<option value="credits">Créditos<\/option>/);
  assert.match(page, /<option value="hours">Horas<\/option>/);
  assert.match(page, /<option value="courses">Materias<\/option>/);
  assert.match(page, /input type="number" min="1"/);
  assert.match(page, /Quitar objetivo/);
});

test("presenta las advertencias como información y conserva las acciones del planificador", () => {
  assert.match(page, /Podés conservarlas en el plan/);
  assert.match(page, /requieren revisión manual/);
  assert.match(page, /subtotal no es definitivo/);
  assert.match(page, /assignPlannerCourse\(course\.id, event\.target\.value\)/);
  assert.doesNotMatch(page, /disabled=\{[^}]*term-warnings/);
});

test("muestra impacto potencial sin ocultar asignaciones ambiguas", () => {
  assert.match(page, /Impacto potencial/);
  assert.match(page, /pendientes de distribución por área/);
  assert.match(css, /\.term-impact \{/);
  assert.match(css, /\.term-warnings \{/);
});
