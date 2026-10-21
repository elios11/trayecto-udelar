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
const sourcePath = "data/fing/cartografia-2011-trajectory-review.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewPath = "data/official-trajectories/reviews.json";
const projectionPath = "app/data/bedelias-generated/bedelias-fing-tecnologo-en-cartografia-2011.json";
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const hash = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const atomicWrite = async (relative, content) => {
  const target = path.join(root, relative);
  const pending = `${target}.d03bf.tmp`;
  await writeFile(pending, content, "utf8");
  await rename(pending, target);
};
const writeJsonIfChanged = async (relative, value) => {
  const previous = await readFile(path.join(root, relative), "utf8");
  const normalized = `${JSON.stringify(value, null, 2)}\n`;
  const next = previous.includes("\r\n") ? normalized.replace(/\n/g, "\r\n") : normalized;
  if (previous !== next) await atomicWrite(relative, next);
};

export function validateCartographySource(source, snapshot) {
  assert.equal(source.planId, "bedelias-fing-tecnologo-en-cartografia-2011");
  assert.equal(source.fingerprint.value, hash(source.sourcePortion));
  assert.deepEqual([source.sourcePortion.minimumCredits, source.sourcePortion.durationSemesters], [180, 4]);
  assert.equal(source.sourcePortion.moduleStructure.length, 4);
  assert.equal(source.sourcePortion.sourceOnlyRecommendations.length, 10);
  assert.deepEqual(source.trajectories[0].periods.slice(0, 4).map(({ courseIds }) => courseIds.length), [3, 3, 3, 3]);
  assert.deepEqual(source.sourcePortion.verifiedTechnicalPlacements.map((row) => [row[0], row[3], row[4]]),
    [["TCI21", 10, "Módulo III"], ["TCI26", 10, "Módulo IV"]]);
  assert.equal(source.conclusion.completeDegreeSequence, false);
  assert.equal(snapshot.plan.courses.length, 102);
  for (const [code, , , credits] of source.sourcePortion.verifiedTechnicalPlacements) {
    const technical = snapshot.plan.courses.filter((course) => course.code === code);
    assert.equal(technical.length, 1, `Código técnico ambiguo: ${code}`);
    assert.equal(technical[0].credits, credits);
  }
}

export function validateCartographyProjection(source, projection, inventoryEntry) {
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.evidence.partial, true);
  assert.deepEqual([projection.plan.minCredits, projection.plan.durationMonths], [180, 24]);
  assert.deepEqual(projection.plan.sharedWith, ["Facultad de Ciencias"]);
  assert.deepEqual(Object.keys(projection.pathways), ["curricula-personalizada"]);
  const candidateIds = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").map(({ id }) => id);
  assert.equal(candidateIds.length, source.conclusion.technicalCandidatesRetained);
  assert.equal(new Set(candidateIds).size, candidateIds.length);
  assert.deepEqual(projection.courses.filter(({ bedeliasCode, authorityStatus }) => bedeliasCode && authorityStatus === "verified")
    .map(({ bedeliasCode }) => bedeliasCode).sort(), ["TCI21", "TCI26"]);
  const presentation = buildRegisteredPlanPresentation("curricula-personalizada", projection);
  assert.equal(presentation.generated, false);
  assert.deepEqual(presentation.periods.slice(0, 4).map(({ label }) => label),
    ["Módulo I", "Módulo II", "Módulo III", "Módulo IV"]);
  assert.deepEqual(presentation.periods.slice(0, 4).map(({ courseIds }) => courseIds.length), [3, 3, 3, 3]);
  assert.match(presentation.description, /parcial/i);
  assert.ok(presentation.courses.every(({ authorityStatus }) => authorityStatus === "verified"));
}

