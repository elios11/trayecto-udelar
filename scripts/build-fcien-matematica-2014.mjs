#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRegisteredPlanPresentation, GENERATED_PATHWAY_LABEL } from "../app/registered-plan-courses.mjs";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDataPath = "data/fcien/matematica-2014-trajectory-review.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const projectionPath = "app/data/bedelias-generated/bedelias-fcien-licenciatura-en-matematica-2014.json";
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const identityLoadAuthority = (courses) => courses.map((course) => [
  course.id, course.bedeliasCode, course.name, course.credits,
  course.eligibleRequirementIds, course.creditAllocations, course.authorityStatus,
]);
const replaceFile = async (relativePath, content) => {
  const target = path.join(root, relativePath);
  const pending = `${target}.d03be.tmp`;
  await writeFile(pending, content, "utf8");
  await rename(pending, target);
};
const writeJsonIfChanged = async (relativePath, value) => {
  const previous = await readFile(path.join(root, relativePath), "utf8");
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (previous.replace(/\r\n/g, "\n") !== next) {
    await replaceFile(relativePath, previous.includes("\r\n") ? next.replace(/\n/g, "\r\n") : next);
  }
};

export function validateMathematicsSource(source, snapshot) {
  assert.equal(source.planId, "bedelias-fcien-licenciatura-en-matematica-2014");
  assert.equal(source.auditIdentity, "licenciatura en matematica:2014");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  assert.equal(source.publication.minimumCredits, 360);
  assert.equal(source.publication.durationMonths, 48);
  assert.deepEqual(source.publication.territories, ["Montevideo"]);
  assert.equal(source.publication.pathwayIds.length, 6);
  assert.equal(snapshot.contentHash, source.projectionBaseline.snapshotContentHash);
  assert.equal(snapshot.plan.courses.length, source.projectionBaseline.snapshotDistinctCourseRecords);
  assert.equal(source.trajectoryConclusion.state, "research-pending");
  const example = source.sourcePortions["historical-example"];
  assert.equal(example.entryYear, 2017);
  assert.equal(example.offerYears, "2017-2020");
  assert.equal(example.semesters.length, 8);
  assert.equal(example.semesters.flat().length, example.sourceRowCount);
  assert.deepEqual(example.technicalIdentitiesPromoted, []);
  const offer = source.sourcePortions["current-stable-offer"];
  assert.equal(offer.years, "2025-2029");
  assert.equal(offer.rows.length, 26);
  assert.ok(offer.rows.every((row) => row.length === 5 && ["Impar", "Par"].includes(row[2])));
  assert.deepEqual(offer.ordinalCoursePeriodRows, []);
  assert.deepEqual(offer.technicalIdentitiesPromoted, []);
  assert.equal(source.sourcePortions["entry-guidance-2024"].rows.length, 3);
  for (const item of source.sources) {
    assert.ok(item.authority && item.publishedValidity && item.role);
    assert.ok(item.consultedAt <= source.reviewedAt);
    assert.ok(source.sourcePortions[item.id]);
    assert.match(new URL(item.url).hostname, /(?:^|\.)(?:cmat\.edu\.uy|fcien\.edu\.uy|udelar\.edu\.uy)$/);
  }
}

export function validateMathematicsProjection(source, projection, entry) {
  assert.equal(entry.state, "research-pending");
  assert.equal(entry.evidence.sourceDataPath, sourceDataPath);
  assert.equal(projection.plan.year, "2014");
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.plan.durationMonths, 48);
  assert.deepEqual(Object.keys(projection.pathways), source.publication.pathwayIds);
  assert.deepEqual(projection.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.equal(projection.courses.length, source.projectionBaseline.projectedCourseRecords);
  assert.equal(digest(identityLoadAuthority(projection.courses)), source.projectionBaseline.courseIdentityLoadAuthorityHash);
  assert.equal(digest(projection.publishedRules), source.projectionBaseline.publishedRulesHash);
  assert.equal(digest(projection.creditStructure), source.projectionBaseline.creditStructureHash);
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length, 366);
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified").length, 1);
  for (const pathwayId of source.publication.pathwayIds) {
    const presentation = buildRegisteredPlanPresentation(pathwayId, projection);
    assert.equal(presentation.generated, true);
    assert.equal(presentation.label, GENERATED_PATHWAY_LABEL);
    assert.ok(presentation.periods.length > 0);
    assert.ok(presentation.periods.every(({ label }) => !/^\d+\.?(?:er|do|to)? semestre$/i.test(label)));
  }
}

