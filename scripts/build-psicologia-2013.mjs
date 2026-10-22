#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = "data/psico/psicologia-2013-malla-2025.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const projectionPath = "app/data/bedelias-generated/bedelias-psico-licenciatura-en-psicologia-2013.json";
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));

async function writeJsonIfChanged(relative, value) {
  const target = path.join(root, relative);
  const previous = await readFile(target, "utf8");
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const next = previous.includes("\r\n") ? content.replace(/\n/g, "\r\n") : content;
  if (previous === next) return;
  const pending = `${target}.d03bl.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(pending, next, "utf8");
  await rename(pending, target);
}

const modules = {
  psychology: ["601", "6073", "400", "606", "6071", "401", "612", "613", "6261", "620", "619PI", "619PA", "625", "626", "641", "634", "psico-malla-opt-psicologia-7", "psico-malla-opt-psicologia-8"],
  methodology: ["603", "602", "609", "608", "615", "621", "650", "614", "652", "645", "psico-malla-intervenciones", "643G", "644G", "psico-malla-opt-metodologico"],
  practice: ["616EP", "623", "psico-malla-proyectos", "psico-malla-practica-integral", "psico-malla-practica-graduacion"],
  articulation: ["604", "610", "617E", "624", "653", "646", "psico-malla-opt-articulacion-7", "psico-malla-opt-articulacion-8"],
  referential: ["607", "611", "618", "635E"],
  cooperation: ["psico-malla-cooperacion"],
};
const requirementByIdentity = new Map(Object.entries(modules).flatMap(([id, identities]) => identities.map((identity) => [identity, id])));
const sourceOnlyInterventions = { id: "psico-malla-intervenciones", name: "Teorías y técnicas de las intervenciones", credits: 5, semesters: [5], kind: "source-only" };
const periodLabel = (semester) => `Semestre ${semester}`;

export function verifySource(source, projection) {
  assert.equal(source.planId, "bedelias-psico-licenciatura-en-psicologia-2013");
  assert.deepEqual(source.periods.map(({ semester }) => semester), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(source.auditedPathways.map(({ id }) => id), ["malla-2025"]);
  assert.deepEqual(source.moduleMinimums, {
    "Psicología": 145, "Metodológico": 60, "Prácticas y Proyectos": 50,
    "Articulación de Saberes": 40, "Referencial": 20,
  });
  assert.equal(source.cooperationMaximumCredits, 5);
  const rows = source.periods.flatMap(({ courses }) => courses);
  const coreCodes = rows.map(([code]) => code);
  assert.equal(new Set(coreCodes).size, rows.length);
  assert.equal(rows.length, 39);
  assert.equal(rows.reduce((total, row) => total + row[2], 0), 245);
  assert.equal(source.crossPeriodBlocks.reduce((total, block) => total + block.credits, 0), 75);
  assert.equal(rows.reduce((total, row) => total + row[2], 0)
    + source.crossPeriodBlocks.reduce((total, block) => total + block.credits, 0), 320);
  const technical = new Map();
  for (const [code, name, credits] of rows) {
    if (code === "662A") continue;
    assert.ok(requirementByIdentity.has(code), `Sin módulo: ${code}`);
    const candidates = projection.courses.filter((course) => course.bedeliasCode === code);
    assert.equal(candidates.length, 1, `Código técnico ambiguo: ${code}`);
    assert.equal(candidates[0].credits, credits, `Créditos distintos: ${code}`);
    technical.set(code, { name, credits, id: candidates[0].id });
  }
  for (const code of ["643G", "644G"]) {
    const candidates = projection.courses.filter((course) => course.bedeliasCode === code);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].credits, 5);
    technical.set(code, { name: code === "643G" ? "Idioma Inglés" : "Idioma Portugués", credits: 5, id: candidates[0].id });
  }
  for (const block of [...source.crossPeriodBlocks, sourceOnlyInterventions]) {
    if (block.id === "psico-malla-idioma") {
      assert.deepEqual(block.publishedCodes, ["643G", "644G"]);
      continue;
    }
    assert.ok(requirementByIdentity.has(block.id), `Sin módulo: ${block.id}`);
    assert.ok(block.credits > 0 && block.semesters.length > 0);
  }
  const sourceOnlyIds = new Set([...source.crossPeriodBlocks.filter(({ id }) => id !== "psico-malla-idioma"), sourceOnlyInterventions].map(({ id }) => id));
  const expectedIds = new Set([...technical.keys(), ...sourceOnlyIds]);
  for (const [index, period] of source.auditedPathways[0].periods.entries()) {
    assert.equal(period.label, periodLabel(index + 1));
    assert.deepEqual(period.courseIds.slice(0, source.periods[index].courses.length),
      source.periods[index].courses.map(([code]) => code === "662A" ? sourceOnlyInterventions.id : code));
    for (const id of period.courseIds) assert.ok(expectedIds.has(id), `Ubicación sin identidad: ${id}`);
  }
  return { technical, sourceOnlyIds };
}

export async function buildPsicologia2013() {
  const source = await readJson(sourcePath);
  const previous = await readJson(projectionPath);
  const { technical, sourceOnlyIds } = verifySource(source, previous);
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === "licenciatura en psicologia:2013");
  assert.ok(audit, "Falta la auditoría de Psicología");
  const sourceUrl = source.source.documentUrl;
  const description = "Malla oficial del Plan 2013, actualizada en diciembre de 2025. Los espacios flexibles y franjas que cruzan semestres no fijan cuándo cursarlos ni garantizan oferta. El catálogo está en verificación; consultá con la Facultad por tus opciones y sede.";
  const sourceOnlyBlocks = [...source.crossPeriodBlocks.filter(({ id }) => id !== "psico-malla-idioma"), sourceOnlyInterventions];
  const trajectories = [{
    id: "malla-2025", label: "Malla oficial · actualización 2025", description,
    credentialId: "bedelias-degree", campusIds: ["montevideo", "salto", "paysandu"],
    useOnlyConfiguredPeriods: true, restrictGeneratedCatalogToPublished: true,
    periods: source.auditedPathways[0].periods,
  }];
  audit.reviewedAt = source.reviewedAt;
  audit.scope = "Plan 2013 compartido por Montevideo, Salto y Paysandú; ocho semestres oficiales y franjas flexibles transversales, con catálogo verificado parcial";
  audit.officialPlan.trajectories = trajectories;
  const curriculum = {
    sourceUrl, sourceDataPath: sourcePath, useBedeliasCompositionTree: true,
    preserveBedeliasCourseIds: true, usePublishedCredits: true,
    strictOfficialCourseIds: true, verifiedCourseIds: [...technical.keys()],
    includeAllCoursesInPathwayCatalog: true,
    pathwayLabel: trajectories[0].label, pathwayDescription: description,
    courseOverrides: {},
    additionalCourses: sourceOnlyBlocks.map((block) => ({
      id: block.id, sourceCourseId: block.id, name: block.name, credits: block.credits,
      requirementId: requirementByIdentity.get(block.id),
      periodLabel: block.semesters.length === 1 ? periodLabel(block.semesters[0]) : "Formación transversal",
      curricularBlock: true, elective: block.kind === "flexible",
      catalogRole: block.kind === "flexible" ? "official-flexible-slot" : "official-source-only-course",
      sourceUrl, availabilityStatus: "curricular-space-not-current-course-offer",
    })),
    creditRequirements: [
      { id: "psychology", name: "Módulo Psicología", shortName: "Psicología", minCredits: 145 },
      { id: "methodology", name: "Módulo Metodológico", shortName: "Metodológico", minCredits: 60 },
      { id: "practice", name: "Módulo Prácticas y Proyectos", shortName: "Prácticas", minCredits: 50 },
      { id: "articulation", name: "Módulo Articulación de Saberes", shortName: "Articulación", minCredits: 40 },
      { id: "referential", name: "Módulo Referencial", shortName: "Referencial", minCredits: 20 },
      { id: "cooperation", name: "Cooperación Institucional", shortName: "Cooperación", minCredits: 0, credentialRequired: false },
    ],
  };
  for (const [code, { name, credits }] of technical) {
    const semester = source.periods.find((period) => period.courses.some(([rowCode]) => rowCode === code))?.semester;
    curriculum.courseOverrides[code] = {
      name, credits, preserveName: true,
      periodLabel: semester ? periodLabel(semester) : "Formación transversal",
      requirementId: requirementByIdentity.get(code), officialIdentity: true,
      officialCredits: true, authorityStatus: "verified",
    };
  }
  audit.officialPlan.curriculum = curriculum;
  audit.uiNotice = "Malla oficial de Psicología actualizada en diciembre de 2025. La secuencia de ocho semestres es orientativa; los espacios transversales y optativos no son cursos simultáneos obligatorios ni garantizan oferta. Sólo se muestran identidades cotejadas con la malla.";
  Object.assign(audit.conclusion, {
    trajectoryStatus: "official-trajectory-reproduced",
    trajectorySourceDataPath: sourcePath,
    trajectoryCoverage: "ocho semestres y 75 créditos en espacios flexibles, de los cuales 55 no tienen semestre único",
    completeDegreeSequence: false,
    trajectoryReviewTrigger: "Facultad publique revisión de la malla o aclare la identidad técnica 662A",
  });
  audit.remainingWork = "Contrastar equivalencia de 662A, oferta y codificación de espacios transversales por sede sin incluir entradas de Bedelías no respaldadas.";
  const sources = new Map(audit.sources.map((item) => [item.url, item]));
  sources.set(sourceUrl, { url: sourceUrl, authority: source.source.authority, reviewedAt: source.reviewedAt,
    contentHash: `sha256:${source.source.documentSha256}`,
    supports: ["malla oficial actualizada en diciembre de 2025", "códigos y créditos de ocho semestres", "franjas flexibles transversales"] });
  sources.set(source.source.careerPage, { url: source.source.careerPage, authority: source.source.authority,
    reviewedAt: source.reviewedAt, supports: ["enlace vigente al PDF de la malla 2025"] });
  audit.sources = [...sources.values()];
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);

  const reviews = await readJson(reviewsPath);
  const review = {
    planId: source.planId, state: "official-trajectory-reproduced", reviewedAt: source.reviewedAt,
    effectiveAt: "malla actualizada en diciembre de 2025", projectionMechanism: "official-periods",
    scope: { territories: ["Montevideo", "Salto", "Paysandú"], pathwayIds: ["malla-2025"],
      coverage: "ocho semestres oficiales y espacios flexibles transversales", completeDegreeSequence: false },
    sources: [{ authority: source.source.authority, url: sourceUrl, reviewedAt: source.reviewedAt,
      role: "malla actualizada y cotejada visualmente", contentHash: `sha256:${source.source.documentSha256}` },
      { authority: source.source.authority, url: source.source.careerPage, reviewedAt: source.reviewedAt,
        role: "enlace institucional vigente" }],
    evidence: { kind: "audited-projection", sourceDataPath: sourcePath, projectionDataPath: projectionPath,
      sourceCollection: "auditedPathways", projectionCollection: "publishedPathways",
      periodField: "periods", compareCoursePlacements: true, partial: true,
      completeDegreeSequence: false, reviewTrigger: "revisión oficial de malla o aclaración de 662A" },
    conflictNotes: source.limits,
  };
  const index = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (index < 0) reviews.reviews.push(review); else reviews.reviews[index] = review;
  await writeJsonIfChanged(reviewsPath, reviews);

  await buildAndWriteAuditQueue();
  await buildExtractedAcademicPlans();
  await buildAndWriteUiCurriculumQueue();
  const inventory = await buildOfficialTrajectoryInventory();
  const projection = await readJson(projectionPath);
  const entry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.equal(entry.evidence.expectedCoursePlacements, entry.evidence.matchedCoursePlacements);
  assert.equal(entry.evidence.expectedCoursePlacements, source.auditedPathways[0].periods.reduce((sum, period) => sum + period.courseIds.length, 0));
  assert.deepEqual(Object.keys(projection.publishedPathways), ["malla-2025"]);
  assert.equal(projection.courses.filter(({ authorityStatus, bedeliasCode }) => authorityStatus === "verified" && bedeliasCode).length, technical.size);
  assert.equal(projection.courses.filter(({ authorityStatus, sourceCourseId }) => authorityStatus === "verified" && sourceOnlyIds.has(sourceCourseId)).length, sourceOnlyIds.size);
  console.log("Psicología 2013: malla 2025 de ocho semestres y catálogo parcial regenerados sin red.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildPsicologia2013();
