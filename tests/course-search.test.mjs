import assert from "node:assert/strict";
import test from "node:test";
import { matchesCourseSearch, normalizeSearchText } from "../app/course-search.mjs";

const course = (name, id = name) => ({ id, name });

test("normaliza mayúsculas, tildes y puntuación", () => {
  assert.equal(normalizeSearchText("  Geometría y Álgebra—Lineal  "), "geometria y algebra lineal");
});

test("encuentra materias aunque la consulta omita los tildes", () => {
  assert.equal(matchesCourseSearch(course("Geometría y Álgebra Lineal 1"), "Matemática", "geometria algebra"), true);
  assert.equal(matchesCourseSearch(course("Programación 2"), "Computación", "programacion"), true);
  assert.equal(matchesCourseSearch(course("Programación 2"), "Computación", "computacion"), true);
});

test("genera siglas sin conectores y conserva el número", () => {
  assert.equal(matchesCourseSearch(course("Geometría y Álgebra Lineal 1"), "Matemática", "GAL"), true);
  assert.equal(matchesCourseSearch(course("Geometría y Álgebra Lineal 2"), "Matemática", "gal2"), true);
  assert.equal(matchesCourseSearch(course("Geometría y Álgebra Lineal 2"), "Matemática", "gal1"), false);
  assert.equal(matchesCourseSearch(course("Introducción a la Investigación de Operaciones"), "Investigación operativa", "IIO"), true);
});

test("permite abreviaturas genéricas de palabra y número", () => {
  assert.equal(matchesCourseSearch(course("Programación 1"), "Computación", "P1"), true);
  assert.equal(matchesCourseSearch(course("Programación 1"), "Computación", "prog1"), true);
  assert.equal(matchesCourseSearch(course("Programación II"), "Computación", "P2"), true);
  assert.equal(matchesCourseSearch(course("Programación 2"), "Computación", "p1"), false);
});

test("admite prefijos de varias palabras sin crear coincidencias arbitrarias", () => {
  assert.equal(matchesCourseSearch(course("Computación Paralela y Distribuida"), "Computación", "comp par dist"), true);
  assert.equal(matchesCourseSearch(course("Programación 1"), "Computación", "redes"), false);
});