export async function buildCartographyReview() {
  const source = await readJson(sourcePath);
  validateCartographySource(source, await readJson("data/bedelias/fing-tecnologo-en-cartografia-2011.json"));
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  assert.ok(audit);
  const url = source.source.url;
  const rows = source.sourcePortion.sourceOnlyRecommendations;
  const technical = source.sourcePortion.verifiedTechnicalPlacements;
  const expectedPeriods = ["Módulo I", "Módulo II", "Módulo III", "Módulo IV"].map((label) => ({
    label,
    courseIds: [
      ...rows.filter((row) => row[2] === label).map((row) => row[0]),
      ...technical.filter((row) => row[4] === label).map((row) => row[0]),
    ],
  }));
  expectedPeriods.push({ label: "Optativas y currículo personal (sin semestre fijo)", courseIds: ["cartografia-flexibilidad"] });
  assert.deepEqual(source.trajectories[0].periods, expectedPeriods);
  const periods = source.trajectories[0].periods;
  audit.reviewedAt = source.reviewedAt;
  audit.scope = "Plan 2011 compartido FING/FCIEN: cuatro módulos de recomendaciones parciales, sin convertir optativas ni variantes técnicas en obligaciones";
  audit.officialPlan.trajectories = [{
    id: "curricula-personalizada", label: "Recorrido sugerido parcial",
    description: "Guía parcial de módulos sugeridos en el Plan 2011, no secuencia obligatoria ni oferta actual. Las diez asignaturas sin código y carga inequívocos conservan identidad de fuente, sin acreditar variantes de Bedelías. La propuesta por materias no ubica todas las unidades por semestre; optativas y créditos restantes se acuerdan en el currículo individual.",
    credentialId: "tecnologo-cartografia", campusIds: ["montevideo"],
    useOnlyConfiguredPeriods: true, restrictGeneratedCatalogToPublished: true, periods,
  }];
  Object.assign(audit.officialPlan.curriculum, {
    sourceDataPath: sourcePath, strictOfficialCourseIds: true,
    verifiedCourseIds: technical.map((row) => row[0]),
    pathwayLabel: "Recorrido sugerido parcial",
    pathwayDescription: audit.officialPlan.trajectories[0].description,
    courseOverrides: Object.fromEntries(technical.map(([code, , name, , period]) => [code, {
      name, preserveName: true, periodLabel: period, officialIdentity: true,
      officialCredits: true, authorityStatus: "verified",
    }])),
    additionalCourses: [
      ...audit.officialPlan.curriculum.additionalCourses.filter((course) => !rows.some(([id]) => id === course.id)),
      ...rows.map(([id, name, periodLabel, requirementId]) => ({
        id, sourceCourseId: id, name, credits: 0, creditsPublished: false,
        requirementId, periodLabel, curricularBlock: true,
        catalogRole: "official-module-source-only-course",
        availabilityStatus: "2011-plan-recommendation-no-technical-identity-or-current-offer",
        sourceUrl: url,
      })),
    ],
    projectionAnomalies: [
      { field: "trajectory", resolution: "El Plan recomienda módulos y una tabla por materias, pero no asigna inequívocamente todas las unidades a semestres; se publican sólo diez nombres de fuente y Pasantía/Proyecto con código y carga cotejados." },
      { field: "technicalVariants", resolution: "Matemáticas, Cartografía Matemática, Percepción Remota y otros nombres tienen variantes técnicas; ninguna se equipara por similitud de título." },
      { field: "visualReview", resolution: source.source.visualVerification },
    ],
  });
  Object.assign(audit.conclusion, {
    trajectoryStatus: source.conclusion.state,
    trajectorySourceDataPath: sourcePath,
    trajectoryCoverage: source.conclusion.coverage,
    completeDegreeSequence: false,
    trajectoryJustification: "Se reproducen las recomendaciones nominales inequívocas de los cuatro módulos del Plan 2011; la tabla por materias, las variantes técnicas y la oferta actual no permiten completar una malla sin inferencias.",
    trajectoryReviewTrigger: source.conclusion.reviewTrigger,
  });
  audit.uiNotice = "Guía oficial parcial del Plan 2011: cuatro módulos orientativos, no una oferta garantizada ni una secuencia obligatoria. Pasantía y Proyecto conservan sus códigos y 10 créditos; los otros nombres del anexo aún no tienen equivalencia técnica/carga comprobada. Completá 36 créditos adicionales a los mínimos por área hasta sumar 180 dentro de un currículo individual aprobado.";
  audit.remainingWork = source.conclusion.reviewTrigger;
  audit.sources = [...new Map([...audit.sources, {
    url, authority: source.source.authority,
    supports: [source.source.scope], reviewedAt: source.source.consultedAt,
    publishedValidity: source.source.publishedValidity,
    contentHash: source.fingerprint.value,
  }].map((entry) => [entry.url, entry])).values()];
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);

  const reviews = await readJson(reviewPath);
  const review = {
    planId: source.planId, state: source.conclusion.state, reviewedAt: source.reviewedAt,
    effectiveAt: "Plan 2011 aprobado; propuesta orientativa del anexo",
    projectionMechanism: "official-periods",
    scope: { territories: ["Montevideo"], pathwayIds: ["curricula-personalizada"], coverage: source.conclusion.coverage, completeDegreeSequence: false },
    sources: [{ authority: source.source.authority, url, reviewedAt: source.reviewedAt,
      role: source.source.scope, contentHash: source.fingerprint.value }],
    evidence: { kind: "audited-projection", sourceDataPath: sourcePath, projectionDataPath: projectionPath,
      sourceCollection: "trajectories", projectionCollection: "publishedPathways", periodField: "periods",
      compareCoursePlacements: true, partial: true, completeDegreeSequence: false,
      reviewTrigger: source.conclusion.reviewTrigger },
    conflictNotes: [source.source.visualVerification, source.sourcePortion.reasonUnplaced],
  };
  const index = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (index < 0) reviews.reviews.push(review);
  else reviews.reviews[index] = review;
  await writeJsonIfChanged(reviewPath, reviews);

  const generatedPaths = [
    ...(await readdir(path.join(root, "app/data/bedelias-generated"))).filter((name) => name.endsWith(".json")).map((name) => `app/data/bedelias-generated/${name}`),
    "app/data/extracted-academic-catalog.json", "app/data/extracted-academic-loaders.ts",
    "data/bedelias/inventory/audit-queue.json", "data/bedelias/inventory/ui-curriculum-queue.json",
    "data/bedelias/inventory/ui-extracted-plans.json", "data/official-trajectories/inventory.json",
  ];
  const previous = new Map(await Promise.all(generatedPaths.map(async (relative) => [relative, await readFile(path.join(root, relative), "utf8")])));
  await buildAndWriteAuditQueue();
  await buildExtractedAcademicPlans();
  await buildAndWriteUiCurriculumQueue();
  const inventory = await buildOfficialTrajectoryInventory();
  for (const [relative, before] of previous) {
    if (!before.includes("\r\n")) continue;
    const after = await readFile(path.join(root, relative), "utf8");
    if (before !== after) await atomicWrite(relative, after.replace(/\r?\n/g, "\r\n"));
  }
  validateCartographyProjection(source, await readJson(projectionPath), inventory.plans.find(({ planId }) => planId === source.planId));
  console.log("Cartografía 2011: cuatro módulos parciales regenerados sin red; 100 candidatas técnicas preservadas.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildCartographyReview();
