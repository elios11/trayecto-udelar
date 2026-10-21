import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildNotariadoEvidenceValidation } from "../scripts/verify-notariado-2016-evidence.mjs";

const readJson = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const evidence = readJson("data/fder/notariado-2016-evidence.json");
const report = readJson("data/fder/notariado-2016-validation.json");
const projection = readJson("app/data/bedelias-generated/bedelias-fder-notariado-2016.json");
const inventory = readJson("data/official-trajectories/inventory.json");
const hash = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

test("la grilla textual normalizada conserva períodos, créditos y cupos sin transformarlos en materias", () => {
  assert.equal(evidence.authority, "Facultad de Derecho, Universidad de la República");
  assert.equal(report.normalizedSourcePortionHash, hash(evidence.sourcePortion));
  assert.equal(report.evidenceHash, hash(evidence));
  assert.deepEqual(evidence.sourcePortion.semesterRows.map(({ semester }) => semester), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(evidence.sourcePortion.semesterCredits, [44, 46, 44, 46, 48, 42, 45, 45, 44, 46]);
  assert.equal(report.checks.textualCredits, 450);
  assert.equal(report.checks.flexibleCredits, 35);
  assert.deepEqual(evidence.sourcePortion.flexibleSlots.map(({ semester }) => semester), [4, 8, 9, 10]);
  assert.ok(evidence.sourcePortion.semesterRows.every(({ unclear }) => unclear.length));
});

test("la discrepancia por áreas y los componentes ambiguos permanecen explícitos", () => {
  assert.deepEqual(evidence.sourcePortion.gridCreditsByArea, [61, 101, 94, 42, 117, 35]);
  assert.deepEqual(evidence.sourcePortion.currentMinimumCreditsByArea, [61, 83, 94, 42, 135, 35]);
  assert.equal(report.checks.gridAndMinimumAreaDifferencePreserved, true);
  assert.match(evidence.sourcePortion.semesterRows[0].unclear[0], /13 créditos más taller de 2/);
  assert.match(evidence.sourcePortion.semesterRows[9].unclear[0], /no se atribuye código/);
  assert.match(evidence.sourcePortion.flexiblePlacementNote, /20\/11\/2019/);
});

test("identidades y progreso quedan conservados sin publicación indebida", () => {
  const entry = inventory.plans.find(({ planId }) => planId === evidence.planId);
  assert.equal(entry.state, "research-pending");
  assert.equal(report.decision, "research-pending");
  assert.equal(evidence.visualReview.status, "unavailable");
  assert.equal(projection.plan.degreeTitle, "Escribano Público");
  assert.deepEqual(projection.campuses.map(({ id }) => id), ["montevideo", "salto"]);
  assert.equal(projection.courses.length, report.checks.technicalIdsPreserved);
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified").length, 0);
  assert.ok(Object.values(projection.publishedPathways).every(({ periods }) => periods.length === 0));
  assert.equal(report.checks.intermediateTitleCredits, 160);
});

test("el verificador es determinista y rechaza cierre o pérdida de un semestre", async () => {
  assert.deepEqual(await buildNotariadoEvidenceValidation({ write: false }), report);
  await assert.rejects(
    buildNotariadoEvidenceValidation({ write: false, evidenceOverride: { ...evidence, decision: "official-trajectory-reproduced" } }),
    /no puede declarar un cierre visual/,
  );
  await assert.rejects(
    buildNotariadoEvidenceValidation({ write: false, evidenceOverride: {
      ...evidence,
      sourcePortion: { ...evidence.sourcePortion, semesterRows: evidence.sourcePortion.semesterRows.slice(0, 9) },
    } }),
    /diez semestres/,
  );
});
