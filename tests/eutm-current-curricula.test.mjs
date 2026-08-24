import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");

const cases = [
  ["licenciatura en fonoaudiologia:2006", "licenciatura-en-fonoaudiologia-2006", 42, [17, 9, 8, 8], 0, 4665, ["montevideo"]],
  ["licenciatura en neumocardiologia:2006", "licenciatura-en-neumocardiologia-2006", 28, [13, 7, 4, 4], 0, 3460, ["montevideo"]],
  ["licenciatura en neurofisiologia clinica:2006", "licenciatura-en-neurofisiologia-clinica-2006", 28, [11, 9, 4, 4], 0, 3734, ["montevideo"]],
  ["licenciatura en oftalmologia:2006", "licenciatura-en-oftalmologia-2006", 22, [11, 5, 2, 4], 0, 3733, ["montevideo"]],
  ["licenciatura en registros medicos:2006", "licenciatura-en-registros-medicos-2006", 28, [13, 5, 5, 5], 0, 4030, ["montevideo", "paysandu"]],
  ["licenciatura en terapia ocupacional:2006", "licenciatura-en-terapia-ocupacional-2006", 38, [16, 10, 7, 5], 290.5, 0, ["montevideo"]],
  ["tecnicatura en radioisotopos:2006", "tecnicatura-en-radioisotopos-2006", 17, [11, 5, 1], 0, 2740, ["montevideo"]],
  ["tecnologo en cosmetologia medica:2006", "tecnologo-en-cosmetologia-medica-2006", 35, [10, 17, 8], 0, 3560, ["montevideo"]],
  ["obstetra partera:1990", "obstetra-partera-1990", 33, [11, 11, 8, 3], 0, 0, ["montevideo", "paysandu"]],
];

for (const [identity, filename, courseCount, periodCounts, creditSum, hourSum, campusIds] of cases) {
  test(`${identity} usa su malla oficial completa sin inferir reglas`, () => {
    const audit = registry.audits.find((entry) => entry.identity === identity);
    const plan = readJson(`app/data/bedelias-generated/bedelias-fmed-${filename}.json`);
    assert.equal(audit?.status, "official-evidence-complete");
    assert.equal(audit?.publicationEligible, false);
    assert.equal(plan.plan.compositionAvailable, true);
    assert.equal(plan.courses.length, courseCount);
    assert.deepEqual(plan.pathways.bedelias.periods.map((period) => period.courseIds.length), periodCounts);
    assert.equal(plan.courses.reduce((sum, course) => sum + course.credits, 0), creditSum);
    assert.equal(plan.courses.reduce((sum, course) => sum + (course.hours ?? 0), 0), hourSum);
    assert.deepEqual(plan.campuses.map((campus) => campus.id), campusIds);
    assert.ok(plan.courses.every((course) => course.dataStatus === "official-curriculum"));
    assert.ok(plan.courses.every((course) => course.ruleCoverage === "not-published"));
    assert.equal(plan.rules.length, 0);
    const degree = plan.creditStructure.credentials.at(-1);
    assert.deepEqual(
      degree.requiredCourseGroups.map((group) => [group.minCompleted, group.courseIds.length]),
      periodCounts.map((count) => [count, count]),
    );
  });
}

test("Registros Médicos habilita el título intermedio sólo después de los tres primeros años", () => {
  const plan = readJson("app/data/bedelias-generated/bedelias-fmed-licenciatura-en-registros-medicos-2006.json");
  assert.deepEqual(plan.creditStructure.credentials.map(({ title }) => title), [
    "Tecnólogo en Registros Médicos",
    "Licenciado en Registros Médicos",
  ]);
  assert.equal(plan.creditStructure.credentials[0].requiredCourseGroups.length, 3);
  assert.equal(plan.creditStructure.credentials[1].requiredCourseGroups.length, 4);
  assert.equal(plan.plan.totalHours, 4030);
});

test("Terapia Ocupacional conserva 290,5 créditos y sus bloques opcionales", () => {
  const plan = readJson("app/data/bedelias-generated/bedelias-fmed-licenciatura-en-terapia-ocupacional-2006.json");
  assert.equal(plan.plan.minCredits, 290.5);
  assert.equal(plan.courses.reduce((sum, course) => sum + course.credits, 0), 290.5);
  assert.deepEqual(
    plan.courses.filter((course) => course.curricularBlock).map(({ name, credits }) => [name, credits]),
    [["Opcionales I", 15], ["Opcionales II", 8]],
  );
});

test("las discrepancias institucionales quedan trazadas sin alterar materias", () => {
  const byIdentity = new Map(registry.audits.map((audit) => [audit.identity, audit]));
  for (const identity of [
    "licenciatura en fonoaudiologia:2006",
    "licenciatura en neumocardiologia:2006",
    "licenciatura en neurofisiologia clinica:2006",
    "tecnologo en cosmetologia medica:2006",
  ]) {
    assert.ok(byIdentity.get(identity).anomalies.some((entry) => entry.field === "publishedHours"));
  }
  assert.match(byIdentity.get("obstetra partera:1990").anomalies.find((entry) => entry.field === "planYear").resolution, /1990.*1996/i);
});
