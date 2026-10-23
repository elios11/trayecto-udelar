#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const evidencePath = new URL("data/fder/notariado-2016-evidence.json", root);
const projectionPath = new URL("app/data/bedelias-generated/bedelias-fder-notariado-2016.json", root);
const auditsPath = new URL("data/bedelias/audits/official-source-audits.json", root);
const inventoryPath = new URL("data/official-trajectories/inventory.json", root);
const reportPath = new URL("data/fder/notariado-2016-validation.json", root);
const readJson = async (url) => JSON.parse(await readFile(url, "utf8"));
const hash = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export async function buildNotariadoEvidenceValidation({ write = true, evidenceOverride } = {}) {
  const [savedEvidence, projection, audits, inventory] = await Promise.all([
    readJson(evidencePath), readJson(projectionPath), readJson(auditsPath), readJson(inventoryPath),
  ]);
  const evidence = evidenceOverride ?? savedEvidence;
  const audit = audits.audits.find(({ identity }) => identity === "notariado:2016");
  const inventoryEntry = inventory.plans.find(({ planId }) => planId === evidence.planId);
  const source = evidence.sourcePortion;
  if (evidence.planId !== "bedelias-fder-notariado-2016" || evidence.decision !== "research-pending"
    || evidence.visualReview.status !== "verified"
    || !equal(evidence.visualReview.pagesInspected, [1, 2, 3])
    || evidence.sourcePdfSha256 !== "60a64fa0dc1fa696edc13ad15609d19872d61d288b33cd0cff6ccde908024ee4") {
    throw new Error("La evidencia de Notariado debe conservar el cotejo visual y la identidad de la fuente sin declarar cierre académico.");
  }
  if (source.semesterRows.length !== 10 || !equal(source.semesterRows.map(({ semester }) => semester), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    || source.semesterRows.some(({ labels, unclear }) => !labels.length || !unclear.length)) {
    throw new Error("La transcripción textual debe conservar diez semestres y sus brechas.");
  }
  if (!equal(source.annualCredits, [90, 90, 90, 90, 90])
    || !equal(source.semesterCredits, [44, 46, 44, 46, 48, 42, 45, 45, 44, 46])
    || source.semesterCredits.reduce((sum, value) => sum + value, 0) !== 450
    || !equal(source.currentMinimumCreditsByArea, [61, 83, 94, 42, 135, 35])
    || !equal(source.gridCreditsByArea, [61, 101, 94, 42, 117, 35])
    || !equal(source.flexibleSlots, [
      { semester: 4, credits: 6 }, { semester: 8, credits: 14 },
      { semester: 9, credits: 8 }, { semester: 10, credits: 7 },
    ])) {
    throw new Error("Cambió una carga o distribución publicada en la grilla textual.");
  }
  if (!audit || !inventoryEntry || audit.officialPlan.title !== "Escribano Público"
    || audit.officialPlan.minimumCredits !== 450 || audit.officialPlan.intermediateTitle.minimumCredits !== 160
    || !equal(Object.values(audit.officialPlan.currentMinimumCreditsByArea), source.currentMinimumCreditsByArea)
    || projection.plan.degreeTitle !== audit.officialPlan.title
    || projection.plan.minCredits !== 450 || projection.plan.durationMonths !== 60
    || !equal(projection.campuses.map(({ id }) => id), ["montevideo", "salto"])) {
    throw new Error("La evidencia no concuerda con el plan auditado, sus mínimos o sus sedes.");
  }
  const published = Object.values(projection.publishedPathways);
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  if (inventoryEntry.state !== "research-pending" || verified.length !== 0
    || published.some(({ periods }) => periods.length > 0)) {
    throw new Error("La proyección ya cambió: revisar correspondencias antes de reutilizar esta validación parcial.");
  }

  const report = {
    schemaVersion: 1,
    planId: evidence.planId,
    reviewedAt: evidence.reviewedAt,
    officialSource: {
      authority: evidence.authority,
      documentPageUrl: evidence.documentPageUrl,
      curriculumUrl: evidence.curriculumUrl,
      publishedVersion: evidence.publishedVersion,
      scope: evidence.scope,
      sourcePdfSha256: evidence.sourcePdfSha256,
    },
    normalizedSourcePortionHash: hash(source),
    evidenceHash: hash(evidence),
    projectionHash: hash(projection),
    auditHash: hash(audit),
    checks: {
      textualSemesterCount: source.semesterRows.length,
      textualRowCount: source.semesterRows.reduce((sum, row) => sum + row.labels.length, 0),
      textualCredits: source.semesterCredits.reduce((sum, value) => sum + value, 0),
      flexibleCredits: source.flexibleSlots.reduce((sum, slot) => sum + slot.credits, 0),
      gridAndMinimumAreaDifferencePreserved: !equal(source.gridCreditsByArea, source.currentMinimumCreditsByArea),
      projectedVerifiedIdentities: verified.length,
      projectedOfficialPeriods: published.reduce((sum, pathway) => sum + pathway.periods.length, 0),
      technicalIdsPreserved: projection.courses.length,
      intermediateTitleCredits: audit.officialPlan.intermediateTitle.minimumCredits,
    },
    visualReview: evidence.visualReview,
    unresolved: evidence.unresolved,
    decision: evidence.decision,
  };
  if (write) {
    const temporaryPath = new URL("data/fder/notariado-2016-validation.json.tmp", root);
    await writeFile(temporaryPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await rename(temporaryPath, reportPath);
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await buildNotariadoEvidenceValidation();
  console.log(`${report.planId}: ${report.decision}; ${report.checks.textualSemesterCount} semestres textuales; ${report.checks.projectedVerifiedIdentities} identidades técnicas promovidas.`);
}
