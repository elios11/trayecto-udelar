import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { curriculumFingerprint } from "../scripts/bedelias-regional-content-comparison.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const registry = readJson("data/bedelias/audits/official-source-audits.json");
const comparison = readJson("data/bedelias/inventory/regional-content-comparison.json");
const audit = registry.audits.find((entry) => entry.identity === "licenciatura en biotecnologia:2024");
const fcien = readJson("data/bedelias/fcien-licenciatura-en-biotecnologia-2024.json");
const fq = readJson("data/bedelias/fq-licenciatura-en-biotecnologia-2024.json");
const regional = readJson("data/bedelias/cenurln-licenciatura-en-biotecnologia-2024.json");

test("la auditoría oficial conserva los mínimos por área y los 360 créditos", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.title, "Licenciado en Biotecnología");
  assert.equal(audit.officialPlan.durationMonths, 48);
  assert.equal(audit.officialPlan.minimumCredits, 360);
  assert.equal(Object.values(audit.officialPlan.commonSection.areas)
    .reduce((total, credits) => total + credits, 0), 232);
  assert.equal(audit.officialPlan.orientationSection.areas["Profundización en Biotecnología"]
    + audit.officialPlan.orientationSection.areas["Actividades integradoras"], 80);
  assert.equal(audit.officialPlan.orientationSection.areas["Formación social o productiva dentro de actividades integradoras"]
    + audit.officialPlan.orientationSection.areas["Trabajo final de grado dentro de actividades integradoras"], 40);
  assert.equal(audit.officialPlan.commonSection.minimumCredits
    + audit.officialPlan.orientationSection.minimumCredits
    + audit.officialPlan.additionalFlexibleCreditsToDegree, 360);
  assert.equal(audit.officialPlan.suggestedPathways.length, 5);
});

test("el comparador elige la oferta central equivalente antes de declarar una diferencia regional", () => {
  const plan = comparison.plans.find((entry) => entry.identity === audit.identity);
  const result = plan.comparisons.find((entry) => entry.serviceCode === "CENURLN");
  assert.deepEqual(plan.canonicalCandidates.map((entry) => entry.serviceCode), ["FCIEN", "FQ"]);
  assert.equal(result.canonicalServiceCode, "FQ");
  assert.equal(result.status, "curriculum-match-prerequisite-coverage-difference");
  assert.deepEqual(result.difference.onlyCanonical, []);
  assert.deepEqual(result.difference.onlyRegional, []);
  assert.deepEqual(result.difference.changedCredits, []);
  assert.equal(result.difference.prerequisiteCountDelta, -77);
  assert.equal(curriculumFingerprint(fq).curriculumHash, curriculumFingerprint(regional).curriculumHash);
  assert.notEqual(curriculumFingerprint(fcien).curriculumHash, curriculumFingerprint(regional).curriculumHash);
  assert.equal(audit.conclusion.canonicalModel, "one-shared-plan-multiple-offerings");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});
