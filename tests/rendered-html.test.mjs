import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renderiza la malla y su procedencia institucional", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Trayecto Udelar \u2014 Curr\u00edcula y planificador<\/title>/i);
  assert.match(html, /property="og:image" content="https:\/\/trayecto-udelar-piloto\.tokyo121\.chatgpt\.site\/og-trayecto-udelar\.png"/i);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  assert.match(html, /Ingeniería en Computación/);
  assert.match(html, /Plan 2025 · vigente, en transición/);
  assert.match(html, /Plan 1997/);
  assert.match(html, /Trayectoria sugerida por FING/);
  assert.match(html, /Pre-semestre/);
  assert.match(html, /Acreditada por trayectoria · 4 cr\./);
  assert.match(html, /Bedelías confirma el plan vigente/);
  assert.match(html, /Arquitectura de Computadoras/);
  assert.match(html, /official-tag/);
  assert.match(html, /Lo que todavía no tiene semestre publicado/);
  assert.match(html, /Metas de créditos/);
  assert.match(html, /Analista/);
  assert.match(html, /Ingeniería/);
  assert.match(html, /60 cr\. flexibles dentro del grupo/);
  assert.match(html, /Sin mínimo propio/);
  assert.match(html, /áreas sugeridas en esta trayectoria/);
  assert.doesNotMatch(html, /An\u00e1lisis y Dise\u00f1o de Algoritmos Distribuidos en Redes/, "el catalogo ampliado no forma parte del HTML inicial");
  assert.match(html, /usá las flechas o la barra inferior para desplazarte horizontalmente/);
  assert.match(html, /Ir al semestre anterior/);
  assert.match(html, /Ir al semestre siguiente/);
  assert.match(html, /Modo de trabajo/);
  assert.match(html, /Planificador/);
  assert.match(html, /Tema Udelar, modo claro\. Abrir apariencia/);
  assert.match(html, /Usar modo oscuro/);
  assert.match(html, /Modo dalt\u00f3nico/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("distingue las tres instancias del progreso", async () => {
  const html = await (await render()).text();
  assert.match(html, /Pendiente/);
  assert.match(html, /Aprobada · sin créditos/);
  assert.match(html, /Exonerada · suma créditos/);
  assert.match(html, /PI 60% o más/);
});
