#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDataPath = "data/fcien/geologia-2018-trajectory-review.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const projectionPath = "app/data/bedelias-generated/bedelias-fcien-licenciatura-en-geologia-2018.json";
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const sameMembers = (actual, expected) => actual.length === expected.length
  && new Set(actual).size === actual.length
  && actual.every((value) => expected.includes(value));
const replaceFileAtomically = async (target, content) => {
  const pending = `${target}.d03bc.tmp`;
  await writeFile(pending, content, "utf8");
  await rename(pending, target);
};
const writeJsonIfChanged = async (relativePath, value) => {
  const target = path.join(root, relativePath);
  const previous = await readFile(target, "utf8");
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (previous.replace(/\r\n/g, "\n") !== next) {
    await replaceFileAtomically(target, previous.includes("\r\n") ? next.replace(/\n/g, "\r\n") : next);
  }
};

export function validateGeologySource(source, snapshot) {
  assert.equal(source.planId, "bedelias-fcien-licenciatura-en-geologia-2018");
  assert.equal(source.auditIdentity, "licenciatura en geologia:2018");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions), "Cambió la porción de fuente sin actualizar su huella");
  assert.equal(source.publication.minimumCredits, 360);
  assert.equal(source.publication.durationMonths, 48);
  assert.equal(source.publication.commonCredits + source.publication.orientationCredits + source.publication.transversalCredits, 360);
  assert.equal(source.publication.finalWorkCredits, 35);
  assert.equal(source.publication.coverage, "partial-first-semester");
  assert.equal(source.publication.completeDegreeSequence, false);
  assert.equal(snapshot.contentHash, source.bedeliasComparison.snapshotContentHash);
  assert.equal(snapshot.plan.courses.length, source.bedeliasComparison.snapshotDistinctCourseRecords);
  assert.equal(source.sourcePortions["cidu-2025"].initialRows.length, 7);
  assert.deepEqual(source.sourcePortions["cidu-2025"].laterCoursePeriodRows, []);
  assert.equal(source.trajectories[0].periods.length, 1);
  assert.equal(source.trajectories[0].periods[0].courseIds.length, 7);
  assert.equal(source.catalogMatches.length, 5);
  for (const row of source.catalogMatches) {
    const matches = snapshot.plan.courses.filter(({ code }) => code === row.sourceCourseId);
    assert.equal(matches.length, 1, `Código ambiguo: ${row.sourceCourseId}`);
    assert.deepEqual([matches[0].name, matches[0].credits], [row.bedeliasName, row.credits]);
    assert.ok(row.identityBasis);
  }
  assert.deepEqual(source.sourceOnlyRows.map(({ credits, creditsPublished }) => [credits, creditsPublished]), [[3, true], [0, false]]);
  assert.equal(source.sourcePortions["faculty-2025-schedule"].laboratoryB0025CreditsInTechnicalComposition, 4);
  assert.equal(source.sourcePortions["historical-2008"].applicableToPlan2018, false);
  for (const entry of source.sources) {
    assert.ok(entry.consultedAt <= source.reviewedAt);
    assert.ok(entry.authority && entry.publishedValidity && entry.role);
    assert.ok(source.sourcePortions[entry.id], `Falta evidencia normalizada de ${entry.id}`);
    assert.match(new URL(entry.url).hostname, /(?:^|\.)(?:udelar\.edu\.uy|fcien\.edu\.uy|impo\.com\.uy)$/);
  }
}

