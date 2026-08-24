import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const queue = readJson("data/bedelias/inventory/audit-queue.json");
const audit = registry.audits.find((entry) => entry.identity === "licenciatura en enfermeria profesionalizacion de auxiliar:1999");
const projection = readJson("app/data/bedelias-generated/bedelias-fenf-licenciatura-en-enfermeria-profesionalizacion-de-auxiliar-1999.json");

test("la convocatoria 2026 mantiene vigente el Plan 1999", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.approvalYear, 1999);
  assert.equal(audit.officialPlan.title, "Licenciado/a en Enfermería");
  assert.equal(audit.officialPlan.durationMonths, 42);
  assert.equal(audit.officialPlan.minimumCredits, null);
  assert.equal(audit.officialPlan.totalHours, 2885);
  assert.equal(audit.conclusion.canonicalModel, "one-program-cohort-specific-offerings");
});

test("Montevideo y Región Suroeste son cohortes del mismo programa", () => {
  const offerings = new Map(audit.offerings.map((offering) => [offering.serviceCode, offering]));
  assert.deepEqual(offerings.get("FENF").locations, ["Montevideo"]);
  assert.deepEqual(offerings.get("CENURSO").locations, ["Mercedes, Soriano", "Colonia del Sacramento"]);
  assert.equal(offerings.get("FENF").curriculumVariant, false);
  assert.equal(offerings.get("CENURSO").curriculumVariant, false);
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(audit.conclusion.timeDependentAdmissionAvailability, true);
  assert.deepEqual(projection.campuses.map((campus) => campus.id), ["montevideo", "mercedes-soriano", "colonia-del-sacramento"]);
});

test("el reglamento vigente normaliza seis módulos, el trabajo final y 2.885 horas", () => {
  const curriculum = audit.officialPlan.curriculum;
  const courses = curriculum.periods.flatMap((period) => period.courses);
  assert.equal(curriculum.periods.length, 7);
  assert.equal(courses.length, 25);
  assert.equal(courses.reduce((sum, course) => sum + (course.hours ?? 0), 0), 2885);
  assert.equal(courses.reduce((sum, course) => sum + course.credits, 0), 0);
  assert.equal(curriculum.requiredCourseGroups[0].minCompleted, 25);
  assert.equal(curriculum.requiredCourseGroups[0].courseIds.length, 25);
  assert.match(curriculum.sourceUrl, /20250806-Reglamento-Programa-Profesionalizacion-1\.pdf$/);
});

test("la UI conserva horas y requisitos sin inventar créditos", () => {
  assert.equal(projection.plan.current, true);
  assert.equal(projection.plan.durationMonths, 42);
  assert.equal(projection.plan.totalHours, 2885);
  assert.equal(projection.plan.minCredits, 0);
  assert.equal(projection.plan.compositionAvailable, true);
  assert.equal(projection.courses.length, 25);
  assert.equal(projection.courses.reduce((sum, course) => sum + (course.hours ?? 0), 0), 2885);
  assert.equal(projection.courses.reduce((sum, course) => sum + course.credits, 0), 0);
  assert.equal(projection.creditStructure.credentials[0].requiredCourseGroups[0].minCompleted, 25);
  assert.equal(projection.rules.length, 7);
  assert.ok(projection.rules.some((rule) => rule.target.name === "Trabajo Final de Investigación" && rule.expression.children.length === 19));
  assert.match(projection.plan.notice, /no las convierte en créditos/i);
  assert.match(projection.source.planDocument, /20250806-Reglamento-Programa-Profesionalizacion-1\.pdf$/);
  assert.ok(queue.completedAudits.some((entry) => entry.identity === audit.identity));
  assert.ok(!queue.queue.some((entry) => entry.identity === audit.identity));
});
