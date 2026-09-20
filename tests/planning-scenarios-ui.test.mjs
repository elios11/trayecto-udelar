import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("el planificador expone selector, estados textuales y todas las acciones de escenario", () => {
  for (const text of ["Escenario", "Activo", "Principal", "Archivado", "Nuevo escenario", "Duplicar", "Renombrar", "Hacer principal", "Archivar", "Restaurar", "Comparar"]) {
    assert.match(source, new RegExp(text));
  }
  assert.match(source, /aria-current=\{isActive \? "true"/);
  assert.match(source, /aria-expanded=\{showArchivedScenarios\}/);
  assert.match(source, /disabled=\{isActive \|\| scenario\.isPrimary\}/);
});

test("las confirmaciones son modales propios y la comparación administra foco y Escape", () => {
  assert.match(source, /role="dialog" aria-modal="true" aria-labelledby="scenario-dialog-title"/);
  assert.match(source, /role="dialog" aria-modal="true" aria-labelledby="scenario-comparison-title"/);
  assert.match(source, /event\.key !== "Escape"/);
  assert.match(source, /scenarioDialogInitialRef\.current\?\.focus/);
  assert.match(source, /scenarioTriggerRef\.current\?\.focus/);
  assert.doesNotMatch(source, /window\.(?:alert|confirm)\(/);
});

test("la comparación usa lenguaje prudente y declara posición, carga parcial y anomalías", () => {
  assert.match(source, /no determina cuál escenario es mejor, más rápido o institucionalmente válido/);
  assert.match(source, /no equivale a un período institucional/);
  assert.match(source, /subtotal parcial/);
  assert.match(source, /materias repetidas/);
});

test("los escenarios conservan las tres vistas, catálogo y adaptación responsive", () => {
  for (const view of ["Tablero", "Compacta", "Carga"]) assert.match(source, new RegExp(view));
  assert.match(source, /catalog-collapsed/);
  assert.match(css, /\.scenario-selector/);
  assert.match(css, /\.scenario-comparison-grid/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.scenario-menu/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*?\.scenario-comparison-summary/);
});

test("las operaciones estructurales persisten antes de hidratar la interfaz", () => {
  const persistIndex = source.indexOf("if (!persistPersonalDocument(document, { fingerprint })) return false;");
  const stateIndex = source.indexOf("setProgress(nextProgress);", persistIndex);
  assert.ok(persistIndex > 0);
  assert.ok(stateIndex > persistIndex);
  assert.match(source, /writeWithLocalLease/);
  assert.match(source, /replaceActiveScenarioPlanning\(planning, transfer\.planner/);
});
