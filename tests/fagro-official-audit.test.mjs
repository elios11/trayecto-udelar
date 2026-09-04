import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeLookup } from "../scripts/bedelias-service-batch.mjs";
import { normalizeCourseRecord } from "../scripts/scrape-bedelias.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const audit = registry.audits.find((entry) => entry.identity === "ingeniero agronomo:2020");
const canonical = readJson("data/bedelias/fagro-ingeniero-agronomo-2020.json");
const regional = readJson("data/bedelias/cenurln-ingeniero-agronomo-2020.json");

const courseKey = (course) => normalizeLookup(course.code || course.name);
const normalizedCourses = (snapshot) => snapshot.plan.courses.map(normalizeCourseRecord);

test("la auditoría oficial conserva los 450 créditos y los mínimos del Plan 2020", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.title, "Ingeniero Agrónomo");
  assert.equal(audit.officialPlan.durationMonths, 60);
  assert.equal(audit.officialPlan.minimumCredits, 450);
  assert.equal(audit.officialPlan.cycles.reduce((total, cycle) => total + cycle.minimumCredits, 0), 450);

  const [general, agronomic, consolidation] = audit.officialPlan.cycles;
  assert.equal(general.requirements.mandatoryCourses
    + general.requirements.mandatoryTrainingArea
    + general.requirements.optionalOrElective, 90);
  assert.equal(agronomic.requirements.mandatoryCourses
    + agronomic.requirements.mandatoryTrainingArea
    + agronomic.requirements.optionalOrElective, 180);
  assert.equal(consolidation.requirements.mandatoryTrainingAreaMinimum
    + consolidation.requirements.optionalOrElectiveMaximum
    + consolidation.requirements.finalProject, 180);
  assert.equal(consolidation.requirements.mandatoryTrainingAreaMaximum
    + consolidation.requirements.optionalOrElectiveMinimum
    + consolidation.requirements.finalProject, 180);
});

test("la oferta regional amplía sólo ramas flexibles y no crea otra currícula", () => {
  const canonicalCourses = normalizedCourses(canonical);
  const regionalCourses = normalizedCourses(regional);
  const canonicalByKey = new Map(canonicalCourses.map((course) => [courseKey(course), course]));
  const regionalByKey = new Map(regionalCourses.map((course) => [courseKey(course), course]));
  const onlyRegional = regionalCourses.filter((course) => !canonicalByKey.has(courseKey(course)));
  const onlyCanonical = canonicalCourses.filter((course) => !regionalByKey.has(courseKey(course)));
  const changedCredits = canonicalCourses.filter((course) => regionalByKey.has(courseKey(course))
    && regionalByKey.get(courseKey(course)).credits !== course.credits);

  assert.equal(canonicalCourses.length, audit.bedeliasComparison.canonicalCourses);
  assert.equal(regionalCourses.length, audit.bedeliasComparison.regionalCourses);
  assert.equal(onlyRegional.length, 0);
  assert.equal(onlyCanonical.length, 0);
  assert.equal(changedCredits.length, 0);
  assert.deepEqual(canonicalCourses.map(courseKey).sort(), regionalCourses.map(courseKey).sort());
  assert.equal(audit.conclusion.canonicalModel, "one-plan-multiple-offerings");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});
