import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const catalogSource = await readFile(new URL("../app/academic-catalog.ts", import.meta.url), "utf8");

test("organizes every incorporated plan by faculty and career", () => {
  assert.match(pageSource, /<span>Facultad<\/span>/);
  assert.match(catalogSource, /label: "Facultad de Ingeniería"/);
  assert.match(catalogSource, /label: "Ingeniería en Computación"/);
  assert.match(catalogSource, /label: "Ingeniería Eléctrica"/);
  assert.match(catalogSource, /id: "2025"/);
  assert.match(catalogSource, /id: "1997"/);
  assert.match(catalogSource, /id: "electrica-2023"/);
  assert.match(catalogSource, /label: "Facultad de Química"/);
  assert.match(catalogSource, /label: "Química Farmacéutica"/);
  assert.match(catalogSource, /id: "qf-2015"/);
  assert.match(catalogSource, /label: "Facultad de Arquitectura, Diseño y Urbanismo"/);
  assert.match(catalogSource, /label: "Arquitectura"/);
  assert.match(catalogSource, /label: "Licenciatura en Diseño de Comunicación Visual"/);
  assert.match(catalogSource, /label: "Licenciatura en Diseño Industrial"/);
});

test("filters careers and plans through the active academic hierarchy", () => {
  assert.match(pageSource, /activeFaculty\.careers\.map/);
  assert.match(pageSource, /activeCareer\.plans\.map/);
  assert.match(pageSource, /selectAcademicPlan/);
  assert.doesNotMatch(pageSource, /planYear === "electrica-2023" \? \(\s*<option value="electrica-2023"/);
});
