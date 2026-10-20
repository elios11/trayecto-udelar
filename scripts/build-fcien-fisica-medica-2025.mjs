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
const sourceDataPath = "data/fcien/fisica-medica-2025-trajectory-review.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const projectionPath = "app/data/bedelias-generated/bedelias-fcien-licenciatura-en-fisica-medica-2025.json";
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const sameMembers = (actual, expected) => actual.length === expected.length
  && new Set(actual).size === actual.length
  && actual.every((value) => expected.includes(value));
const preserveWrite = async (relativePath, value) => {
  const target = path.join(root, relativePath);
  const previous = await readFile(target, "utf8");
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (previous.replace(/\r\n/g, "\n") === next) return;
  const pending = `${target}.d03ba.tmp`;
  await writeFile(pending, previous.includes("\r\n") ? next.replace(/\n/g, "\r\n") : next, "utf8");
  await rename(pending, target);
};

export function validateMedicalPhysicsSource(source, snapshot) {
  assert.equal(source.planId, "bedelias-fcien-licenciatura-en-fisica-medica-2025");
  assert.equal(source.auditIdentity, "licenciatura en fisica medica:2025");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  assert.equal(source.publication.minimumCredits, 360);
  assert.equal(source.publication.areaMinimums.reduce((sum, value) => sum + value, 0), 324);
  assert.deepEqual([source.publication.socialProductiveCredits, source.publication.flexibleCredits], [10, 26]);
  assert.equal(snapshot.contentHash, source.baseline.snapshotContentHash);
  assert.equal(snapshot.plan.courses.length, source.baseline.snapshotDistinctCourseRecords);
  assert.equal(source.sourcePortions["suggested-2025"].semesters.length, 8);
  assert.deepEqual(source.sourcePortions["suggested-2025"].semesters.map((rows) => rows.length), [4, 4, 4, 7, 4, 4, 4, 4]);
  assert.equal(source.trajectories[0].periods.length, 8);
  assert.equal(source.trajectories[0].periods.flatMap(({ courseIds }) => courseIds).length, source.baseline.pathwayPlacementCount);
  assert.ok(source.trajectories[0].periods[5].courseIds.includes("MA069") && source.trajectories[0].periods[5].courseIds.includes("FI57"));
  assert.ok(source.sourcePortions["suggested-2025"].semesters[5][2].includes("/"));
  assert.equal(source.sourcePortions["suggested-2025"].technicalCodesPublished, false);
  assert.ok(sameMembers(source.authorityPolicy.verifiedSourceCourseIds, source.catalogMatches.map(([code]) => code)));
  assert.ok(source.sources.every(({ authority, url, consultedAt, publishedValidity }) => authority && url && consultedAt <= source.reviewedAt && publishedValidity));
  assert.ok(source.sources.every(({ id }) => source.sourcePortions[id]));
  assert.ok(source.sources.every(({ url }) => /(?:^|\.)(?:fisica\.edu\.uy|fcien\.edu\.uy|udelar\.edu\.uy|impo\.com\.uy)$/.test(new URL(url).hostname)));
}

export function validateMedicalPhysicsProjection(source, projection, inventoryEntry) {
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.evidence.kind, "audited-projection");
  assert.equal(inventoryEntry.evidence.matchedCoursePlacements, source.baseline.pathwayPlacementCount);
  assert.equal(projection.plan.year, "2025");
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.plan.durationMonths, 48);
  assert.deepEqual(projection.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.deepEqual(Object.keys(projection.pathways), ["plan-individual"]);
  assert.equal(projection.creditStructure.credentials.length, 1);
  assert.deepEqual(projection.creditStructure.credentials[0].nodeRequirements.map(({ minCredits }) => minCredits), [...source.publication.areaMinimums, source.publication.socialProductiveCredits]);
  const mapped = projection.courses.filter(({ authorityStatus, bedeliasCode }) => authorityStatus === "verified" && bedeliasCode);
  const sourceOnly = projection.courses.filter(({ authorityStatus, sourceCourseId }) => authorityStatus === "verified" && sourceCourseId);
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  assert.ok(sameMembers(mapped.map(({ bedeliasCode }) => bedeliasCode), source.authorityPolicy.verifiedSourceCourseIds));
  for (const [code, , , credits] of source.catalogMatches) {
    const course = mapped.find(({ bedeliasCode }) => bedeliasCode === code);
    assert.equal(course?.credits, credits, `Cambió la carga cotejada de ${code}`);
  }
  assert.ok(sameMembers(sourceOnly.map(({ sourceCourseId }) => sourceCourseId), source.sourceOnlyRows.map(({ identityKey }) => identityKey)));
  assert.equal(candidates.length, 13);
  assert.ok(sourceOnly.every(({ credits, creditsPublished }) => credits === 0 && creditsPublished === false));
  const pathway = projection.pathways["plan-individual"];
  const presentation = buildRegisteredPlanPresentation("plan-individual", projection);
  assert.equal(pathway.generatedFallback, undefined);
  assert.equal(presentation.generated, false);
  assert.equal(pathway.periods.length, 8);
  assert.equal(pathway.periods.flatMap(({ courseIds }) => courseIds).length, source.baseline.pathwayPlacementCount);
  assert.ok(pathway.periods.every(({ label }) => /semestre/i.test(label)));
  const candidateIds = new Set(candidates.map(({ id }) => id));
  assert.ok(pathway.periods.every(({ courseIds }) => courseIds.every((id) => !candidateIds.has(id))));
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "FI41").authorityStatus, "candidate");
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "FI284").authorityStatus, "verified");
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "FM04").credits, 15);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "FM05").credits, 25);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "FM08").credits, 10);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "FM06").credits, 10);
}

