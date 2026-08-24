import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));

const direction = readJson("app/data/bedelias-generated/bedelias-cenurln-tecnicatura-en-direccion-de-coros-2002.json");
const interpretation = readJson("app/data/bedelias-generated/bedelias-cenurln-tecnicatura-en-interpretacion-perfil-canto-guitarra-piano-2002.json");

test("las dos tecnicaturas vigentes conservan ocho semestres y los totales sin prorratearlos", () => {
  for (const plan of [direction, interpretation]) {
    assert.equal(plan.plan.durationMonths, 48);
    assert.equal(plan.plan.minCredits, 360);
    assert.equal(plan.plan.totalHours, 2368);
    assert.equal(plan.pathways[Object.keys(plan.pathways)[0]].periods.length, 8);
    assert.equal(plan.courses.length, 33);
    assert.equal(plan.courses.reduce((sum, course) => sum + course.credits, 0), 360);
    assert.equal(plan.courses.filter((course) => course.credits === 0).length, 32);
    assert.equal(plan.creditStructure.credentials[0].requiredCourseGroups[0].minCompleted, 33);
    assert.match(plan.plan.notice, /no distribuye esos créditos por unidad/i);
  }
});

test("Interpretación es una sola carrera con Guitarra, Piano y Canto", () => {
  assert.deepEqual(Object.keys(interpretation.pathways), ["guitarra", "piano", "canto"]);
  assert.deepEqual(Object.values(interpretation.pathways).map((pathway) => pathway.label), ["Guitarra", "Piano", "Canto"]);
  assert.ok(Object.values(interpretation.pathways).every((pathway) => pathway.campusIds.includes("salto")));
  assert.equal(interpretation.plan.degreeTitle, "Técnico en Interpretación");
});

test("el segundo ciclo exige las dieciséis unidades del primero", () => {
  const targets = ["cenurln-direccion-coral-5", "cenurln-lectoescritura-5", "cenurln-taller-analisis-1", "cenurln-taller-practica-coral-1"];
  for (const target of targets) {
    const rule = direction.rules.find((entry) => entry.target.code === target);
    assert.equal(rule.expression.children.length, 16);
  }
  const fourth = direction.rules.find((entry) => entry.target.code === "cenurln-direccion-coral-4");
  assert.deepEqual(fourth.expression.children.flatMap((child) => child.options.map((option) => option.code)).sort(), ["cenurln-direccion-coral-2", "cenurln-lectoescritura-2", "cenurln-practica-coral-2"].sort());
});
