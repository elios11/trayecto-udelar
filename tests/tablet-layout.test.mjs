import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("keeps the header and academic selector fluid at tablet widths", () => {
  const tabletMedia = css.match(/@media \(min-width: 721px\) and \(max-width: 1100px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(tabletMedia, /\.topbar \{ height: 80px; padding: 0 20px; \}/);
  assert.match(tabletMedia, /\.quiet-button \{ display: none; \}/);
  assert.match(tabletMedia, /\.hero-row \{ display: block;/);
  assert.match(tabletMedia, /\.selector-row \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(tabletMedia, /\.selector-row \.career-selector select \{ width: 100%; min-width: 0; \}/);
  assert.match(tabletMedia, /\.selector-row \.campus-selector select \{ width: 100%; min-width: 0; \}/);
  assert.match(tabletMedia, /\.toolbar \{ flex-wrap: wrap; \}/);
  assert.match(tabletMedia, /\.search-box \{ flex: 1 1 270px; min-width: 0; \}/);
  assert.match(tabletMedia, /\.rules-coverage \{ flex: 1 1 auto; white-space: normal; \}/);
  assert.match(tabletMedia, /\.curriculum-navigation \{ margin-left: auto; \}/);
});
