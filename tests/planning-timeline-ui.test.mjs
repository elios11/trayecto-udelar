import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("la línea temporal es minimizable y deja claro el escenario y los límites de la proyección", () => {
  assert.match(source, /Línea temporal/);
  assert.match(source, /aria-expanded=\{showTimeline\}/);
  assert.match(source, /Los períodos futuros corresponden a/);
  assert.match(source, /no son una escolaridad oficial ni una fecha estimada de egreso/);
  assert.match(source, /showTimeline/);
});

test("la interfaz nombra estados, separa fechas fuera de períodos y ofrece navegación por teclado", () => {
  for (const text of ["Completado", "En curso", "Planificado", "Sin fecha registrada", "Otros hitos fechados", "Fecha no registrada", "Hito curricular", "Alcanzado", "No evaluable"]) assert.match(source, new RegExp(text));
  assert.match(source, /scrollIntoView/);
  assert.match(source, /setSelected\(course\)/);
  assert.match(source, /planner-term-\$\{term\.id\}/);
});

test("la secuencia se adapta a móvil y no exige desplazamiento horizontal", () => {
  assert.match(css, /\.timeline-periods/);
  assert.match(css, /repeat\(auto-fit, minmax\(210px, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.timeline-periods, \.timeline-milestones ul \{ grid-template-columns: 1fr;/);
});
