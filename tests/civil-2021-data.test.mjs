import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const initial = JSON.parse(await readFile(new URL("../app/data/civil-2021-fing.json", import.meta.url), "utf8"));
const catalog = JSON.parse(await readFile(new URL("../app/data/civil-2021-electivas.json", import.meta.url), "utf8"));
const source = JSON.parse(await readFile(new URL("../data/fing/civil-2021-trayectorias.json", import.meta.url), "utf8"));
const snapshot = JSON.parse(await readFile(new URL("../data/bedelias/fing-ingenieria-civil-2021.json", import.meta.url), "utf8"));
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("projects the current Civil Engineering Plan 2021 identity", () => {
  assert.equal(initial.plan.year, "2021");
  assert.equal(initial.plan.approvalYear, 2021);
  assert.equal(initial.plan.careerCode, "22-5");
  assert.equal(initial.plan.current, true);
  assert.equal(initial.plan.minCredits, 450);
  assert.equal(initial.plan.durationMonths, 60);
  assert.equal(initial.creditStructure.credentials.length, 1);
  assert.equal(initial.creditStructure.credentials[0].title, "Ingeniero Civil");
});

test("preserves every official group and area minimum", () => {
  const minima = Object.fromEntries(initial.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.deepEqual(minima, {
    "p2021-61": 139, "p2021-4819": 45, "p2021-4886": 70, "p2021-4985": 16, "p2021-5294": 8,
    "p2021-62": 225, "p2021-4148": 6, "p2021-4316": 0, "p2021-4385": 25, "p2021-4397": 15,
    "p2021-4453": 6, "p2021-4693": 20, "p2021-4818": 8, "p2021-4871": 30, "p2021-4922": 7,
    "p2021-4999": 20, "p2021-5168": 10, "p2021-5230": 12,
    "p2021-63": 15, "p2021-5239": 15,
    "p2021-64": 24, "p2021-3973": 18, "p2021-5291": 6,
  });
});

test("builds the four official ten-semester profiles", () => {
  assert.deepEqual(Object.keys(initial.profiles), ["construction", "structures", "hydraulic-environmental", "transportation"]);
  const courses = new Map(initial.courses.map((course) => [course.id, course]));
  const credits = {};
  for (const [id, profile] of Object.entries(initial.profiles)) {
    assert.equal(profile.semesters.length, 10);
    assert.ok(profile.semesters.flat().every((courseId) => courses.has(courseId)), id);
    credits[id] = profile.semesters.flat().reduce((sum, courseId) => sum + courses.get(courseId).credits, 0);
  }
  assert.deepEqual(credits, { construction: 454, structures: 451, "hydraulic-environmental": 452, transportation: 450 });
  assert.equal(initial.commonCourseIds.length, 35);
});

test("keeps the full academic composition and rules behind a deferred catalog", () => {
  const allCodes = new Set([
    ...initial.courses.map((course) => course.bedeliasCode),
    ...catalog.courses.map((course) => course.bedeliasCode),
  ].filter(Boolean));
  assert.equal(allCodes.size, 430);
  assert.equal(initial.plan.bedeliasCompositionCourses, 512);
  assert.equal(initial.plan.modeledCompositionCourses, 430);
  assert.equal(initial.plan.localCourses, 398);
  assert.equal(initial.plan.externalEquivalences, 32);
  assert.equal(initial.rules.length + catalog.rules.length, 232);
  assert.match(pageSource, /import\("\.\/data\/civil-2021-fing\.json"\)/);
  assert.match(pageSource, /import\("\.\/data\/civil-2021-electivas\.json"\)/);
  assert.doesNotMatch(pageSource, /import civil2021DataJson from/);
});

test("excludes administrative revalidation entries without hiding the audit", () => {
  assert.equal(initial.plan.administrativeEntriesExcluded, 82);
  assert.equal(catalog.excludedAdministrativeEntries.length, 82);
  assert.ok(catalog.excludedAdministrativeEntries.every((entry) => /CREDITOS.*REVALIDA/.test(entry.name)));
  assert.ok(catalog.courses.every((course) => !/CREDITOS.*REVALIDA/.test(course.name.toUpperCase())));
});

test("models workbook credit splits and multi-semester projects", () => {
  const courses = new Map(initial.courses.map((course) => [course.id, course]));
  assert.deepEqual(courses.get("1274").creditAllocations.map(({ nodeId, credits }) => ({ nodeId, credits })), [
    { nodeId: "p2021-3973", credits: 4 }, { nodeId: "p2021-5291", credits: 1 },
  ]);
  assert.deepEqual(courses.get("2389").creditAllocations.map(({ nodeId, credits }) => ({ nodeId, credits })), [
    { nodeId: "p2021-4397", credits: 2 }, { nodeId: "p2021-4818", credits: 4 },
  ]);
  assert.equal(courses.get("2411-A").credits, 15);
  assert.equal(courses.get("2411-B").credits, 18);
  assert.deepEqual(courses.get("2411-B").prerequisites, ["2411-A"]);
  assert.deepEqual(courses.get("2400-B").prerequisites, ["2400-A"]);
  assert.deepEqual(courses.get("2403-B").prerequisites, ["2403-A"]);
  assert.match(pageSource, /modeledPrerequisitesMet && expressionSatisfied/);
});

test("keeps source provenance, clean validation and storage migration", () => {
  assert.equal(snapshot.contentHash, "3f88398a8ded805466ca92d64f8cf84eea793d0c14a16437eef54351fcb1fcf0");
  assert.deepEqual(snapshot.validation.issues, []);
  assert.equal(initial.source.profilesSpreadsheet, source.source.profilesSpreadsheet);
  assert.equal(initial.source.planDocument, source.source.planDocument);
  assert.match(pageSource, /type PlanId = "1997" \| "2025" \| "electrica-2023" \| "civil-2021"/);
  assert.match(pageSource, /label: "Ingeniería Civil"/);
  assert.match(pageSource, /id: "civil-2021"/);
  assert.match(pageSource, /"civil-2021": \{\}/);
  assert.match(pageSource, /"civil-2021": createDefaultTerms\(\)/);
  assert.match(pageSource, /"civil-2021": typeof parsed\["civil-2021"\]/);
});
