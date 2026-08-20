import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { curriculumFingerprint } from "../scripts/bedelias-regional-content-comparison.mjs";
import { normalizeLookup } from "../scripts/bedelias-service-batch.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const audit = registry.audits.find((entry) => entry.identity === "licenciatura en psicologia:2013");
const canonical = readJson("data/bedelias/psico-licenciatura-en-psicologia-2013.json");
const regional = readJson("data/bedelias/cenurln-licenciatura-en-psicologia-2013.json");

const keyForCourse = (course) => course.code || course.name;

test("la auditoría conserva los ciclos y módulos del Plan 2013", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.title, "Licenciado en Psicología");
  assert.equal(audit.officialPlan.durationMonths, 48);
  assert.equal(audit.officialPlan.semesters, 8);
  assert.equal(audit.officialPlan.minimumCredits, 320);
  assert.equal(Object.values(audit.officialPlan.cycles)
    .reduce((total, credits) => total + credits, 0), 320);
  assert.equal(Object.values(audit.officialPlan.modules)
    .reduce((total, credits) => total + credits, 0)
    + audit.officialPlan.institutionalCooperationMaximumCredits, 320);
  assert.equal(audit.officialPlan.finalDegreeProjectCredits, 40);
});

test("las sedes completas comparten plan y el CIO es sólo una vía de ingreso", () => {
  const offerings = new Map(audit.offerings.map((offering) => [offering.serviceCode, offering]));
  assert.deepEqual(offerings.get("CENURLN").locations, ["Salto", "Paysandú"]);
  assert.equal(offerings.get("CENURLN").curriculumVariant, false);
  assert.match(offerings.get("CURE").entryRoute, /primer año/);
  assert.equal(audit.conclusion.canonicalModel, "one-plan-multiple-offerings");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(audit.conclusion.regionalEntryRouteIsTrajectory, false);
});

test("las diferencias regionales no cambian créditos compartidos", () => {
  const canonicalFingerprint = curriculumFingerprint(canonical);
  const regionalFingerprint = curriculumFingerprint(regional);
  const canonicalByKey = new Map(canonicalFingerprint.courseCatalog.map((course) => [keyForCourse(course), course]));
  const regionalByKey = new Map(regionalFingerprint.courseCatalog.map((course) => [keyForCourse(course), course]));
  const onlyCanonical = [...canonicalByKey].filter(([key]) => !regionalByKey.has(key));
  const onlyRegional = [...regionalByKey].filter(([key]) => !canonicalByKey.has(key));
  const changedCredits = [...canonicalByKey].filter(([key, course]) => regionalByKey.has(key)
    && regionalByKey.get(key).credits !== course.credits);

  assert.equal(canonicalFingerprint.counts.courses, audit.bedeliasComparison.canonicalCourses);
  assert.equal(regionalFingerprint.counts.courses, audit.bedeliasComparison.regionalCourses);
  assert.equal(canonicalFingerprint.counts.prerequisites, audit.bedeliasComparison.canonicalPrerequisiteEntries);
  assert.equal(regionalFingerprint.counts.prerequisites, audit.bedeliasComparison.regionalPrerequisiteEntries);
  assert.equal([...canonicalByKey.keys()].filter((key) => regionalByKey.has(key)).length,
    audit.bedeliasComparison.sharedUniqueCourseKeys);
  assert.equal(onlyCanonical.length, audit.bedeliasComparison.onlyCanonical);
  assert.equal(onlyRegional.length, audit.bedeliasComparison.onlyRegional);
  assert.equal(changedCredits.length, audit.bedeliasComparison.changedCredits);
  assert.deepEqual(onlyCanonical.map(([, course]) => course.code).sort(),
    audit.bedeliasComparison.canonicalOnlyCodes.map(normalizeLookup).sort());
  assert.ok(onlyRegional.some(([, course]) => course.code === "519" && /transitoria/.test(course.name)));
});
