import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const eslintSource = await readFile(new URL("../eslint.config.mjs", import.meta.url), "utf8");

test("excludes nested generated artifacts from lint", () => {
  assert.match(eslintSource, /"\*\*\/dist\/\*\*"/);
  assert.match(eslintSource, /"\.worktrees\/\*\*"/);
  assert.match(eslintSource, /"work\/\*\*"/);
  assert.match(eslintSource, /"tmp\/\*\*"/);
});

test("uses semantic controls for dismissible overlays", () => {
  assert.match(pageSource, /className="backdrop-dismiss"[^>]+onClick=\{\(\) => setImportError\(null\)\}/);
  assert.match(pageSource, /className="backdrop-dismiss"[^>]+onClick=\{\(\) => setSelected\(null\)\}/);
  assert.doesNotMatch(pageSource, /className="(?:modal|drawer)-backdrop" onClick=/);
  assert.doesNotMatch(pageSource, /autoFocus/);
});

test("keeps the horizontal curriculum keyboard reachable", () => {
  assert.match(pageSource, /className="curriculum-scroll"[^>]+role="region"[^>]+tabIndex=\{0\}/);
});
