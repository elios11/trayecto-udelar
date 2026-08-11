import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("presents the deferred profile-plan electives catalog as an intentional empty state", () => {
  assert.match(pageSource, /isProfilePlan && !fullElectivesCatalogExpanded/);
  assert.match(pageSource, /\? "Catálogo oficial disponible"/);
  assert.match(pageSource, /<span>\{electivesSummary\}<\/span>/);
  assert.match(pageSource, /"Cargar catálogo de Bedelías"/);
  assert.match(css, /\.electives-grid:empty \{ display: none; \}/);
  assert.match(css, /\.electives-loader \.primary-button \{ width: auto; min-width: 250px;/);
});