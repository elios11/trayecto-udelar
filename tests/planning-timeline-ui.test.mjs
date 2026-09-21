import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("la línea temporal no interrumpe el flujo principal del planificador", () => {
  assert.doesNotMatch(source, /className="planning-timeline"/);
  assert.doesNotMatch(source, /Línea temporal/);
  assert.doesNotMatch(source, /showTimeline/);
  assert.doesNotMatch(css, /\.planning-timeline|\.timeline-heading|\.timeline-periods/);
});
test("los semestres siguen siendo el destino navegable y editable", () => {
  assert.match(source, /planner-term-\$\{term\.id\}/);
  assert.match(source, /\+ Nuevo semestre/);
  assert.match(source, /Terminar semestre/);
});