export async function buildMathematicsReview() {
  const source = await readJson(sourceDataPath);
  validateMathematicsSource(source, await readJson("data/bedelias/fcien-licenciatura-en-matematica-2014.json"));
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  assert.ok(audit, "Falta auditoría previa; no se reconstruye el plan ni sus perfiles");
  audit.reviewedAt = source.reviewedAt;
  audit.scope = "Plan 2014, perfiles, mínimos y catálogo; contraste de la guía histórica de ocho semestres para ingreso 2017 con la oferta estable de cursos 2025-2029, sin trayectoria actual acreditada";
  Object.assign(audit.conclusion, {
    trajectoryStatus: source.trajectoryConclusion.state,
    trajectorySourceDataPath: sourceDataPath,
    trajectoryJustification: source.trajectoryConclusion.reason,
    trajectoryReviewTrigger: source.trajectoryConclusion.reviewTrigger,
  });
  audit.officialPlan.curriculum.sourceDataPath = sourceDataPath;
  audit.officialPlan.curriculum.pathwayDescription = "Plan individual flexible. Los ejemplos del Centro de Matemática corresponden a ingreso 2017 y oferta 2017-2020; aún falta cotejar una guía vigente. El orden visible es orientativo generado por Trayecto, no una secuencia institucional actual.";
  const sources = new Map(audit.sources.map((entry) => [entry.url, entry]));
  for (const item of source.sources) sources.set(item.url, {
    ...(sources.get(item.url) ?? {}), url: item.url, authority: item.authority,
    supports: [item.role], reviewedAt: item.consultedAt,
    publishedValidity: item.publishedValidity,
    contentHash: digest(source.sourcePortions[item.id]),
  });
  audit.sources = [...sources.values()];
  audit.anomalies = audit.anomalies.filter(({ field }) => field !== "trajectory");
  audit.anomalies.push({ field: "trajectory", resolution: source.trajectoryConclusion.reason });
  audit.uiNotice = "Plan 2014 flexible de ocho semestres y 360 créditos en Montevideo. Los ejemplos semestrales del Centro de Matemática son para ingreso 2017 y oferta 2017-2020; no garantizan la oferta actual. El orden visible es un recorrido orientativo generado por Trayecto. Elegí el perfil para ver sus mínimos y confirmá tu plan individual con la Comisión de Carrera.";
  audit.remainingWork = source.trajectoryConclusion.reviewTrigger;
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);

  const reviews = await readJson(reviewsPath);
  const review = {
    planId: source.planId,
    state: "research-pending",
    reviewedAt: source.reviewedAt,
    effectiveAt: "Plan 2014; ejemplos históricos 2017-2020; oferta estable 2025-2029",
    projectionMechanism: "official-flexible-structure",
    scope: { territories: source.publication.territories, pathwayIds: source.publication.pathwayIds },
    sources: source.sources.map((item) => ({
      authority: item.authority, url: item.url, reviewedAt: item.consultedAt,
      role: item.role, contentHash: digest(source.sourcePortions[item.id]),
    })),
    evidence: {
      kind: "insufficient-current-trajectory-evidence",
      sourceDataPath,
      projectionDataPath: projectionPath,
      sourceContentHash: digest(source.sourcePortions),
      historicalExamplePeriodCount: 8,
      historicalExampleCoursePlacements: 29,
      currentRegularCourseRows: 26,
      currentOrdinalCoursePeriodRows: 0,
      promotedCourseCount: 0,
      candidateRetainedCount: 366,
      reason: source.trajectoryConclusion.reason,
      reviewTrigger: source.trajectoryConclusion.reviewTrigger,
    },
    conflictNotes: [
      ...audit.anomalies.filter(({ field }) => field !== "trajectory").map(({ field, resolution }) => `${field}: ${resolution}`),
      "Los ejemplos de ocho semestres publicados por el Centro corresponden a ingreso 2017 y oferta prevista 2017-2020. La página vigente aún los enlaza como planes personales posibles, sin actualizarlos ni declararlos obligatorios.",
      "La oferta estable 2025-2029 es una tabla de dictado Impar/Par y frecuencia, no semestre ordinal ni promesa para cada edición. No se transforma en malla.",
      "La recomendación nominal de ingreso recuperable se refiere explícitamente al primer semestre 2024; no se extrapola a 2026.",
      "La grilla histórica no publica códigos. Se conservan 366 registros técnicos candidatos y un marcador manual verificado, sin equivalencias por semejanza o cambio de carga.",
      "La investigación pendiente no es ausencia institucional documentada; se mantiene un único Plan 2014 y seis opciones del mismo progreso.",
    ],
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
    const generated = await readFile(path.join(root, relativePath), "utf8");
    if (generated !== previous) await replaceFile(relativePath, generated.replace(/\r?\n/g, "\r\n"));
  }
  validateMathematicsProjection(source, await readJson(projectionPath), inventory.plans.find(({ planId }) => planId === source.planId));
  console.log("D03be regenerado sin red: 29 ubicaciones históricas, 26 filas de oferta, investigación pendiente; catálogo preservado.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildMathematicsReview();