function updateAudit(source, registry) {
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  assert.ok(audit, "Falta la auditoría base del Plan 2025");
  const trajectory = source.trajectories[0];
  const curriculum = audit.officialPlan.curriculum;
  audit.reviewedAt = source.reviewedAt;
  audit.scope = "Plan 2025, título compartido, sede, créditos y mínimos, más ocho semestres de la trayectoria sugerida 2025 con frontera de catálogo cotejada";
  audit.officialPlan.pathwayLabel = trajectory.label;
  audit.officialPlan.trajectories = [{
    id: trajectory.id,
    label: trajectory.label,
    description: trajectory.description,
    useOnlyConfiguredPeriods: true,
    restrictGeneratedCatalogToPublished: true,
    periods: trajectory.periods,
  }];
  const periodByCode = new Map(trajectory.periods.flatMap(({ label, courseIds }) => courseIds.map((code) => [code, label])));
  const requirementByArea = Object.fromEntries(curriculum.creditRequirements.map(({ id, name }) => [name, id]));
  const suggestedOptions = new Set(source.authorityPolicy.catalogOnlySuggestedOptions);
  const alternatives = new Set(source.authorityPolicy.alternativeGroup);
  curriculum.strictOfficialCourseIds = true;
  curriculum.verifiedCourseIds = source.authorityPolicy.verifiedSourceCourseIds;
  curriculum.sourceUrl = source.sources.find(({ id }) => id === "suggested-2025").url;
  curriculum.sourceDataPath = sourceDataPath;
  curriculum.includeAllCoursesInPathwayCatalog = true;
  curriculum.periodOrder = trajectory.periods.map(({ label }) => label);
  curriculum.pathwayLabel = trajectory.label;
  curriculum.pathwayDescription = trajectory.description;
  curriculum.courseOverrides = Object.fromEntries(source.catalogMatches.map(([code, name, area]) => [code, {
    name, preserveName: true, requirementId: requirementByArea[area] ?? "plan-total",
    periodLabel: periodByCode.get(code) ?? "Opcionales sugeridas",
    officialIdentity: true, officialCredits: true, authorityStatus: "verified",
    ...(alternatives.has(code) || suggestedOptions.has(code) ? { elective: true, catalogRole: alternatives.has(code) ? "official-semester-alternative" : "official-catalog-alternative" } : {}),
  }]));
  curriculum.additionalCourses = source.sourceOnlyRows.map((row) => ({
    id: row.identityKey, sourceCourseId: row.identityKey, name: row.officialLabel,
    credits: 0, creditsPublished: false, requirementId: row.requirementId,
    periodLabel: row.period, curricularBlock: true, catalogRole: row.catalogRole,
    availabilityStatus: "official-flexible-slot-no-fixed-load", sourceUrl: curriculum.sourceUrl,
  }));
  Object.assign(audit.conclusion, {
    trajectoryStatus: "official-trajectory-reproduced",
    trajectorySourceDataPath: sourceDataPath,
    trajectoryJustification: source.trajectoryConclusion.reason,
    trajectoryReviewTrigger: source.trajectoryConclusion.reviewTrigger,
  });
  audit.conclusion.normalization = [...new Set(audit.conclusion.normalization.filter((line) => !line.startsWith("Conservar las 48 apariciones") && !line.startsWith("Presentar una única trayectoria")))];
  for (const line of [
    "Reproducir los ocho semestres de la trayectoria sugerida 2025 como guía flexible; la alternativa Computación/Física Computacional no exige ambas unidades.",
    "Publicar sólo las 35 identidades técnicas cotejadas y tres bloques oficiales sin carga; las otras 13 identidades de la composición siguen candidatas recuperables.",
  ]) if (!audit.conclusion.normalization.includes(line)) audit.conclusion.normalization.push(line);
  const existingSources = new Map(audit.sources.map((entry) => [entry.url, entry]));
  for (const entry of source.sources) existingSources.set(entry.url, {
    ...(existingSources.get(entry.url) ?? {}), url: entry.url, authority: entry.authority,
    supports: [entry.role], reviewedAt: entry.consultedAt, publishedValidity: entry.publishedValidity,
    contentHash: digest(source.sourcePortions[entry.id]),
  });
  audit.sources = [...existingSources.values()];
  audit.anomalies = audit.anomalies.filter(({ field }) => field !== "trajectoryPdfAccess" && field !== "catalogVersion");
  audit.anomalies.push({ field: "trajectoryPdfAccess", resolution: "El PDF oficial está indexado con tabla y notas, pero el servidor rechazó la descarga directa durante la auditoría; inspección visual pendiente. Su grilla nominal de ocho semestres sí se conserva con huella de la transcripción normalizada." });
  audit.anomalies.push({ field: "catalogVersion", resolution: "Taller II FI41 está rotulado 1991-2024 y queda candidato; FI284 es la versión 2025. MA069/FI57 son alternativas, no dos obligaciones. Las otras 12 entradas no demostradas también quedan candidatas." });
  audit.uiNotice = "Trayectoria sugerida 2025 en ocho semestres, flexible y no obligatoria. Las alternativas y las optativas no se suman como obligaciones; el orden no garantiza oferta futura. Conservá los siete mínimos, los 10 créditos transversales y la aprobación de tu plan individual por la Comisión.";
  audit.remainingWork = source.trajectoryConclusion.reviewTrigger;
  registry.contentHash = officialAuditRegistryHash(registry);
}

