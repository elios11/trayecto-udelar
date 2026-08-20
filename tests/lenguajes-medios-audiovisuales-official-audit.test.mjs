import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cure-licenciatura-en-lenguajes-y-medios-audiovisuales-2011.json");
const audit = audits.audits.find((entry) => entry.identity === "licenciatura en lenguajes y medios audiovisuales:2011");

test("publica una sola carrera audiovisual bajo Facultad de Artes", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Lenguajes y Medios Audiovisuales")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fartes");
  assert.equal(matches[0].career.plans.length, 1);
  assert.equal(matches[0].career.plans[0].label, "Plan 2011 · vigente");
  assert.equal(projection.plan.degreeTitle, "Licenciado en Lenguajes y Medios Audiovisuales");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.campuses.map((campus) => campus.label), ["Maldonado"]);
});

test("separa las dos trayectorias después del primer año común", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["creacion-audiovisual", "creacion-audiovisual-interactiva"]);
  const idsFor = (pathwayId) => new Set(projection.pathways[pathwayId].periods.flatMap((period) => period.courseIds));
  const audiovisual = idsFor("creacion-audiovisual");
  const interactive = idsFor("creacion-audiovisual-interactiva");
  for (const id of ["cure-percepcion-lenguajes", "cure-legados-historico-culturales", "cure-esteticas-1", "cure-trabajo-final"]) {
    assert.ok(audiovisual.has(id));
    assert.ok(interactive.has(id));
  }
  assert.ok(audiovisual.has("cure-creacion-audiovisual-1"));
  assert.ok(!audiovisual.has("cure-creacion-interactiva-1"));
  assert.ok(interactive.has("cure-creacion-interactiva-1"));
  assert.ok(!interactive.has("cure-creacion-audiovisual-1"));
  assert.deepEqual(Object.values(projection.pathways).map((pathway) => pathway.campusIds), [["maldonado"], ["maldonado"]]);
});

test("cada trayectoria suma 360 créditos y conserva cuatro mínimos anuales", () => {
  const courses = new Map(projection.courses.map((course) => [course.id, course]));
  for (const pathway of Object.values(projection.pathways)) {
    const credits = pathway.periods.flatMap((period) => period.courseIds)
      .reduce((sum, id) => sum + courses.get(id).credits, 0);
    assert.equal(credits, 360);
    assert.deepEqual(pathway.periods.map((period) => period.courseIds
      .reduce((sum, id) => sum + courses.get(id).credits, 0)), [90, 90, 90, 90]);
  }
  assert.deepEqual(projection.creditStructure.nodes.filter((node) => node.id !== "plan-total").map((node) => node.minCredits), [90, 90, 90, 90]);
  assert.equal(projection.courses.filter((course) => course.curricularBlock).reduce((sum, course) => sum + course.credits, 0), 20);
});

test("modela sólo la condición publicada para elegir trayectoria", () => {
  assert.equal(projection.rules.length, 2);
  for (const rule of projection.rules) {
    assert.deepEqual(rule.expression.children.flatMap((child) => child.options.map((option) => option.code)), [
      "cure-percepcion-lenguajes",
      "cure-legados-historico-culturales",
    ]);
  }
  assert.match(audit.anomalies.find((entry) => entry.field === "prerequisites").resolution, /No se agregan otras previaturas/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "interactiveFocus").resolution, /no como trayectorias certificadas/i);
});
