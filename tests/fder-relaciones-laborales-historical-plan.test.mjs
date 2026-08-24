import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const projection = readJson("app/data/bedelias-generated/bedelias-fder-tecnicatura-en-relaciones-laborales-1995.json");

test("conserva la Tecnicatura Plan 1995 como plan histórico para cohortes existentes", () => {
  const audit = registry.audits.find((entry) => entry.identity === "tecnicatura en relaciones laborales:1995");
  assert.ok(audit);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.officialPlan.current, false);
  assert.equal(audit.officialPlan.durationMonths, 30);
  assert.equal(audit.conclusion.excludeFromCurrentUi, false);
  assert.ok(audit.sources.some((source) => source.url.includes("node/8457")));
  assert.ok(audit.sources.some((source) => source.url.includes("Calendarios%20de%20mayo")));
});

test("proyecta las trece unidades y los mínimos 5+5+3 sin créditos ficticios", () => {
  assert.equal(projection.plan.current, false);
  assert.equal(projection.plan.durationMonths, 30);
  assert.equal(projection.courses.length, 13);
  assert.deepEqual(projection.courses.map((course) => course.bedeliasCode), [
    "910", "911", "912", "913", "914", "920", "921", "922", "923", "924", "930", "931", "932",
  ]);
  assert.ok(projection.courses.every((course) => course.credits === 0));
  assert.deepEqual(projection.pathways.bedelias.periods.map((period) => period.courseIds.length), [5, 5, 3]);
  assert.deepEqual(
    projection.creditStructure.credentials[0].requiredCourseGroups.map((group) => group.minCompleted),
    [5, 5, 3],
  );
  assert.match(projection.plan.notice, /Plan anterior sin nuevos ingresos/i);
});

test("no confunde la Tecnicatura 1995 con el título intermedio del Plan 2012", () => {
  const current = readJson("app/data/bedelias-generated/bedelias-fder-licenciatura-en-relaciones-laborales-2012.json");
  assert.equal(current.plan.current, true);
  assert.equal(current.creditStructure.credentials[0].title, "Técnico Asesor en Relaciones Laborales");
  assert.equal(current.creditStructure.credentials[0].minTotalCredits, 200);
  assert.notEqual(current.creditStructure.credentials[0].title, projection.plan.degreeTitle);
});
