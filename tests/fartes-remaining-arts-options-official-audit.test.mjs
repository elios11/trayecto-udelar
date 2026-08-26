import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const options = [
  { identity: "licenciatura en artes diseno grafico:2002", slug: "diseno-grafico", title: /Diseño Gráfico/, area: /Artes Gráficas/, before: 685 },
  { identity: "licenciatura en artes escultura y volumen en el espacio:2002", slug: "escultura-y-volumen-en-el-espacio", title: /Escultura y Volumen en (?:el|El) Espacio/, area: /Volumen en el Espacio/, before: 585 },
  { identity: "licenciatura en artes fotografia:2002", slug: "fotografia", title: /Fotografía/, area: /Foto-Cine-Video/, before: 575 },
];

for (const option of options) {
  test(`normaliza ${option.identity} a seis años y 330 créditos`, async () => {
    const audit = registry.audits.find(({ identity }) => identity === option.identity);
    const plan = await readJson(`app/data/bedelias-generated/bedelias-fartes-licenciatura-en-artes-${option.slug}-2002.json`);
    assert.equal(audit.status, "official-evidence-complete");
    assert.equal(audit.conclusion.canonicalModel, "one-option-degree-six-years-official-credit-blocks");
    assert.equal(audit.bedeliasComparison.projectedCourseCreditsBeforeAudit, option.before);
    assert.deepEqual([plan.plan.year, plan.plan.durationMonths, plan.plan.minCredits], ["2002", 72, 330]);
    assert.match(plan.plan.degreeTitle, option.title);
    assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);
    assert.equal(plan.courses.length, 10);
    assert.equal(plan.courses.reduce((sum, course) => sum + course.credits, 0), 330);
    assert.deepEqual(plan.pathways.bedelias.periods.map((period) => period.courseIds.length), [1, 1, 1, 2, 2, 3]);
    assert.deepEqual(plan.courses.filter((course) => /^Taller/.test(course.name) && option.area.test(course.name)).map((course) => course.credits), [50, 50, 30]);
    assert.equal(plan.courses.find((course) => /Trabajo Final/.test(course.name)).credits, 20);
    assert.equal(plan.rules.length, 0);
    const credential = plan.creditStructure.credentials[0];
    assert.deepEqual(credential.nodeRequirements.map(({ minCredits }) => minCredits), [55, 55, 55, 55, 55, 55]);
    assert.deepEqual([credential.requiredCourseGroups[0].minCompleted, credential.requiredCourseGroups[0].courseIds.length], [10, 10]);
  });
}

test("no transforma secciones o talleres técnicos en trayectorias", async () => {
  for (const option of options) {
    const plan = await readJson(`app/data/bedelias-generated/bedelias-fartes-licenciatura-en-artes-${option.slug}-2002.json`);
    assert.deepEqual(Object.keys(plan.pathways), ["bedelias"]);
    assert.ok(!plan.courses.some((course) => /Taller (?:Alejandro|Alonso|Bruzzone|Delgado|Kühne)/i.test(course.name)));
  }
});
