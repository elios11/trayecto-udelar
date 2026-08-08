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
  assert.match(html, /<title>Trayecto — Mallas curriculares Udelar<\/title>/i);
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
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("distingue las tres instancias del progreso", async () => {
  const html = await (await render()).text();
  assert.match(html, /Pendiente/);
  assert.match(html, /Aprobada · sin créditos/);
  assert.match(html, /Exonerada · suma créditos/);
  assert.match(html, /PI 60% o más/);
});
