import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const projection = readJson("app/data/bedelias-generated/bedelias-fder-tecnicatura-en-relaciones-laborales-1995.json");
const evidence = readJson("data/fder/relaciones-laborales-1995-programas.json");
const reviews = readJson("data/official-trajectories/reviews.json");
const inventory = readJson("data/official-trajectories/inventory.json");

test("conserva la Tecnicatura Plan 1995 como plan histórico para cohortes existentes", () => {
  const audit = registry.audits.find((entry) => entry.identity === "tecnicatura en relaciones laborales:1995");
  assert.ok(audit);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.officialPlan.current, false);
  assert.equal(audit.officialPlan.durationMonths, 30);
  assert.equal(audit.conclusion.excludeFromCurrentUi, false);
  assert.ok(audit.sources.some((source) => source.url.includes("node/8457")));
  assert.ok(audit.sources.some((source) => source.url.includes("Calendarios%20de%20mayo")));
  assert.equal(reviews.reviews.find((entry) => entry.planId === evidence.planId).state, "research-pending");
  assert.equal(inventory.plans.find((entry) => entry.planId === evidence.planId).state, "research-pending");
});

test("proyecta las trece unidades y los mínimos 5+5+3 sin créditos ficticios", () => {
  assert.equal(projection.plan.current, false);
  assert.equal(projection.plan.durationMonths, 30);
  assert.equal(projection.courses.length, 13);
  assert.deepEqual(projection.courses.map((course) => course.bedeliasCode), [
    "910", "911", "912", "913", "914", "920", "921", "922", "923", "924", "930", "931", "932",
  ]);
  assert.ok(projection.courses.every((course) => course.credits === 0));
  assert.ok(projection.courses.every((course) => course.authorityStatus === "verified"));
  assert.ok(projection.courses.every((course) => course.fieldProvenance.credits !== "official-curriculum"));
  assert.equal(projection.plan.courseCatalogAuditStatus, "verified");
  assert.deepEqual(projection.pathways.bedelias.periods.map((period) => period.courseIds.length), [5, 5, 3]);
  assert.deepEqual(projection.pathways.bedelias.periods.map((period) => period.label), [
    "Primero (programas)", "Segundo (programas)", "Tercero (programas)",
  ]);
  assert.match(projection.pathways.bedelias.label, /Índice de programas/);
  assert.match(projection.pathways.bedelias.description, /No equivale al Plan aprobado/);
  assert.deepEqual(new Set(evidence.sourceRows.map((row) => row.courseId)), new Set(projection.courses.map((course) => course.id)));
  assert.deepEqual(
    projection.creditStructure.credentials[0].requiredCourseGroups.map((group) => group.minCompleted),
    [5, 5, 3],
  );
  assert.ok(projection.creditStructure.credentials[0].requiredCourseGroups.every((group) => group.sourceUrl.startsWith("https://bedelias.udelar.edu.uy/")));
  assert.match(projection.plan.notice, /Plan anterior sin nuevos ingresos/i);
});

test("no confunde la Tecnicatura 1995 con el título intermedio del Plan 2012", () => {
  const current = readJson("app/data/bedelias-generated/bedelias-fder-licenciatura-en-relaciones-laborales-2012.json");
  assert.equal(current.plan.current, true);
  assert.equal(current.creditStructure.credentials[0].title, "Técnico Asesor en Relaciones Laborales");
  assert.equal(current.creditStructure.credentials[0].minTotalCredits, 200);
  assert.notEqual(current.creditStructure.credentials[0].title, projection.plan.degreeTitle);
  assert.equal(new Set(projection.courses.map((course) => course.id)).intersection(new Set(current.courses.map((course) => course.id))).size, 0);
});
