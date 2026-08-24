import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const plan = JSON.parse(await readFile(new URL("../app/data/bedelias-generated/bedelias-fing-lic-en-ingenieria-biologica-2013.json", import.meta.url), "utf8"));

test("Ingeniería Biológica conserva un solo plan y explicita sus tramos territoriales", () => {
  assert.equal(plan.plan.year, "2013");
  assert.equal(plan.plan.degreeTitle, "Licenciado en Ingeniería Biológica");
  assert.equal(plan.plan.durationMonths, 48);
  assert.equal(plan.plan.minCredits, 360);
  assert.deepEqual(plan.campuses.map(({ id, label }) => ({ id, label })), [
    { id: "montevideo-tramo-inicial", label: "Montevideo · Tramo Inicial" },
    { id: "salto-tramo-inicial", label: "Salto · Tramo Inicial" },
    { id: "paysandu-carrera-completa", label: "Paysandú · Carrera Completa" },
  ]);
  assert.deepEqual(Object.keys(plan.pathways), ["bedelias"]);
  assert.equal(plan.pathways.bedelias.label, "Estructura oficial");
  assert.deepEqual(plan.pathways.bedelias.campusIds, plan.campuses.map((campus) => campus.id));
});

test("publica mínimos oficiales como bloques sin inventar materias ni perfiles cerrados", () => {
  assert.equal(plan.plan.compositionAvailable, true);
  assert.equal(plan.courses.length, 23);
  assert.equal(plan.pathways.bedelias.periods.length, 6);
  assert.ok(plan.courses.every((course) => course.curricularBlock));
  assert.equal(plan.courses.reduce((sum, course) => sum + course.credits, 0), 360);
  assert.equal(plan.courses.filter((course) => course.credits === 0).length, 4);
  assert.match(plan.plan.notice, /no fija una grilla única/i);
  assert.match(plan.plan.notice, /implementación inicial tentativa/i);
  const minima = Object.fromEntries(plan.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.equal(minima["plan-total"], 360);
  assert.equal(minima["lib-formacion-basica"], 150);
  assert.equal(minima["lib-matematica"], 60);
  assert.equal(minima["lib-formacion-tecnologica-fundamental"], 70);
  assert.equal(minima["lib-formacion-complementaria"], 10);
  assert.equal(minima["lib-formacion-tecnologica"], 60);
  assert.equal(minima["lib-actividades-integradoras"], 25);
  assert.equal(minima["lib-formacion-especifica"], 160);
  const credential = plan.creditStructure.credentials[0];
  assert.equal(credential.minTotalCredits, 360);
  assert.ok(!credential.nodeRequirements.some((requirement) => requirement.nodeId === "lib-formacion-especifica"));
  assert.equal(credential.requiredCourseGroups[0].minCompleted, 4);
  assert.deepEqual(
    credential.requiredCourseGroups[0].courseIds.map((id) => plan.courses.find((course) => course.id === id)?.credits),
    [0, 0, 0, 0],
  );
  assert.match(plan.creditStructure.nodes[0].sourceUrl, /fing\.edu\.uy/);
});
