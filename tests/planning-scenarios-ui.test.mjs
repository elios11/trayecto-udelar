import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("el planificador prioriza semestres sin exponer gestión de escenarios", () => {
  assert.doesNotMatch(source, /className="scenario-selector"/);
  assert.doesNotMatch(source, /Gestión de escenarios de planificación/);
  assert.doesNotMatch(source, /Plan principal/);
  assert.doesNotMatch(source, /scenario-dialog-title|scenario-comparison-title/);
  assert.doesNotMatch(css, /\.scenario-selector|\.scenario-menu|\.scenario-comparison/);
  for (const view of ["Tablero", "Compacta", "Carga"]) assert.match(source, new RegExp(view));
  assert.match(source, /catalog-collapsed/);
});
test("el escenario activo continúa siendo el contenedor compatible del plan importado", () => {
  const persistIndex = source.indexOf("if (!persistPersonalDocument(document, { fingerprint })) return false;");
  const stateIndex = source.indexOf("setProgress(nextProgress);", persistIndex);
  assert.ok(persistIndex > 0);
  assert.ok(stateIndex > persistIndex);
  assert.match(source, /writeWithLocalLease/);
  assert.match(source, /replaceActiveScenarioPlanning\(planning, transfer\.planner/);
});
