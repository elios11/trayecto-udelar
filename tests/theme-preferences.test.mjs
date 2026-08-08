import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("theme-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("ofrece todos los temas y el modo daltónico desde el encabezado", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /aria-label="Tema de color"/);
  for (const theme of ["Udelar", "Oscuro", "Violeta", "Solarized", "Bosque", "Terracota"]) {
    assert.match(html, new RegExp(`>${theme}<`));
  }
  assert.match(html, /Modo daltónico/);
  assert.match(html, /Señales más distinguibles/);
  assert.match(html, /Desactivado/);
});

test("define persistencia local y paletas para los tipos de visión de color", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /trayecto-udelar-visual-preferences-v1/);
  assert.match(page, /root\.dataset\.theme = theme/);
  assert.match(page, /root\.dataset\.colorVision/);
  for (const type of ["deuteranopia", "protanopia", "tritanopia"]) {
    assert.match(styles, new RegExp(`data-color-vision="${type}"`));
  }
});
