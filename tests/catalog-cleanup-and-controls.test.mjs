import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { consolidateEquivalentCourseVariants, isAdministrativeCreditEntry, normalizeEquivalentCourseName } from "../scripts/build-extracted-academic-plans.mjs";

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

test("consolida variantes equivalentes sólo con respaldo de un grupo oficial", () => {
  assert.equal(normalizeEquivalentCourseName("Informática Aplicada Correc. de Estilo (de León)"), "informatica aplicada correccion estilo");
  const curriculum = {
    courses: [
      { id: "coe5", bedeliasCode: "COE5", name: "Informática Aplicada Correc. de Estilo", credits: 8, creditAllocations: [{ nodeId: "tecnica", credits: 8 }] },
      { id: "coe5a", bedeliasCode: "COE5A", name: "Informática Aplicada Correc. de Estilo (de León)", credits: 8, creditAllocations: [{ nodeId: "tecnica", credits: 8 }] },
      { id: "gramatica-9", bedeliasCode: "LI174", name: "Introducción a la Gramática del Español", credits: 9, creditAllocations: [{ nodeId: "linguistica", credits: 9 }] },
      { id: "gramatica-13", bedeliasCode: "LI179", name: "Introducción a la Gramática del Español", credits: 13, creditAllocations: [{ nodeId: "linguistica", credits: 13 }] },
      { id: "idioma-ingles", name: "Inglés", credits: 4, creditAllocations: [{ nodeId: "idioma", credits: 4 }] },
      { id: "idioma-frances", name: "Francés", credits: 4, creditAllocations: [{ nodeId: "idioma", credits: 4 }] },
    ],
    periods: [{ label: "Catálogo", courseIds: ["coe5", "coe5a", "gramatica-9", "gramatica-13", "idioma-ingles", "idioma-frances"] }],
    requiredCourseGroups: [
      { id: "informatica", label: "Informática Aplicada a la Corrección de Estilo", minCompleted: 1, courseIds: ["coe5", "coe5a"] },
      { id: "gramatica", label: "Introducción a la Gramática del Español", minCompleted: 1, courseIds: ["gramatica-9", "gramatica-13"] },
      { id: "idioma", label: "Comprensión lectora en lengua extranjera", minCompleted: 1, courseIds: ["idioma-ingles", "idioma-frances"] },
    ],
    requirementCourseGroups: {},
    courseIdBySourceId: new Map([["COE5A", "coe5a"]]),
  };
  const aliases = consolidateEquivalentCourseVariants(curriculum);
  assert.equal(aliases.get("coe5a"), "coe5");
  assert.deepEqual(curriculum.courses.map(({ id }) => id), ["coe5", "gramatica-9", "gramatica-13", "idioma-ingles", "idioma-frances"]);
  assert.deepEqual(curriculum.requiredCourseGroups[0].courseIds, ["coe5"]);
  assert.deepEqual(curriculum.requiredCourseGroups[1].courseIds, ["gramatica-9", "gramatica-13"], "no fusiona cargas distintas");
  assert.deepEqual(curriculum.requiredCourseGroups[2].courseIds, ["idioma-ingles", "idioma-frances"], "no fusiona nombres distintos");
  assert.equal(curriculum.courseIdBySourceId.get("COE5A"), "coe5");
  assert.deepEqual(curriculum.courses[0].equivalentCourseIds, ["coe5a"]);
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