export function validateGeologyProjection(source, projection, inventoryEntry) {
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.evidence.kind, "audited-projection");
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, 7);
  assert.deepEqual([projection.plan.year, projection.plan.minCredits, projection.plan.durationMonths], ["2018", 360, 48]);
  assert.deepEqual(projection.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.deepEqual(Object.keys(projection.pathways), ["trayectoria-individual"]);
  assert.equal(projection.creditStructure.credentials.length, 1);
  const existing = projection.courses.filter(({ sourceCourseId }) => !source.sourceOnlyRows.some(({ identityKey }) => identityKey === sourceCourseId));
  assert.equal(existing.length, source.projectionBaseline.existingCourseRecords);
  assert.equal(digest(existing.map(({ id, bedeliasCode, credits }) => [id, bedeliasCode, credits])), source.projectionBaseline.existingIdentityLoadHash, "IDs o cargas técnicas alterados");
  assert.equal(digest(projection.rules), source.projectionBaseline.rulesHash, "Previaturas alteradas");
  const technical = projection.courses.filter(({ bedeliasCode, authorityStatus }) => bedeliasCode && authorityStatus === "verified");
  assert.ok(sameMembers(technical.map(({ bedeliasCode }) => bedeliasCode), source.catalogMatches.map(({ sourceCourseId }) => sourceCourseId)));
  const sourceOnly = projection.courses.filter(({ sourceCourseId }) => source.sourceOnlyRows.some(({ identityKey }) => identityKey === sourceCourseId));
  assert.ok(sameMembers(sourceOnly.map(({ sourceCourseId }) => sourceCourseId), source.sourceOnlyRows.map(({ identityKey }) => identityKey)));
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length, 215);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "B0025").authorityStatus, "candidate");
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "B09").authorityStatus, "candidate");
  const presentation = buildRegisteredPlanPresentation("trayectoria-individual", projection);
  assert.equal(presentation.generated, false);
  assert.deepEqual(presentation.periods.map(({ label }) => label), ["Primer semestre sugerido (2025)"]);
  assert.equal(presentation.periods[0].courseIds.length, 7);
  assert.match(presentation.description, /parcial/i);
  assert.match(presentation.description, /No es una malla completa/);
  assert.equal(projection.publishedRules.length, 5);
  assert.ok(projection.publishedRules.every(({ target }) => source.catalogMatches.some(({ sourceCourseId }) => sourceCourseId === target.code)));
}

