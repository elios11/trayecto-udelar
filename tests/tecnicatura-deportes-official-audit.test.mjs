import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { normalizeLookup } from "../scripts/bedelias-service-batch.mjs";
import { curriculumFingerprint } from "../scripts/bedelias-regional-content-comparison.mjs";
import { normalizeCourseRecord } from "../scripts/scrape-bedelias.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const audit = registry.audits.find((entry) => entry.identity === "tecnicatura en deportes:2007");
const snapshots = Object.fromEntries(["ISEF", "CUR", "CURE", "CENURLN"].map((serviceCode) => [
  serviceCode,
  readJson(`data/bedelias/${serviceCode.toLowerCase()}-tecnicatura-en-deportes-2007.json`),
]));

const courseKey = (course) => normalizeLookup(course.code || course.name);
const normalizedCourses = (snapshot) => snapshot.plan.courses.map(normalizeCourseRecord);
const isOptional = (course) => course.curriculumPaths.length > 0
  && course.curriculumPaths.every((path) => path.some((label) => /(opc|elect)/.test(normalizeLookup(label))));
const isBasic = (course) => !course.curriculumPaths.some((path) => path.some((label) => /(opc|elect)/.test(normalizeLookup(label))));

test("la auditoría conserva un solo Plan 2007 con opción deportiva", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.title, "Técnico Deportivo Superior");
  assert.equal(audit.officialPlan.durationMonths, 24);
  assert.equal(audit.officialPlan.minimumCredits, 160);
  assert.equal(Object.values(audit.officialPlan.creditDistribution)
    .reduce((total, credits) => total + credits, 0), 160);
  assert.deepEqual(audit.officialPlan.documentedSportOptions.map((option) => option.id), [
    "futbol",
    "actividades-acuaticas",
    "atletismo",
  ]);
  assert.equal(audit.conclusion.canonicalModel, "one-plan-site-specific-sport-options");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});

test("las opciones por sede conservan su vigencia temporal", () => {
  const offerings = new Map(audit.offerings.map((offering) => [offering.serviceCode, offering]));
  assert.deepEqual(offerings.get("ISEF").sportOptionIds, ["futbol"]);
  assert.equal(offerings.get("ISEF").admissionStatus, "closed-2026");
  assert.deepEqual(offerings.get("CURE").locations, ["Rocha"]);
  assert.deepEqual(offerings.get("CURE").sportOptionIds, ["actividades-acuaticas"]);
  assert.equal(offerings.get("CENURLN").admissionStatus, "not-confirmed-for-2026");
  assert.equal(offerings.get("CUR").admissionStatus, "historical-not-current");
  assert.equal(audit.conclusion.siteSpecificOptionAvailability, true);
  assert.equal(audit.conclusion.timeDependentAdmissionAvailability, true);
});

test("los tres árboles regionales son idénticos y más completos que el central", () => {
  const centralFingerprint = curriculumFingerprint(snapshots.ISEF);
  const centralCourses = normalizedCourses(snapshots.ISEF);
  const centralKeys = new Set(centralCourses.map(courseKey));
  const centralBasic = new Set(centralCourses.filter(isBasic).map(courseKey));

  assert.equal(centralFingerprint.counts.courses, audit.bedeliasComparison.canonicalCourses);
  assert.equal(centralFingerprint.counts.prerequisites, audit.bedeliasComparison.prerequisiteEntries.ISEF);
  assert.equal(centralBasic.size, audit.bedeliasComparison.uniqueBasicCourseKeysCanonical);

  for (const serviceCode of ["CUR", "CURE", "CENURLN"]) {
    const regionalFingerprint = curriculumFingerprint(snapshots[serviceCode]);
    const regionalCourses = normalizedCourses(snapshots[serviceCode]);
    const regionalBasic = new Set(regionalCourses.filter(isBasic).map(courseKey));
    const regionalOnly = regionalCourses.filter((course) => !centralKeys.has(courseKey(course)));
    const catalogHash = `sha256:${createHash("sha256")
      .update(JSON.stringify(regionalFingerprint.courseCatalog)).digest("hex")}`;

    assert.equal(regionalFingerprint.counts.courses, audit.bedeliasComparison.regionalCourses[serviceCode]);
    assert.equal(regionalFingerprint.counts.prerequisites,
      audit.bedeliasComparison.prerequisiteEntries[serviceCode]);
    assert.equal(regionalFingerprint.curriculumHash, audit.bedeliasComparison.regionalCurriculumHash);
    assert.equal(catalogHash, "sha256:7df923a3edd1cfae3ae658fc25eda40451e0b74cd88ff174a5ac3c4897d7710f");
    assert.equal(regionalOnly.length, audit.bedeliasComparison.onlyRegional);
    assert.equal(regionalOnly.filter(isOptional).length, audit.bedeliasComparison.onlyRegionalOptional);
    assert.equal(regionalOnly.filter((course) => !isOptional(course)).length,
      audit.bedeliasComparison.onlyRegionalBasic);
    assert.equal(regionalBasic.size, audit.bedeliasComparison.uniqueBasicCourseKeysRegional);
    assert.ok([...centralBasic].every((key) => regionalBasic.has(key)));
  }
});
