import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeLookup } from "../scripts/bedelias-service-batch.mjs";
import { normalizeCourseRecord } from "../scripts/scrape-bedelias.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const audit = registry.audits.find((entry) => entry.identity === "licenciatura en enfermeria:2016");
const snapshots = {
  FENF: readJson("data/bedelias/fenf-licenciatura-en-enfermeria-2016.json"),
  CUR: readJson("data/bedelias/cur-licenciatura-en-enfermeria-2016.json"),
  CURE: readJson("data/bedelias/cure-licenciatura-en-enfermeria-2016.json"),
  CENURLN: readJson("data/bedelias/cenurln-licenciatura-en-enfermeria-2016.json"),
};

const courseKey = (course) => normalizeLookup(course.code || course.name);
const normalizedCourses = (snapshot) => snapshot.plan.courses.map(normalizeCourseRecord);
const isFlexible = (course) => course.curriculumPaths.length > 0
  && course.curriculumPaths.every((path) => path.some((label) => /(opc|elect)/.test(normalizeLookup(label))));
const isMandatory = (course) => !course.curriculumPaths.some((path) => path.some((label) => /(opc|elect)/.test(normalizeLookup(label))));

test("la auditoría conserva la estructura y los títulos vigentes de Enfermería 2016", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.title, "Licenciado/a en Enfermería");
  assert.equal(audit.officialPlan.durationMonths, 54);
  assert.equal(audit.officialPlan.minimumCredits, 360);
  assert.equal(audit.officialPlan.cycles.reduce((total, cycle) => total + cycle.minimumCredits, 0), 360);
  assert.equal(Object.values(audit.officialPlan.creditDistribution)
    .reduce((total, credits) => total + credits, 0), 360);
  assert.equal(audit.officialPlan.intermediateTitle.title, "Auxiliar de Enfermería");
  assert.equal(audit.officialPlan.intermediateTitle.minimumCredits, 200);
  assert.deepEqual(audit.offerings.map((offering) => offering.serviceCode), ["FENF", "CUR", "CURE", "CENURLN"]);
});

test("las tres sedes regionales conservan el núcleo y sólo difieren en el catálogo flexible", () => {
  const canonicalCourses = normalizedCourses(snapshots.FENF);
  const canonicalByKey = new Map(canonicalCourses.map((course) => [courseKey(course), course]));
  const canonicalMandatory = canonicalCourses.filter(isMandatory).map(courseKey).sort();

  assert.equal(canonicalCourses.length, audit.bedeliasComparison.canonicalCourses);
  assert.equal(canonicalMandatory.length, audit.bedeliasComparison.mandatoryCoreCoursesCanonical);

  for (const serviceCode of ["CUR", "CURE", "CENURLN"]) {
    const regionalCourses = normalizedCourses(snapshots[serviceCode]);
    const regionalByKey = new Map(regionalCourses.map((course) => [courseKey(course), course]));
    const onlyRegional = regionalCourses.filter((course) => !canonicalByKey.has(courseKey(course)));
    const onlyCanonical = canonicalCourses.filter((course) => !regionalByKey.has(courseKey(course)));
    const changedCredits = canonicalCourses.filter((course) => regionalByKey.has(courseKey(course))
      && regionalByKey.get(courseKey(course)).credits !== course.credits);
    const regionalMandatory = regionalCourses.filter(isMandatory).map(courseKey).sort();

    assert.equal(regionalCourses.length, audit.bedeliasComparison.regionalCourses[serviceCode]);
    assert.equal(onlyRegional.length, audit.bedeliasComparison.onlyRegional[serviceCode]);
    assert.equal(onlyCanonical.length, audit.bedeliasComparison.onlyCanonical[serviceCode]);
    assert.ok(onlyRegional.every(isFlexible));
    assert.ok(onlyCanonical.every(isFlexible));
    assert.deepEqual(regionalMandatory, canonicalMandatory);
    assert.equal(changedCredits.length, audit.bedeliasComparison.changedCredits.length);
    assert.ok(changedCredits.every(isFlexible));
    assert.deepEqual(changedCredits.map(courseKey).sort(),
      audit.bedeliasComparison.changedCredits.map((entry) => normalizeLookup(entry.code)).sort());
  }

  assert.equal(audit.conclusion.canonicalModel, "one-plan-multiple-offerings");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});
