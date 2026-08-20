import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeLookup } from "../scripts/bedelias-service-batch.mjs";
import { curriculumFingerprint } from "../scripts/bedelias-regional-content-comparison.mjs";
import { normalizeCourseRecord } from "../scripts/scrape-bedelias.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const audit = registry.audits.find((entry) => entry.identity === "licenciatura en educacion fisica:2017");
const snapshots = {
  ISEF: readJson("data/bedelias/isef-licenciatura-en-educacion-fisica-2017.json"),
  CURE: readJson("data/bedelias/cure-licenciatura-en-educacion-fisica-2017.json"),
  CENURLN: readJson("data/bedelias/cenurln-licenciatura-en-educacion-fisica-2017.json"),
};

const courseKey = (course) => normalizeLookup(course.code || course.name);
const normalizedCourses = (snapshot) => snapshot.plan.courses.map(normalizeCourseRecord);
const isFlexible = (course) => course.curriculumPaths.length > 0
  && course.curriculumPaths.every((path) => path.some((label) => /(opc|elect)/.test(normalizeLookup(label))));
const isMandatory = (course) => !course.curriculumPaths.some((path) => path.some((label) => /(opc|elect)/.test(normalizeLookup(label))));

function summarizedDifference(left, right) {
  const keyForCourse = (course) => course.code || course.name;
  const leftByKey = new Map(left.courseCatalog.map((course) => [keyForCourse(course), course]));
  const rightByKey = new Map(right.courseCatalog.map((course) => [keyForCourse(course), course]));
  return {
    onlyLeft: [...leftByKey.entries()].filter(([key]) => !rightByKey.has(key)).map(([, course]) => course),
    onlyRight: [...rightByKey.entries()].filter(([key]) => !leftByKey.has(key)).map(([, course]) => course),
    changedCredits: [...leftByKey.entries()]
      .filter(([key, course]) => rightByKey.has(key) && rightByKey.get(key).credits !== course.credits)
      .map(([key, course]) => ({ key, left: course.credits, right: rightByKey.get(key).credits })),
  };
}

test("la auditoría conserva la estructura y los cuatro trayectos del Plan 2017", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.title, "Licenciado en Educación Física");
  assert.equal(audit.officialPlan.durationMonths, 48);
  assert.equal(audit.officialPlan.semesters, 8);
  assert.equal(audit.officialPlan.minimumCredits, 360);
  assert.equal(Object.values(audit.officialPlan.creditDistribution)
    .reduce((total, credits) => total + credits, 0), 360);
  assert.deepEqual(audit.officialPlan.trajectories.map((trajectory) => trajectory.id), [
    "deporte",
    "salud",
    "practicas-corporales",
    "tiempo-libre-y-ocio",
  ]);
  assert.equal(audit.officialPlan.trajectorySelection.startsAtSemester, 5);
});

test("la sede filtra trayectos sin convertir las ofertas regionales en otras currículas", () => {
  const canonicalCourses = normalizedCourses(snapshots.ISEF);
  const canonicalFingerprint = curriculumFingerprint(snapshots.ISEF);
  const canonicalMandatory = canonicalCourses.filter(isMandatory).map(courseKey).sort();
  const canonicalByKey = new Map(canonicalCourses.map((course) => [courseKey(course), course]));

  for (const serviceCode of ["CURE", "CENURLN"]) {
    const regionalCourses = normalizedCourses(snapshots[serviceCode]);
    const regionalFingerprint = curriculumFingerprint(snapshots[serviceCode]);
    const regionalMandatory = regionalCourses.filter(isMandatory).map(courseKey).sort();
    const regionalByKey = new Map(regionalCourses.map((course) => [courseKey(course), course]));
    const difference = summarizedDifference(canonicalFingerprint, regionalFingerprint);

    assert.equal(canonicalFingerprint.counts.courses, audit.bedeliasComparison.canonicalCourses);
    assert.equal(regionalFingerprint.counts.courses, audit.bedeliasComparison.regionalCourses[serviceCode]);
    assert.equal(canonicalFingerprint.counts.prerequisites, audit.bedeliasComparison.prerequisiteEntries.ISEF);
    assert.equal(regionalFingerprint.counts.prerequisites,
      audit.bedeliasComparison.prerequisiteEntries[serviceCode]);
    assert.deepEqual(regionalMandatory, canonicalMandatory);
    assert.equal(canonicalMandatory.length, audit.bedeliasComparison.mandatoryCoreCoursesCanonical);
    assert.equal(difference.onlyLeft.length, audit.bedeliasComparison.onlyCanonical[serviceCode]);
    assert.equal(difference.onlyRight.length, audit.bedeliasComparison.onlyRegional[serviceCode]);
    assert.ok(difference.onlyLeft.every((course) => isFlexible(canonicalByKey.get(courseKey(course)))));
    assert.ok(difference.onlyRight.every((course) => isFlexible(regionalByKey.get(courseKey(course)))));
    assert.deepEqual(difference.changedCredits.map((entry) => entry.key).sort(),
      audit.bedeliasComparison.changedCreditCodeCollisions.map((entry) => normalizeLookup(entry.key)).sort());
    assert.ok(difference.changedCredits.every((entry) => isFlexible(canonicalByKey.get(normalizeLookup(entry.key)))
      && isFlexible(regionalByKey.get(normalizeLookup(entry.key)))));
  }

  const offerings = new Map(audit.offerings.map((offering) => [offering.serviceCode, offering]));
  assert.deepEqual(offerings.get("CENURLN").trajectoryIds, ["deporte", "salud"]);
  assert.equal(offerings.get("ISEF").trajectoryIds.length, 4);
  assert.equal(offerings.get("CURE").trajectoryIds.length, 4);
  assert.equal(audit.conclusion.siteSpecificTrajectoryAvailability, true);
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});
