import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("restaura la selección académica y las preferencias visuales locales", () => {
  assert.match(pageSource, /ACADEMIC_SELECTION_STORAGE_KEY = "trayecto-udelar-academic-selection-v1"/);
  assert.match(pageSource, /localStorage\.getItem\(ACADEMIC_SELECTION_STORAGE_KEY\)/);
  assert.match(pageSource, /localStorage\.setItem\(ACADEMIC_SELECTION_STORAGE_KEY,[\s\S]*?planId: planYear, trajectoryId/);
  for (const preference of ["appMode", "plannerView", "availableOnly", "showElectives", "showRequirements", "showPlannerCatalog"]) {
    assert.match(pageSource, new RegExp(`preferences\\.${preference}`), preference);
  }
});

test("cierra el selector de temas fuera del panel y con Escape", () => {
  assert.match(pageSource, /ref=\{appearanceMenuRef\} className="appearance-menu"/);
  assert.match(pageSource, /document\.addEventListener\("pointerdown", closeAppearanceMenu\)/);
  assert.match(pageSource, /event\.key === "Escape"/);
});

test("el planificador carga y muestra el catálogo diferido completo", () => {
  assert.match(pageSource, /appMode !== "planner" && extendedPlan1997CourseIds\.has/);
  assert.match(pageSource, /appMode !== "planner" && profileCatalogCourseIds\.has/);
  assert.match(pageSource, /appMode !== "planner"\) return;[\s\S]*?loadExtendedElectives\(\)[\s\S]*?loadElectricCatalog\(\)[\s\S]*?loadCivilCatalog\(\)/);
});

test("los paneles plegables conservan contraste y espacio inferior", () => {
  assert.match(pageSource, /useState\(false\);[\s\S]*?showPlannerCatalog/);
  assert.match(pageSource, /Minimizar materias disponibles/);
  assert.match(css, /\.requirement-children \{[^}]*border-top: 0/);
  assert.match(css, /\.required-course-body \{[^}]*border-top: 1px solid var\(--line\)/);
  assert.match(css, /\.electives-section \{ display: flow-root;/);
  assert.match(css, /\.electives-loader \{ margin: 0 30px 38px;/);
});

test("la información del plan y el catálogo minimizado siguen siendo comprensibles", () => {
  assert.match(pageSource, /className="pilot-note-mark"[^>]*>i<\/span><span className="pilot-note-copy">/);
  assert.doesNotMatch(pageSource, /className="pilot-note[^"]*"><span \/>/);
  assert.match(css, /\.planner-layout\.catalog-collapsed \{ display: block; \}/);
  assert.match(css, /\.course-catalog\.collapsed \{[^}]*height: auto;[^}]*position: static;/);
  assert.doesNotMatch(css, /\.course-catalog\.collapsed \.catalog-heading > div[^}]*display: none/);
});