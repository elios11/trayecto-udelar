import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const moduleSource = await readFile(new URL("../app/course-offerings.mjs", import.meta.url), "utf8");

test("integra el resolver sin convertir la posición del semestre en oferta", () => {
  assert.match(page, /resolveCourseOffering\(\{/);
  assert.match(page, /academicPeriodFromDateRange\(term\)/);
  assert.match(page, /Período personal sin definir · no se infiere oferta por la posición del semestre/);
  assert.doesNotMatch(page, /<h3>Se dicta<\/h3>/);
});

test("muestra los cinco estados compactos sólo para un período definido", () => {
  for (const status of ["Confirmada", "No se dicta", "Dictado habitual", "Sin información publicada", "Requiere revisión"]) {
    assert.match(moduleSource, new RegExp(status));
  }
  assert.match(page, /termAcademicPeriod \? termCourses\.map/);
  assert.match(page, /course-offering-badge/);
  assert.match(css, /\.course-offering-badge\.confirmed/);
  assert.match(css, /\.course-offering-badge\.not-offered/);
});

test("el detalle plegable conserva procedencia, vigencia y lenguaje prudente", () => {
  assert.match(page, /<details className="course-offering-panel">/);
  assert.match(page, /Oferta y dictado/);
  assert.match(page, /Esto no significa que la materia no se dicte/);
  assert.match(page, /última verificación/);
  assert.match(page, /Vigencia informativa hasta/);
  assert.match(page, /target="_blank" rel="noreferrer">Ver fuente institucional/);
  assert.match(css, /\.course-offering-panel > summary/);
});

test("los avisos de oferta son explícitamente no bloqueantes", () => {
  assert.match(page, /Es informativo y no cambia tu planificación/);
  assert.match(page, /Podés conservarlas en el plan/);
  assert.match(page, /no se interpreta como disponibilidad ni ausencia/);
  assert.doesNotMatch(page, /disabled=\{[^}]*offeringCounts/);
});
