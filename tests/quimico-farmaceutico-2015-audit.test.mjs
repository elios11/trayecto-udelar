import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const snapshot = JSON.parse(await readFile(new URL("../data/bedelias/fq-quimica-farmaceutica-2015.json", import.meta.url), "utf8"));
const sources = JSON.parse(await readFile(new URL("../data/fq/quimico-farmaceutico-2015-fuentes.json", import.meta.url), "utf8"));

test("separates career, degree, current plan, effective cohort and campuses", () => {
  assert.equal(snapshot.service.code, "FQ");
  assert.equal(snapshot.program.name, "QUÍMICA FARMACÉUTICA");
  assert.equal(snapshot.plan.year, "2015");
  assert.equal(snapshot.plan.current, true);
  assert.equal(snapshot.plan.metadata.minCredits, 450);
  assert.match(snapshot.plan.titleLabels.join(" "), /QU[IÍ]MICA FARMAC[EÉ]UTICA/i);

  assert.equal(sources.identity.bedeliasCareer, "QUÍMICA FARMACÉUTICA");
  assert.equal(sources.identity.degreeTitle, "Químico Farmacéutico");
  assert.equal(sources.identity.effectiveFrom, "2016-01-01");
  assert.equal(sources.identity.intermediateTitle, null);
  assert.deepEqual(sources.identity.campuses, ["Montevideo", "Salto (primer año)"]);
});

test("records a complete structural audit of the public Bedelias snapshot", () => {
  const localCourses = snapshot.plan.courses.filter((course) => !course.serviceCode);
  const externalEquivalences = snapshot.plan.courses.filter((course) => course.serviceCode);
  const published = snapshot.prerequisites.filter((rule) => rule.expression);
  const unpublished = snapshot.prerequisites.filter((rule) => rule.noPublishedRule);

  assert.equal(localCourses.length + externalEquivalences.length, snapshot.plan.courses.length);
  assert.equal(published.length + unpublished.length, snapshot.prerequisites.length);
  assert.ok(snapshot.contentHash);
  assert.ok(snapshot.source.extractedAt);
  assert.ok(Array.isArray(snapshot.validation.issues));
});

test("keeps every non-Bedelias claim attached to a reviewed official source", () => {
  assert.ok(sources.sources.length >= 6);
  assert.ok(sources.sources.every((source) => source.url.startsWith("https://")));
  assert.ok(sources.sources.every((source) => source.status === "verified"));
  assert.equal(sources.requirements.totalCredits.value, 450);
  assert.equal(sources.requirements.mandatoryCredits.value, 324);
  assert.equal(sources.requirements.flexibleCredits.value, 71);
  assert.equal(sources.requirements.minimumOptativeCredits.value, 60);
  assert.equal(sources.requirements.practicumCredits.value, 55);
});
