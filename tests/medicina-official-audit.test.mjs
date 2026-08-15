import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeLookup } from "../scripts/bedelias-service-batch.mjs";
import { curriculumFingerprint } from "../scripts/bedelias-regional-content-comparison.mjs";
import { normalizeCourseRecord } from "../scripts/scrape-bedelias.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const audit = registry.audits.find((entry) => entry.identity === "doctor en medicina:2008");
const canonical = readJson("data/bedelias/fmed-doctor-en-medicina-2008.json");
const regional = readJson("data/bedelias/cenurln-doctor-en-medicina-2008.json");

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

test("la auditoría conserva créditos, ciclos y títulos de Medicina 2008", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.title, "Doctor en Medicina");
  assert.equal(audit.officialPlan.durationMonths, 84);
  assert.equal(audit.officialPlan.minimumCredits, 741);
  assert.equal(Object.values(audit.officialPlan.creditDistribution)
    .reduce((total, credits) => total + credits, 0), 741);
  assert.equal(audit.officialPlan.cycles.length, 7);
  assert.deepEqual(audit.officialPlan.flexibleRequirements, {
    minimumCredits: 60,
    minimumOptionalCredits: 15,
    minimumElectiveCredits: 10,
    includedInDegreeTotal: true,
  });
  assert.equal(audit.officialPlan.intermediateTitle.minimumCredits, 395);
  assert.deepEqual(audit.anomalies[0].officialValues, [395, 410]);
});

test("Litoral Norte es una oferta intersede del mismo núcleo y no una trayectoria curricular", () => {
  const canonicalCourses = normalizedCourses(canonical);
  const regionalCourses = normalizedCourses(regional);
  const canonicalFingerprint = curriculumFingerprint(canonical);
  const regionalFingerprint = curriculumFingerprint(regional);
  const difference = summarizedDifference(canonicalFingerprint, regionalFingerprint);
  const canonicalMandatory = canonicalCourses.filter(isMandatory).map(courseKey).sort();
  const regionalMandatory = regionalCourses.filter(isMandatory).map(courseKey).sort();
  const canonicalByKey = new Map(canonicalCourses.map((course) => [courseKey(course), course]));
  const regionalByKey = new Map(regionalCourses.map((course) => [courseKey(course), course]));

  assert.equal(canonicalFingerprint.counts.courses, audit.bedeliasComparison.canonicalCourses);
  assert.equal(regionalFingerprint.counts.courses, audit.bedeliasComparison.regionalCourses);
  assert.equal(canonicalFingerprint.counts.prerequisites, audit.bedeliasComparison.canonicalPrerequisiteEntries);
  assert.equal(regionalFingerprint.counts.prerequisites, audit.bedeliasComparison.regionalPrerequisiteEntries);
  assert.deepEqual(regionalMandatory, canonicalMandatory);
  assert.equal(canonicalMandatory.length, audit.bedeliasComparison.mandatoryCoreCoursesCanonical);
  assert.equal(difference.onlyLeft.length, audit.bedeliasComparison.onlyCanonical);
  assert.equal(difference.onlyRight.length, audit.bedeliasComparison.onlyRegional);
  assert.ok(difference.onlyLeft.every((course) => isFlexible(canonicalByKey.get(courseKey(course)))));
  assert.ok(difference.onlyRight.every((course) => isFlexible(regionalByKey.get(courseKey(course)))));
  assert.deepEqual(difference.changedCredits.map((entry) => entry.key).sort(),
    audit.bedeliasComparison.changedCreditCodeCollisions.map((entry) => normalizeLookup(entry.key)).sort());
  assert.ok(difference.changedCredits.every((entry) => isFlexible(canonicalByKey.get(normalizeLookup(entry.key)))
    && isFlexible(regionalByKey.get(normalizeLookup(entry.key)))));
  assert.equal(audit.offerings[1].locations.length, 1);
  assert.match(audit.offerings[1].locations[0], /Paysandú y Salto/);
  assert.equal(audit.conclusion.regionalOfferingTopology, "single-inter-site-offering");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});