export async function buildGeologyReview() {
  const source = await readJson(sourceDataPath);
  validateGeologySource(source, await readJson("data/bedelias/fcien-licenciatura-en-geologia-2018.json"));
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  assert.ok(audit, "Falta auditoría de Plan 2018");
  const trajectory = source.trajectories[0];
  const sourceUrl = source.sources.find(({ id }) => id === "cidu-2025").url;
  audit.reviewedAt = source.reviewedAt;
  audit.scope = "Plan 2018, título, Montevideo, mínimos y siete recomendaciones de ingreso CIDU 2025; resto de períodos no publicado";
  audit.officialPlan.pathwayLabel = trajectory.label;
  audit.officialPlan.trajectories = [{ ...trajectory, useOnlyConfiguredPeriods: true, restrictGeneratedCatalogToPublished: true }];
  Object.assign(audit.officialPlan.curriculum, {
    strictOfficialCourseIds: true,
    verifiedCourseIds: source.catalogMatches.map(({ sourceCourseId }) => sourceCourseId),
    sourceUrl,
    sourceDataPath,
    includeAllCoursesInPathwayCatalog: true,
    pathwayLabel: trajectory.label,
    pathwayDescription: trajectory.description,
    courseOverrides: Object.fromEntries(source.catalogMatches.map((row) => [row.sourceCourseId, {
      name: row.officialLabel,
      preserveName: true,
      requirementId: row.requirementId,
      periodLabel: row.period,
      officialIdentity: true,
      officialCredits: true,
      authorityStatus: "verified",
    }])),
    additionalCourses: source.sourceOnlyRows.map((row) => ({
      id: row.identityKey,
      sourceCourseId: row.identityKey,
      name: row.officialLabel,
      credits: row.credits,
      creditsPublished: row.creditsPublished,
      requirementId: row.requirementId,
      periodLabel: row.period,
      curricularBlock: !row.creditsPublished,
      catalogRole: "official-semester-source-only-course",
      availabilityStatus: "official-trajectory-no-unambiguous-technical-code",
      sourceUrl,
    })),
    projectionAnomalies: source.conflicts,
  });
  Object.assign(audit.conclusion, {
    trajectoryStatus: source.trajectoryConclusion.state,
    trajectorySourceDataPath: sourceDataPath,
    trajectoryCoverage: source.publication.coverage,
    completeDegreeSequence: false,
    trajectoryJustification: source.trajectoryConclusion.reason,
    trajectoryReviewTrigger: source.trajectoryConclusion.reviewTrigger,
  });
  audit.conclusion.normalization = audit.conclusion.normalization.filter((line) => !line.startsWith("Conservar la composición de Bedelías"));
  const instruction = "Reproducir sólo el primer semestre recomendado en CIDU 2025: cinco códigos cotejados y dos identidades sólo-fuente; los 215 registros técnicos restantes permanecen candidatas y no se inventan semestres posteriores.";
  if (!audit.conclusion.normalization.includes(instruction)) audit.conclusion.normalization.push(instruction);
  const sources = new Map(audit.sources.map((entry) => [entry.url, entry]));
  for (const entry of source.sources) sources.set(entry.url, {
    ...(sources.get(entry.url) ?? {}), url: entry.url, authority: entry.authority,
    supports: [entry.role], reviewedAt: entry.consultedAt,
    publishedValidity: entry.publishedValidity,
    contentHash: digest(source.sourcePortions[entry.id]),
  });
  audit.sources = [...sources.values()];
  audit.anomalies = audit.anomalies.filter(({ field }) => !source.conflicts.some((entry) => entry.field === field));
  audit.anomalies.push(...source.conflicts);
  audit.uiNotice = "Guía oficial de ingreso 2025 · parcial: sólo el primer semestre sugerido en Montevideo. No es la malla completa de ocho semestres ni garantiza oferta futura. Laboratorio de Física I aparece con 3 créditos en la guía y 4 en la versión técnica 2025; no se equiparan. Los demás cursos se eligen con la Comisión para cumplir 360 créditos y los mínimos del Plan 2018.";
  audit.remainingWork = source.trajectoryConclusion.reviewTrigger;
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);

  const reviews = await readJson(reviewsPath);
  const review = {
    planId: source.planId,
    state: source.trajectoryConclusion.state,
    reviewedAt: source.reviewedAt,
    effectiveAt: source.publication.trajectoryEffectiveAt,
    projectionMechanism: "official-periods",
    scope: { territories: ["Montevideo"], pathwayIds: [trajectory.id], coverage: source.publication.coverage, completeDegreeSequence: false },
    sources: source.sources.map((entry) => ({ authority: entry.authority, url: entry.url, reviewedAt: entry.consultedAt, role: entry.role, contentHash: digest(source.sourcePortions[entry.id]) })),
    evidence: {
      kind: "audited-projection", sourceDataPath, projectionDataPath: projectionPath,
      sourceCollection: "trajectories", projectionCollection: "publishedPathways", periodField: "periods",
      compareCoursePlacements: true, partial: true, completeDegreeSequence: false,
      reviewTrigger: source.trajectoryConclusion.reviewTrigger,
    },
    conflictNotes: source.conflicts.map(({ resolution }) => resolution),
  };
  const index = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (index < 0) reviews.reviews.push(review);
  else reviews.reviews[index] = review;
  await writeJsonIfChanged(reviewsPath, reviews);

  const generatedPaths = [
    ...(await readdir(path.join(root, "app/data/bedelias-generated"))).filter((name) => name.endsWith(".json")).map((name) => `app/data/bedelias-generated/${name}`),
    "app/data/extracted-academic-catalog.json", "app/data/extracted-academic-loaders.ts",
    "data/bedelias/inventory/audit-queue.json", "data/bedelias/inventory/ui-curriculum-queue.json",
    "data/bedelias/inventory/ui-extracted-plans.json", "data/official-trajectories/inventory.json",
  ];
  const previousGenerated = new Map(await Promise.all(generatedPaths.map(async (relativePath) => [relativePath, await readFile(path.join(root, relativePath), "utf8")])));
  await buildAndWriteAuditQueue();
  await buildExtractedAcademicPlans();
  await buildAndWriteUiCurriculumQueue();
  const inventory = await buildOfficialTrajectoryInventory();
  for (const [relativePath, previous] of previousGenerated) {
    if (!previous.includes("\r\n")) continue;
    const target = path.join(root, relativePath);
    const generated = await readFile(target, "utf8");
    if (generated !== previous) await replaceFileAtomically(target, generated.replace(/\r?\n/g, "\r\n"));
  }
  validateGeologyProjection(source, await readJson(projectionPath), inventory.plans.find(({ planId }) => planId === source.planId));
  console.log("D03bc regenerado sin red: primer semestre oficial parcial, siete ubicaciones y 215 candidatas conservadas.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildGeologyReview();
