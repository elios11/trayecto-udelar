#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRegisteredPlanPresentation, GENERATED_PATHWAY_LABEL } from "../app/registered-plan-courses.mjs";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDataPath = "data/fcien/biologia-humana-2004-trajectory-review.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const writeJsonIfChanged = async (relativePath, value) => {
  const target = path.join(root, relativePath);
  const previous = await readFile(target, "utf8");
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (previous.replace(/\r\n/g, "\n") !== next) {
    await writeFile(target, previous.includes("\r\n") ? next.replace(/\n/g, "\r\n") : next, "utf8");
  }
};

export function validateHumanBiologySource(source, snapshot) {
  assert.equal(source.planId, "bedelias-fcien-licenciatura-biologia-humana-2004");
  assert.equal(source.auditIdentity, "licenciatura biologia humana:2004");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions), "Huella de evidencia normalizada alterada");
  assert.equal(source.publication.trajectoryStatus, "no-official-trajectory-documented");
  assert.equal(source.publication.trajectoryPublicationState, "announced-pending");
  assert.equal(source.trajectoryConclusion.temporary, true);
  assert.match(source.trajectoryConclusion.justification, /Próximamente/);
  assert.equal(source.trajectoryConclusion.historicalProposalAdoption, "not-demonstrated");
  assert.ok(source.sourcePortions["fhce-mallas-current"].pendingCareers.includes("Licenciatura en Biología Humana"));
  assert.equal(source.sourcePortions["fhce-mallas-current"].pendingHeading, "Próximamente");
  const proposal = source.sourcePortions["cse-initial-proposals-2021"];
  assert.equal(proposal.currentAdoptionEvidence, false);
  assert.equal(proposal.projectionAllowed, false);
  assert.equal(proposal.initialTracks.length, 3);
  assert.deepEqual(proposal.nominalCoursePeriodRows, []);
  assert.deepEqual(source.scope.coursePeriodRowsReconciled, []);
  assert.deepEqual(source.authorityPolicy.verifiedSourceCourseIds, []);
  assert.equal(source.authorityPolicy.promotedCourseCount, 0);
  assert.equal(source.authorityPolicy.historicalProposalsCreatePathways, false);
  assert.equal(snapshot.contentHash, source.projectionBaseline.snapshotContentHash);
  assert.equal(snapshot.plan.courses.length, source.projectionBaseline.snapshotDistinctCourseRecords);
  assert.equal(source.publication.minimumCredits, 360);
  assert.equal(Object.values(source.projectionBaseline.requirements).reduce((sum, value) => sum + value, 0), 360);
  assert.equal(source.publication.durationMonths, 48);
  assert.deepEqual(source.sourcePortions["impo-correction-2004"].correctedCommonSpecificPercentages, [67, 33]);
  for (const entry of source.sources) {
    assert.equal(entry.consultedAt, source.reviewedAt);
    assert.ok(entry.authority && entry.publishedValidity && entry.role);
    assert.ok(source.sourcePortions[entry.id], `Falta porción normalizada: ${entry.id}`);
    assert.match(new URL(entry.url).hostname, /(?:^|\.)(?:udelar\.edu\.uy|fcien\.edu\.uy|fhce\.edu\.uy|impo\.com\.uy)$/);
  }
}

export function validateHumanBiologyProjection(source, projection, inventoryEntry) {
  assert.equal(inventoryEntry.state, source.publication.trajectoryStatus);
  assert.equal(inventoryEntry.evidence.kind, "documented-absence");
  assert.equal(inventoryEntry.evidence.sourceDataPath, sourceDataPath);
  assert.deepEqual(Object.keys(projection.pathways), source.scope.pathwayIds);
  assert.deepEqual(projection.campuses.map(({ label }) => label), source.scope.territories);
  assert.equal(projection.plan.year, "2004");
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.plan.durationMonths, 48);
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  assert.equal(candidates.length, source.projectionBaseline.projectedCandidateCount);
  assert.equal(digest(candidates.map((course) => [course.id, course.bedeliasCode, course.name, course.credits, course.eligibleRequirementIds])), source.projectionBaseline.candidateIdentityHash, "No alterar identidades, cargas o asignaciones recuperables");
  assert.deepEqual(projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified").map(({ id }) => id), source.projectionBaseline.verifiedValidationIds);
  assert.equal(new Set(projection.courses.map(({ id }) => id)).size, projection.courses.length);
  assert.equal(projection.publishedRules.length, 0);
  const credential = projection.creditStructure.credentials[0];
  assert.equal(credential.minTotalCredits, 360);
  assert.deepEqual(Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits])), source.projectionBaseline.requirements);
  const presentation = buildRegisteredPlanPresentation("curriculo-personalizado", projection);
  assert.equal(presentation.generated, true);
  assert.equal(presentation.label, GENERATED_PATHWAY_LABEL);
  assert.match(presentation.description, /No es una trayectoria sugerida por la institución/);
  assert.ok(presentation.periods.length > 0);
  assert.ok(presentation.periods.every(({ label, courseIds }) => !/semestre|año/i.test(label) && courseIds.length > 0 && courseIds.length <= 6));
  assert.equal(presentation.courses.length, candidates.length);
  assert.ok(presentation.courses.every((course) => course.provisional === true && course.eligibleRequirementIds.length === 0 && course.creditAllocations.length === 0));
  assert.ok(presentation.periods.flatMap(({ courseIds }) => courseIds).every((id) => candidates.some((course) => course.id === id)));
}

