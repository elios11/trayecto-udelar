import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeLookup } from "../scripts/bedelias-service-batch.mjs";
import { normalizeCourseRecord } from "../scripts/scrape-bedelias.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const audit = registry.audits.find((entry) => entry.identity === "notariado:2016");
const canonical = readJson("data/bedelias/fder-notariado-2016.json");
const regional = readJson("data/bedelias/cenurln-notariado-2016.json");

const courseKey = (course) => normalizeLookup(course.code || course.name);
const normalizedCourses = (snapshot) => snapshot.plan.courses.map(normalizeCourseRecord);
const isFlexible = (course) => course.curriculumPaths.length > 0
  && course.curriculumPaths.every((path) => path.some((label) => /(opc|elect)/.test(normalizeLookup(label))));
const isMandatory = (course) => !course.curriculumPaths.some((path) => path.some((label) => /(opc|elect)/.test(normalizeLookup(label))));

test("la auditoría distingue la grilla vigente de los mínimos originales de Notariado", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.title, "Escribano Público");
  assert.equal(audit.officialPlan.durationMonths, 60);
  assert.equal(audit.officialPlan.minimumCredits, 450);
  assert.equal(Object.values(audit.officialPlan.currentMinimumCreditsByArea)
    .reduce((total, credits) => total + credits, 0), 450);
  assert.equal(Object.values(audit.officialPlan.originalMinimumCreditsByArea)
    .reduce((total, credits) => total + credits, 0), 450);
  assert.equal(audit.officialPlan.currentMinimumCreditsByArea["Optativas o electivas"], 35);
  assert.equal(audit.officialPlan.intermediateTitle.minimumCredits, 160);
});

test("Salto conserva el núcleo notarial y sólo amplía el catálogo flexible", () => {
  const canonicalCourses = normalizedCourses(canonical);
  const regionalCourses = normalizedCourses(regional);
  const canonicalByKey = new Map(canonicalCourses.map((course) => [courseKey(course), course]));
  const regionalByKey = new Map(regionalCourses.map((course) => [courseKey(course), course]));
  const onlyRegional = regionalCourses.filter((course) => !canonicalByKey.has(courseKey(course)));
  const onlyCanonical = canonicalCourses.filter((course) => !regionalByKey.has(courseKey(course)));
  const changedCredits = canonicalCourses.filter((course) => regionalByKey.has(courseKey(course))
    && regionalByKey.get(courseKey(course)).credits !== course.credits);
  const canonicalMandatory = canonicalCourses.filter(isMandatory).map(courseKey).sort();
  const regionalMandatory = regionalCourses.filter(isMandatory).map(courseKey).sort();

  assert.equal(canonicalCourses.length, audit.bedeliasComparison.canonicalCourses);
  assert.equal(regionalCourses.length, audit.bedeliasComparison.regionalCourses);
  assert.equal(onlyCanonical.length, 0);
  assert.equal(onlyRegional.length, audit.bedeliasComparison.onlyRegional);
  assert.ok(onlyRegional.every(isFlexible));
  assert.deepEqual(regionalMandatory, canonicalMandatory);
  assert.equal(canonicalMandatory.length, audit.bedeliasComparison.mandatoryCoreCoursesCanonical);
  assert.equal(changedCredits.length, 0);
  assert.equal(audit.conclusion.canonicalModel, "one-plan-multiple-offerings");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});