function updateReviews(source, reviews) {
  const review = {
    planId: source.planId, state: "official-trajectory-reproduced", reviewedAt: source.reviewedAt,
    effectiveAt: "trayectoria sugerida 2025 para Plan 2025",
    projectionMechanism: "official-periods",
    scope: { territories: ["Montevideo"], pathwayIds: [source.trajectories[0].id] },
    sources: source.sources.map((entry) => ({ authority: entry.authority, url: entry.url, reviewedAt: entry.consultedAt, role: entry.role, contentHash: digest(source.sourcePortions[entry.id]) })),
    evidence: { kind: "audited-projection", sourceDataPath, projectionDataPath: projectionPath, sourceCollection: "trajectories", projectionCollection: "publishedPathways", periodField: "periods", compareCoursePlacements: true },
    conflictNotes: [
      "La trayectoria es sugerida y no desplaza el Plan flexible individual aprobado desde 180 créditos.",
      "MA069 y FI57 son alternativas en el sexto semestre; las optativas sugeridas no se convierten en obligaciones ni reciben semestre inventado.",
      "FI41 es la versión de Taller II que terminó en 2024; la correspondencia 2025 es FI284.",
      "El PDF estuvo indexado pero su descarga directa falló; quedan por comprobar visualmente las notas al pie y eventuales cambios de la Comisión.",
    ],
  };
  const index = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (index < 0) reviews.reviews.push(review);
  else reviews.reviews[index] = review;
}

export async function buildMedicalPhysicsReview() {
  const source = await readJson(sourceDataPath);
  validateMedicalPhysicsSource(source, await readJson("data/bedelias/fcien-licenciatura-en-fisica-medica-2025.json"));
  const registry = await readJson(auditPath);
  updateAudit(source, registry);
  await preserveWrite(auditPath, registry);
  const reviews = await readJson(reviewsPath);
  updateReviews(source, reviews);
  await preserveWrite(reviewsPath, reviews);
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
    if (generated === previous) continue;
    const pending = `${target}.d03ba.tmp`;
    await writeFile(pending, generated.replace(/\r?\n/g, "\r\n"), "utf8");
    await rename(pending, target);
  }
  validateMedicalPhysicsProjection(source, await readJson(projectionPath), inventory.plans.find(({ planId }) => planId === source.planId));
  console.log("D03ba regenerado sin red: ocho semestres sugeridos, 35 correspondencias, tres bloques y 13 candidatas retenidas.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildMedicalPhysicsReview();