export async function buildHumanBiologyReview() {
  const source = await readJson(sourceDataPath);
  const snapshot = await readJson("data/bedelias/fcien-licenciatura-biologia-humana-2004.json");
  validateHumanBiologySource(source, snapshot);
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  assert.ok(audit, "Falta la auditoría previa: no se reconstruye el plan");
  audit.reviewedAt = source.reviewedAt;
  audit.scope = "vigencia, título, servicios participantes, sedes, duración, créditos, áreas comunes, orientación individual, tutorías, pasantía y ausencia temporal explícita de malla publicada";
  audit.conclusion.trajectoryStatus = source.trajectoryConclusion.state;
  audit.conclusion.trajectorySourceDataPath = sourceDataPath;
  audit.conclusion.trajectoryJustification = source.trajectoryConclusion.justification;
  audit.conclusion.trajectoryReviewTrigger = source.trajectoryConclusion.reviewTrigger;
  const sources = new Map(audit.sources.map((entry) => [entry.url, entry]));
  for (const entry of source.sources) {
    sources.set(entry.url, {
      ...(sources.get(entry.url) ?? {}),
      url: entry.url,
      authority: entry.authority,
      supports: [entry.role],
      reviewedAt: entry.consultedAt,
      publishedValidity: entry.publishedValidity,
      contentHash: digest(source.sourcePortions[entry.id]),
    });
  }
  audit.sources = [...sources.values()];
  audit.anomalies = audit.anomalies.filter(({ field }) => field !== "trajectory");
  audit.anomalies.push({ field: "trajectory", resolution: source.trajectoryConclusion.justification });
  audit.uiNotice = "Carrera interservicios de cuatro años y 360 créditos, disponible en Montevideo, Salto, Paysandú, Rivera y Tacuarembó. FHCE todavía anuncia la malla sugerida bajo Próximamente: el orden visible es un recorrido orientativo generado por Trayecto, no una secuencia institucional. Construí tu orientación con tutoría y validá con la Comisión Curricular los cuatro mínimos, la coherencia del currículo y la pasantía mínima de 120 horas con informe científico.";
  audit.remainingWork = `${source.trajectoryConclusion.reviewTrigger} La Comisión Curricular conserva la validación individual de cursos, créditos y pasantía.`;
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);

  const reviews = await readJson(reviewsPath);
  const review = {
    planId: source.planId,
    state: source.publication.trajectoryStatus,
    reviewedAt: source.reviewedAt,
    effectiveAt: "2004/2011; consulta 2026",
    projectionMechanism: "official-flexible-structure",
    scope: { territories: source.scope.territories, pathwayIds: source.scope.pathwayIds },
    sources: source.sources.map((entry) => ({
      authority: entry.authority,
      url: entry.url,
      reviewedAt: entry.consultedAt,
      role: entry.role,
      contentHash: digest(source.sourcePortions[entry.id]),
    })),
    evidence: {
      kind: "documented-absence",
      sourceDataPath,
      justification: source.trajectoryConclusion.justification,
      temporary: true,
      reviewTrigger: source.trajectoryConclusion.reviewTrigger,
      historicalProposalAdoption: source.trajectoryConclusion.historicalProposalAdoption,
    },
    conflictNotes: [
      "Ausencia temporal de malla publicada, no inexistencia permanente: FHCE anuncia Próximamente.",
      "JIES 2021 propone tres mallas de inicio sin filas nominales ni adopción vigente demostrada; no se proyectan.",
      "Se conserva la identidad 2004 aunque el documento depositado diga 2011; IMPO documenta aprobación y rectificación en 2004.",
      "Se conservan 48 meses normativos frente a los 60 administrativos, 360 créditos y las cinco sedes del mismo título y progreso.",
      "Los 1797 registros técnicos y 2032 apariciones siguen como candidatas recuperables, no obligaciones ni oferta actual.",
    ],
  };
  const index = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (index < 0) reviews.reviews.push(review);
  else reviews.reviews[index] = review;
  await writeJsonIfChanged(reviewsPath, reviews);

  // Los generadores compartidos escriben LF. Conservar el formato local existente
  // evita que Windows marque como modificados los otros 138 planes del lote.
  const generatedPaths = [
    ...(await readdir(path.join(root, "app/data/bedelias-generated"))).filter((name) => name.endsWith(".json")).map((name) => `app/data/bedelias-generated/${name}`),
    "app/data/extracted-academic-catalog.json",
    "app/data/extracted-academic-loaders.ts",
    "data/bedelias/inventory/audit-queue.json",
    "data/bedelias/inventory/ui-curriculum-queue.json",
    "data/bedelias/inventory/ui-extracted-plans.json",
    "data/official-trajectories/inventory.json",
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
    await writeFile(target, generated.replace(/\r?\n/g, "\r\n"), "utf8");
  }
  const projection = await readJson(`app/data/bedelias-generated/${source.planId}.json`);
  validateHumanBiologyProjection(source, projection, inventory.plans.find(({ planId }) => planId === source.planId));
  console.log("D03aw regenerado sin red: ausencia temporal documentada, 2032 candidatas preservadas, 360 créditos y cinco sedes sin semestres inferidos.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildHumanBiologyReview();
}
