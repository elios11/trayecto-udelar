#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const evidencePath = new URL("data/fder/rrii-2013-2021-evidence.json", root);
const projectionPath = new URL("app/data/bedelias-generated/bedelias-fder-licenciatura-en-relaciones-internacionales-2013.json", root);
const auditsPath = new URL("data/bedelias/audits/official-source-audits.json", root);
const reportPath = new URL("data/fder/rrii-2013-2021-validation.json", root);

const readJson = async (url) => JSON.parse(await readFile(url, "utf8"));
const hash = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

export async function buildRriiEvidenceValidation({ write = true } = {}) {
  const [evidence, projection, audits] = await Promise.all([
    readJson(evidencePath),
    readJson(projectionPath),
    readJson(auditsPath),
  ]);
  const audit = audits.audits.find(({ identity }) => identity === "licenciatura en relaciones internacionales:2013");
  if (!audit || evidence.planId !== "bedelias-fder-licenciatura-en-relaciones-internacionales-2013"
    || projection.plan.year !== "2013" || projection.plan.degreeTitle !== audit.officialPlan.title) {
    throw new Error("La evidencia de RRII no corresponde al plan o a su auditoría.");
  }

  const courses = new Map(projection.courses.map((course) => [course.id, course]));
  const semesters = projection.pathways.bedelias.periods.filter(({ label }) => /^Semestre \d+$/.test(label));
  const placementChecks = evidence.priorAuditPlacementCodes.map(({ semester, codes }) => {
    const period = semesters[semester - 1];
    const actualCodes = period?.courseIds.map((id) => courses.get(id)?.bedeliasCode ?? null) ?? [];
    return {
      semester,
      expectedCodes: codes,
      actualCodes,
      matchesPriorAudit: period?.label === `Semestre ${semester}` && JSON.stringify(codes) === JSON.stringify(actualCodes),
    };
  });
  const introduction = semesters.flatMap(({ courseIds }) => courseIds.map((id) => courses.get(id)))
    .filter((course) => course?.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "introduccion a la investigacion");
  const introductionCodes = introduction.map(({ bedeliasCode }) => bedeliasCode).sort();
  const facts = evidence.sourceFactsCheckedInPdfText;
  const report = {
    schemaVersion: 1,
    planId: evidence.planId,
    reviewedAt: evidence.reviewedAt,
    officialSource: {
      authority: evidence.authority,
      documentPageUrl: evidence.documentPageUrl,
      curriculumUrl: evidence.curriculumUrl,
      publishedVersion: evidence.publishedVersion,
    },
    normalizedSourcePortionHash: hash({
      documentPageLabel: evidence.documentPageLabel,
      facts,
    }),
    evidenceHash: hash(evidence),
    projectionHash: hash(projection),
    auditHash: hash(audit),
    checks: {
      semesterCount: semesters.length,
      semestersMatchPriorAudit: placementChecks.every(({ matchesPriorAudit }) => matchesPriorAudit),
      placementChecks,
      intermediateCreditsMatch: projection.creditStructure.credentials.some(({ id, minTotalCredits }) =>
        id === "rrii-tecnico-comercio" && minTotalCredits === facts.intermediateCredits),
      degreeCreditsMatch: projection.plan.minCredits === facts.degreeCredits,
      graduationModeCreditsMatch: projection.creditStructure.credentials
        .find(({ id }) => id === "bedelias-degree")?.requiredCourseGroups
        .find(({ id }) => id === "rrii-graduation-mode")?.courseIds
        .every((id) => courses.get(id)?.credits === facts.graduationModeCredits) ?? false,
      introductionToResearch: {
        sourceOccurrences: facts.introductionToResearchOccurrences,
        projectedCodes: introductionCodes,
        duplicateUnresolved: introductionCodes.length > facts.introductionToResearchOccurrences,
      },
    },
    visualReview: evidence.visualReview,
    unresolved: evidence.unresolved,
    decision: evidence.decision,
  };
  if (write) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await buildRriiEvidenceValidation();
  console.log(`${report.planId}: ${report.decision}; ${report.checks.semesterCount} semestres cotejados; duplicado sin resolver: ${report.checks.introductionToResearch.duplicateUnresolved}.`);
}
