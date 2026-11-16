import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildNotariadoEvidenceValidation } from "../scripts/verify-notariado-2016-evidence.mjs";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";

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
  assert.match(evidence.sourcePortion.semesterRows[9].unclear[0], /3 créditos de área.*2 en la columna/);
  assert.match(evidence.sourcePortion.flexiblePlacementNote, /20\/11\/2019/);
});

test("la grilla conserva las identidades técnicas y separa créditos de la validación de egreso", () => {
  const entry = inventory.plans.find(({ planId }) => planId === evidence.planId);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.equal(report.decision, entry.state);
  assert.equal(evidence.visualReview.status, "verified");
  assert.deepEqual(evidence.visualReview.pagesInspected, [1, 2, 3]);
  assert.equal(evidence.sourcePdfSha256, "60a64fa0dc1fa696edc13ad15609d19872d61d288b33cd0cff6ccde908024ee4");
  assert.equal(projection.plan.degreeTitle, "Escribano Público");
  assert.deepEqual(projection.campuses.map(({ id }) => id), ["montevideo", "salto"]);
  assert.equal(projection.courses.filter(c => c.bedeliasCode).length, report.checks.technicalIdsPreserved);
  const periods = projection.publishedPathways["grilla-notariado-2016"].periods;
  const courses = new Map(projection.courses.map(c => [c.id,c]));
  const visible = periods.flatMap(p => p.courseIds.map(id => courses.get(id)));
  assert.equal(new Set(visible.map(c => c.id)).size, 57);
  assert.ok(visible.every(c => c.authorityStatus === "verified"));
  assert.deepEqual(periods.map(p => p.courseIds.reduce((s,id)=>s+courses.get(id).credits,0)), evidence.sourcePortion.semesterCredits);
  assert.equal(visible.filter(c => c.curricularBlock && c.elective).length, 4);
  assert.deepEqual(courses.get("fder-notariado-grilla-s3-r1").creditAllocations.map(a => [a.nodeId,a.credits]), [["plan-total",14]]);
  assert.deepEqual(courses.get("fder-notariado-grilla-s2-r5").creditAllocations.map(a => [a.nodeId,a.credits]), [["socio",4],["practica",2]]);
  assert.ok(projection.creditStructure.credentials.every(c => c.requiredCourseGroups.some(g => g.id === "validacion-final-plan")));
  for (const campus of projection.campuses) {
    const presentation = buildRegisteredPlanPresentation(campus.defaultPathwayId, projection);
    assert.equal(presentation.generated, false);
    assert.deepEqual(presentation.periods, periods);
    assert.deepEqual(new Set(presentation.courses.map(c => c.id)), new Set(visible.map(c => c.id)));
  }
  assert.equal(report.checks.intermediateTitleCredits, 160);
});

test("el verificador es determinista y rechaza cierre o pérdida de un semestre", async () => {
  assert.deepEqual(await buildNotariadoEvidenceValidation({ write: false }), report);
  await assert.rejects(
    buildNotariadoEvidenceValidation({ write: false, evidenceOverride: { ...evidence, decision: "official-trajectory-reproduced" } }),
    /sin declarar cierre académico/,
  );
  await assert.rejects(
    buildNotariadoEvidenceValidation({ write: false, evidenceOverride: {
      ...evidence,
      sourcePortion: { ...evidence.sourcePortion, semesterRows: evidence.sourcePortion.semesterRows.slice(0, 9) },
    } }),
    /diez semestres/,
  );
});
