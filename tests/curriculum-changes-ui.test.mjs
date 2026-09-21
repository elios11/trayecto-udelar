import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("la alerta explica la actualización sin aplicarla automáticamente", () => {
  assert.match(page, /Hay una revisión nueva de este plan/);
  assert.match(page, /No aplicamos nada automáticamente/);
  assert.match(page, /Revisar cambios/);
  assert.match(page, /Exportar mis datos/);
  assert.match(page, /Seguir usando esta revisión/);
});

test("la adopción exige comparación segura e instantánea previa", () => {
  assert.match(page, /curriculumComparison\?\.adoptionAllowed/);
  assert.match(page, /Antes de adoptar la revisión curricular/);
  assert.match(page, /createRecoverySnapshot/);
  assert.match(page, /Adoptar revisión nueva/);
});

test("el aviso usa severidad textual y se adapta a móvil", () => {
  assert.match(page, /afecta tus datos personales/);
  assert.match(page, /Retirado sin equivalencia oficial/);
  assert.match(css, /\.curriculum-change-alert\.is-blocked/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.curriculum-change-alert/);
});
