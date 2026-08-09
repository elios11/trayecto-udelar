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

  assert.match(html, /aria-label="Familia de color"/);
  for (const theme of ["Udelar", "Violeta", "Solarized", "Bosque", "Terracota"]) {
    assert.match(html, new RegExp(`>${theme}<`));
  }
  assert.match(html, /Tema y contraste/);
  assert.match(html, /Usar modo oscuro/);
  assert.match(html, />Claro</);
  assert.match(html, />Oscuro</);
  assert.match(html, /Modo daltónico/);
  assert.match(html, /Señales más distinguibles/);
  assert.match(html, /Desactivado/);
});

test("define persistencia local y paletas para los tipos de visión de color", async () => {
  const [page, styles, logo] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/udelar.svg", import.meta.url), "utf8"),
  ]);

  assert.match(page, /trayecto-udelar-visual-preferences-v1/);
  assert.match(page, /root\.dataset\.theme = theme/);
  assert.match(page, /root\.dataset\.scheme = themeScheme/);
  assert.match(page, /root\.dataset\.colorVision/);
  assert.match(page, /preferences\.theme === "oscuro"/);
  for (const theme of ["udelar", "violeta", "solarized", "bosque", "terracota"]) {
    assert.match(styles, new RegExp(`data-theme="${theme}"\\]\\[data-scheme="dark"`));
  }
  for (const type of ["deuteranopia", "protanopia", "tritanopia"]) {
    assert.match(styles, new RegExp(`data-color-vision="${type}"`));
  }
  assert.match(logo, /id="udelar-mark"/);
  assert.match(logo, /fill="currentColor"/);
});

test("la currícula móvil hereda las superficies del tema activo", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(styles, /\.curriculum-scroll \{ overflow: visible; background: linear-gradient\(180deg, var\(--surface-subtle\) 0, var\(--paper\) 100%\); \}/);
  assert.match(styles, /\.semester-column::before \{[^}]*background: var\(--line\); \}/);
  assert.match(styles, /\.semester-column > header > span \{[^}]*border: 4px solid var\(--surface-subtle\);/);
  assert.doesNotMatch(styles, /\.curriculum-scroll \{[^}]*#f6f8f8/);
});

test("la acción para agregar semestres conserva el contraste del tema", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(styles, /\.add-term-card \{[^}]*background: var\(--surface-subtle\);[^}]*color: var\(--accent-ink\);/);
  assert.match(styles, /\.add-term-card:hover \{[^}]*background: var\(--accent-soft\);/);
  assert.match(styles, /\.add-term-card strong \{ color: var\(--ink\);/);
  assert.match(styles, /\.add-term-card small \{[^}]*color: var\(--muted\);/);
  assert.doesNotMatch(styles, /\.add-term-card \{[^}]*rgba\(255,255,255/);
});
