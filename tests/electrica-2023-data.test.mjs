import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const initial = JSON.parse(await readFile(new URL("../app/data/electrica-2023-fing.json", import.meta.url), "utf8"));
const catalog = JSON.parse(await readFile(new URL("../app/data/electrica-2023-electivas.json", import.meta.url), "utf8"));
const source = JSON.parse(await readFile(new URL("../data/fing/electrica-2023-trayectorias.json", import.meta.url), "utf8"));
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const catalogSource = await readFile(new URL("../app/academic-catalog.ts", import.meta.url), "utf8");

test("projects the official Plan 2023 identity without inventing an intermediate title", () => {
  assert.equal(initial.plan.year, "2023");
  assert.equal(initial.plan.approvalYear, 2022);
  assert.equal(initial.plan.careerCode, "22-8");
  assert.equal(initial.plan.minCredits, 450);
  assert.equal(initial.plan.durationMonths, 60);
  assert.equal(initial.creditStructure.credentials.length, 1);
  assert.equal(initial.creditStructure.credentials[0].id, "engineer");
  assert.match(initial.creditStructure.credentials[0].title, /Eléctrico/);
});

test("preserves all official group and area minima", () => {
  const minima = Object.fromEntries(initial.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.deepEqual(minima, {
    "p2023-01": 150, "p2023-011": 75, "p2023-012": 50, "p2023-013": 0,
    "p2023-02": 60, "p2023-021": 20, "p2023-022": 5, "p2023-023": 5,
    "p2023-024": 5, "p2023-025": 5, "p2023-026": 5, "p2023-027": 0,
    "p2023-03": 100, "p2023-031": 5, "p2023-032": 0, "p2023-033": 5,
    "p2023-034": 5, "p2023-035": 0, "p2023-036": 5, "p2023-037": 5,
    "p2023-038": 0, "p2023-039": 0, "p2023-0310": 35, "p2023-0311": 0,
    "p2023-04": 20, "p2023-041": 5, "p2023-042": 5, "p2023-043": 5,
  });
});

test("builds seven ten-semester profiles and derives their common core", () => {
  assert.deepEqual(Object.keys(initial.profiles), [
    "basic", "electronics", "signals-aa", "telecommunications", "biomedical", "power", "control",
  ]);
  for (const profile of Object.values(initial.profiles)) assert.equal(profile.semesters.length, 10);

  const concreteSets = Object.values(initial.profiles).map((profile) => new Set(profile.semesters.flat().filter((id) => !id.startsWith("OPT-"))));
  const intersection = [...concreteSets[0]].filter((id) => concreteSets.every((set) => set.has(id))).sort();
  assert.deepEqual([...initial.commonCourseIds].sort(), intersection);
  assert.equal(initial.commonCourseIds.length, 36);
  assert.ok(initial.courses.filter((course) => course.core).every((course) => initial.commonCourseIds.includes(course.id)));
});

test("keeps the full Bedelias composition and prerequisites behind a deferred catalog", () => {
  const initialCodes = new Set(initial.courses.map((course) => course.bedeliasCode).filter(Boolean));
  const catalogCodes = new Set(catalog.courses.map((course) => course.bedeliasCode));
  assert.equal(initialCodes.size + catalogCodes.size, 221);
  assert.equal(initial.plan.localCourses, 173);
  assert.equal(initial.plan.externalEquivalences, 48);
  assert.equal(initial.rules.length + catalog.rules.length, 233);
  assert.equal(initial.plan.noPublishedRule, 17);
  assert.match(pageSource, /import\("\.\/data\/electrica-2023-electivas\.json"\)/);
  assert.match(pageSource, /import\("\.\/data\/electrica-2023-fing\.json"\)/);
  assert.doesNotMatch(pageSource, /import electric2023DataJson from/);
});

test("models project stages, optional spaces and explicit rule coverage", () => {
  const first = initial.courses.find((course) => course.id === "2013-A");
  const second = initial.courses.find((course) => course.id === "2013-B");
  assert.equal(first.credits, 10);
  assert.equal(second.credits, 25);
  assert.deepEqual(second.prerequisites, ["2013-A"]);
  assert.equal(first.bedeliasCode, "2013");
  assert.equal(second.bedeliasCode, "2013");

  const optionalSpaces = initial.courses.filter((course) => course.placeholder);
  assert.ok(optionalSpaces.length > 0);
  assert.ok(optionalSpaces.every((course) => !course.bedeliasCode && course.dataStatus === "fing-trajectory"));
  assert.match(pageSource, /Elegí una UC del catálogo/);

  const legislation = initial.courses.find((course) => course.bedeliasCode === "2401");
  assert.equal(legislation.ruleCoverage, "not-published");
  assert.match(pageSource, /Bedelías no publica regla/);
});

test("keeps source provenance and every trajectory reference resolvable", () => {
  assert.equal(initial.source.profilesSpreadsheet, source.source.profilesSpreadsheet);
  assert.equal(initial.source.planDocument, source.source.planDocument);
  const ids = new Set(initial.courses.map((course) => course.id));
  for (const profile of Object.values(initial.profiles)) {
    for (const id of profile.semesters.flat()) assert.ok(ids.has(id), id);
  }
  assert.match(catalogSource, /export type PlanId = string/);
  assert.match(pageSource, /course-activity/);
});
