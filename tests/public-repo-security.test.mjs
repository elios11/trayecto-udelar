import assert from "node:assert/strict";
import test from "node:test";

import { inspectTrackedFiles } from "../scripts/check-public-repo.mjs";

const inspect = (files, contents) => inspectTrackedFiles(files, (file) => Buffer.from(contents[file] ?? ""));

test("acepta archivos públicos normales", () => {
  assert.deepEqual(inspect(["app/page.tsx", "data/catalog.json"], {
    "app/page.tsx": "export default function Page() {}",
    "data/catalog.json": "{}",
  }), []);
});

test("rechaza nombres de archivos sensibles y artefactos locales", () => {
  const findings = inspect([".env.local", "certs/site.key", "tmp/export.json"], {});
  assert.deepEqual(findings.map(({ file, rule }) => `${file}:${rule}`), [
    ".env.local:archivo de entorno",
    "certs/site.key:clave o certificado privado",
    "tmp/export.json:artefacto local",
  ]);
});

test("detecta credenciales sin imprimir su valor", () => {
  const fakeToken = ["gh", "p_", "abcdefghijklmnopqrstuvwx"].join("");
  const findings = inspect(["config.txt"], { "config.txt": `token=${fakeToken}` });
  assert.deepEqual(findings, [{ file: "config.txt", rule: "token personal de GitHub" }]);
});
