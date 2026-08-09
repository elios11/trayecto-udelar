import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const snapshot = JSON.parse(await readFile(new URL("../data/bedelias/fing-ingenieria-electrica-2023.json", import.meta.url), "utf8"));
const sources = JSON.parse(await readFile(new URL("../data/fing/electrica-2023-fuentes.json", import.meta.url), "utf8"));

function collectRawNodes(expression, output = []) {
  if (!expression) return output;
  if (expression.kind === "requirement" && expression.parserStatus === "raw") output.push(expression.label);
  for (const child of expression.children ?? []) collectRawNodes(child, output);
  return output;
}

test("identifies the approved-in-2022 curriculum as the effective Bedelias Plan 2023", () => {
  assert.equal(snapshot.service.code, "FING");
  assert.equal(snapshot.program.name, "INGENIERÍA ELÉCTRICA");
  assert.equal(snapshot.plan.year, "2023");
  assert.equal(snapshot.plan.current, true);
  assert.equal(snapshot.plan.metadata.duration, "60 meses");
  assert.equal(snapshot.plan.metadata.minCredits, 450);
  assert.equal(snapshot.plan.metadata.colibriUrl, "https://hdl.handle.net/20.500.12008/44580");
  assert.match(snapshot.plan.titleLabels.join(" "), /INGENIERO ELECTRICO/i);

  assert.equal(sources.identity.academicPlanYear, "2023");
  assert.equal(sources.identity.approvalYear, "2022");
  assert.equal(sources.identity.effectiveFrom, "2023-01-01");
  assert.equal(sources.identity.intermediateTitle, null);
});

test("records complete composition and prerequisite audit coverage", () => {
  const localCourses = snapshot.plan.courses.filter((course) => !course.serviceCode);
  const externalEquivalences = snapshot.plan.courses.filter((course) => course.serviceCode);
  const published = snapshot.prerequisites.filter((rule) => rule.expression);
  const unpublished = snapshot.prerequisites.filter((rule) => rule.noPublishedRule);

  assert.equal(snapshot.plan.courses.length, 221);
  assert.equal(localCourses.length, 173);
  assert.equal(externalEquivalences.length, 48);
  assert.equal(snapshot.prerequisites.length, 250);
  assert.equal(published.length, 233);
  assert.equal(unpublished.length, 17);
  assert.equal(published.filter((rule) => rule.target.assessment === "course").length, 155);
  assert.equal(published.filter((rule) => rule.target.assessment === "exam").length, 78);
  assert.deepEqual(snapshot.validation.issues, []);
  assert.deepEqual(published.flatMap((rule) => collectRawNodes(rule.expression)), []);
});

test("normalizes the old Design Logic course-activity exclusion without losing its meaning", () => {
  const rule = snapshot.prerequisites.find((item) => item.target.code === "1512" && item.target.assessment === "exam");
  assert.ok(rule?.expression);
  const excluded = rule.expression.children
    .filter((child) => child.kind === "none")
    .flatMap((child) => child.children)
    .flatMap((child) => child.options);
  assert.ok(excluded.some((option) => option.code === "2512" && option.assessment === "course-activity"));
});
