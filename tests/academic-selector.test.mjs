import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("organizes every incorporated plan by faculty and career", () => {
  assert.match(pageSource, /<span>Facultad<\/span>/);
  assert.match(pageSource, /label: "Facultad de Ingeniería"/);
  assert.match(pageSource, /label: "Ingeniería en Computación"/);
  assert.match(pageSource, /label: "Ingeniería Eléctrica"/);
  assert.match(pageSource, /id: "2025"/);
  assert.match(pageSource, /id: "1997"/);
  assert.match(pageSource, /id: "electrica-2023"/);
  assert.match(pageSource, /label: "Facultad de Química"/);
  assert.match(pageSource, /label: "Química Farmacéutica"/);
  assert.match(pageSource, /id: "qf-2015"/);
});

test("filters careers and plans through the active academic hierarchy", () => {
  assert.match(pageSource, /activeFaculty\.careers\.map/);
  assert.match(pageSource, /activeCareer\.plans\.map/);
  assert.match(pageSource, /selectAcademicPlan/);
  assert.doesNotMatch(pageSource, /planYear === "electrica-2023" \? \(\s*<option value="electrica-2023"/);
});
