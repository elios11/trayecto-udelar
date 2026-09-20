import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { isAdministrativeCreditEntry } from "../scripts/build-extracted-academic-plans.mjs";

const root = new URL("../", import.meta.url);
const readText = (relativePath) => readFile(new URL(relativePath, root), "utf8");
const readJson = async (relativePath) => JSON.parse(await readText(relativePath));

test("reconoce sólo asientos administrativos genéricos de créditos", () => {
  assert.equal(isAdministrativeCreditEntry("Créditos Reconocidos"), true);
  assert.equal(isAdministrativeCreditEntry("Creditos Reconocidos-tac/cio"), true);
  assert.equal(isAdministrativeCreditEntry("Créditos Reconocidos (adm.)"), true);
  assert.equal(isAdministrativeCreditEntry("Teoría Sociológica (reválida)"), false);
  assert.equal(isAdministrativeCreditEntry("Créditos por reválida Matemática B"), false);
});

test("los planes FCEA no publican los asientos reconocidos como materias", async () => {
  const paths = [
    "app/data/bedelias-generated/bedelias-fcea-licenciatura-en-administracion-2012.json",
    "app/data/bedelias-generated/bedelias-fcea-licenciatura-en-economia-2012.json",
    "app/data/bedelias-generated/bedelias-fcea-tecnico-en-administracion-2014.json",
  ];
  for (const path of paths) {
    const plan = await readJson(path);
    assert.ok(plan.courses.every(({ name }) => !isAdministrativeCreditEntry(name)), path);
    const visibleIds = new Set(Object.values(plan.pathways).flatMap(({ periods, catalogCourseIds = [] }) => [
      ...periods.flatMap(({ courseIds }) => courseIds),
      ...catalogCourseIds,
    ]));
    assert.ok([...visibleIds].every((id) => plan.courses.some((course) => course.id === id)), path);
  }
});

test("los controles compactos conservan ancho legible y los selectores usan la superficie del tema", async () => {
  const css = await readText("app/globals.css");
  assert.match(css, /\.term-target-editor \{[^}]*grid-template-columns: minmax\(0, 1fr\)/s);
  assert.match(css, /\.term-target-editor select, \.term-target-editor input \{[^}]*min-height: 34px[^}]*font: 10px\/1\.25/s);
  assert.match(css, /\.term-target-editor input::placeholder \{[^}]*font-size: 9px/s);
  assert.match(css, /\.selector-row select \{[^}]*min-height: 48px[^}]*border-radius: 14px[^}]*background: var\(--surface\)/s);
  assert.match(css, /\.selector-row select:hover \{[^}]*background-color: var\(--surface-subtle\)/s);
});
