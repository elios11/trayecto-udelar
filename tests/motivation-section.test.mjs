import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("explica la motivación estudiantil sin desplazar la herramienta principal", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const curriculum = page.indexOf('<section className="curriculum-panel">');
  const motivation = page.indexOf('<section className="motivation-section"');
  const footer = page.indexOf("<footer>");

  assert.ok(curriculum >= 0 && motivation > curriculum && footer > motivation);
  assert.match(page, /¿Por qué existe Trayecto\?/);
  assert.match(page, /toda la Udelar/);
  assert.match(page, /proyecto estudiantil, abierto y no oficial/);
  assert.match(page, /href="#motivacion"/);
  assert.match(page, /aria-labelledby="motivation-title"/);
});

test("adapta la sección de motivación y sus enlaces al ancho móvil", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /\.motivation-section \{[^\n]*grid-template-columns: minmax\(220px, \.72fr\) minmax\(0, 1\.28fr\)/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.motivation-section \{ grid-template-columns: 1fr;/);
  assert.match(css, /footer nav \{ display: flex;/);
});
