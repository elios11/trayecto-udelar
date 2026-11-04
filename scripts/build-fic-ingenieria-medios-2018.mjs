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
const sourcePath = "data/fic/ingenieria-medios-2018-malla-review.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const projectionPath = "app/data/bedelias-generated/bedelias-fic-licenciatura-en-ingenieria-de-medios-2018.json";
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const areaIds = {
  CPC: "media-content-conception", INT: "media-integrative", TCM: "media-theory",
  MAT: "media-mathematics", INF: "media-informatics", TRC: "media-content-techniques",
  CIN: "media-information-science", LYN: "media-languages", FIS: "media-physics",
};
const periodLabel = (semester) => `Semestre ${semester}`;

async function writeJsonIfChanged(relative, value) {
  const target = path.join(root, relative);
  const previous = await readFile(target, "utf8");
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const next = previous.includes("\r\n") ? content.replace(/\n/g, "\r\n") : content;
  if (previous === next) return;
  const pending = `${target}.d03bk.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(pending, next, "utf8");
  await rename(pending, target);
}

export function verifySource(source, existingProjection) {
  assert.equal(source.planId, "bedelias-fic-licenciatura-en-ingenieria-de-medios-2018");
  assert.equal(source.planMinimums.totalCredits, 360);
  assert.equal(source.firstFourSemesters.length, 2);
  assert.deepEqual(source.firstFourSemesters.map(({ id }) => id), ["fing", "fcea"]);
  const identities = new Map();
  for (const pathway of source.firstFourSemesters) {
    assert.deepEqual(pathway.periods.map(({ semester }) => semester), [1, 2, 3, 4]);
    for (const period of pathway.periods) {
      assert.equal(period.rows.reduce((sum, [, , credits]) => sum + credits, 0), period.printedSubtotal);
      for (const [area, name, credits] of period.rows) {
        assert.ok(areaIds[area], `Área desconocida: ${area}`);
        if (identities.has(name)) assert.deepEqual(identities.get(name), [area, credits]);
        else identities.set(name, [area, credits]);
      }
    }
  }
  assert.deepEqual(source.firstFourSemesters[0].periods[0].rows, source.firstFourSemesters[1].periods[0].rows);
  assert.deepEqual(source.firstFourSemesters[0].periods[3].rows, source.firstFourSemesters[1].periods[3].rows);
  assert.deepEqual(source.laterExamples.map(({ semestersPrinted }) => semestersPrinted), [[6, 7, 8, 9], [6, 7, 8, 9]]);
  const matched = Object.keys(source.technicalMatchesByPublishedName);
  const sourceOnly = Object.keys(source.sourceOnlyIdsByPublishedName);
  assert.deepEqual([...matched, ...sourceOnly].sort(), [...identities.keys()].sort());
  assert.equal(new Set([...Object.values(source.technicalMatchesByPublishedName), ...Object.values(source.sourceOnlyIdsByPublishedName)]).size, identities.size);
  assert.deepEqual(source.auditedPathways.map(({ id }) => id), ["malla-fing-1-4", "malla-fcea-1-4"]);
  for (const [index, audited] of source.auditedPathways.entries()) {
    for (const [periodIndex, period] of audited.periods.entries()) {
      assert.deepEqual(period.courseIds, source.firstFourSemesters[index].periods[periodIndex].rows.map(([, name]) =>
        source.technicalMatchesByPublishedName[name] ?? source.sourceOnlyIdsByPublishedName[name]));
    }
  }
  for (const [name, code] of Object.entries(source.technicalMatchesByPublishedName)) {
    const candidates = existingProjection.courses.filter((course) => course.bedeliasCode === code);
    assert.equal(candidates.length, 1, `Código técnico ambiguo: ${code}`);
    assert.equal(candidates[0].credits, identities.get(name)[1], `Créditos incompatibles: ${name}`);
  }
  return identities;
}

export function verifyProjection(source, projection, inventoryEntry) {
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(inventoryEntry.state, "official-trajectory-reproduced");
  assert.equal(inventoryEntry.evidence.partial, true);
  assert.deepEqual(Object.keys(projection.publishedPathways), ["malla-fing-1-4", "malla-fcea-1-4", "trayectoria-flexible"]);
  for (const [index, id] of ["malla-fing-1-4", "malla-fcea-1-4"].entries()) {
    const periods = projection.publishedPathways[id].periods;
    assert.deepEqual(periods.map(({ label }) => label), [1, 2, 3, 4].map(periodLabel));
    assert.deepEqual(periods.map(({ courseIds }) => courseIds.reduce((sum, courseId) => sum + projection.courses.find((course) => course.id === courseId).credits, 0)),
      source.firstFourSemesters[index].periods.map(({ printedSubtotal }) => printedSubtotal));
  }
  const expectedVisible = new Set(Object.values(source.technicalMatchesByPublishedName));
  assert.deepEqual(new Set(projection.courses.filter((course) => course.authorityStatus === "verified" && course.bedeliasCode)
    .map(({ bedeliasCode }) => bedeliasCode)), expectedVisible);
  assert.equal(projection.courses.filter((course) => course.authorityStatus === "verified" && course.sourceCourseId?.startsWith("lim-grilla-")).length,
    Object.keys(source.sourceOnlyIdsByPublishedName).length);
  assert.ok(projection.publishedPathways["malla-fing-1-4"].catalogCourseIds.length > 0);
}

export async function buildFicIngenieriaMedios2018() {
  const source = await readJson(sourcePath);
  const existingProjection = await readJson(projectionPath);
  const identities = verifySource(source, existingProjection);
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === "licenciatura en ingenieria de medios:2018");
  assert.ok(audit, "Falta la auditoría previa");
  const sourceUrl = source.source.documentUrl;
  const description = "Guía parcial FIC de los semestres 1 a 4; no fija los posteriores ni garantiza oferta. Podés ajustar el currículo con la Comisión de Carrera hasta cumplir 360 créditos y los mínimos por área.";
  const pathway = (variant) => ({
    id: `malla-${variant.id}-1-4`, label: `${variant.label} · tramo inicial`,
    description, credentialId: "licenciado-ingenieria-medios", campusIds: ["montevideo"],
    useOnlyConfiguredPeriods: true, restrictGeneratedCatalogToPublished: true,
    periods: variant.periods.map((period) => ({ label: periodLabel(period.semester),
      courseIds: period.rows.map(([, name]) => source.technicalMatchesByPublishedName[name] ?? source.sourceOnlyIdsByPublishedName[name]) })),
  });
  const legacyFlexible = {
    id: "trayectoria-flexible", label: "Recorrido personalizado", credentialId: "licenciado-ingenieria-medios",
    description: "Recorrido personal conservado para compatibilidad; sólo el primer semestre está ubicado y el resto se elige con la Comisión de Carrera.",
    campusIds: ["montevideo"], useOnlyConfiguredPeriods: true, restrictGeneratedCatalogToPublished: true,
    periods: [{ label: periodLabel(1), courseIds: source.firstFourSemesters[0].periods[0].rows.map(([, name]) => source.technicalMatchesByPublishedName[name] ?? source.sourceOnlyIdsByPublishedName[name]) },
      { label: "Orientación del recorrido", courseIds: ["recorrido-flexible-45"] },
      { label: "Señales e Ingeniería Eléctrica", courseIds: ["senales-catalogo-pendiente"] },
      { label: "Formación Complementaria", courseIds: ["formacion-complementaria"] },
      { label: "Validación de egreso", courseIds: ["validacion-final-plan"] }],
  };
  const curriculum = audit.officialPlan.curriculum;
  audit.reviewedAt = source.reviewedAt;
  audit.scope = "Plan 2018 conjunto FIC/FING, Montevideo; dos guías oficiales sólo para semestres 1-4, catálogo parcial y currículo personal validado";
  audit.officialPlan.trajectories = [...source.firstFourSemesters.map(pathway), legacyFlexible];
  curriculum.sourceDataPath = sourcePath;
  curriculum.sourceUrl = sourceUrl;
  curriculum.preserveBedeliasCourseIds = true;
  curriculum.strictOfficialCourseIds = true;
  curriculum.verifiedCourseIds = Object.values(source.technicalMatchesByPublishedName);
  curriculum.includeAllCoursesInPathwayCatalog = true;
  curriculum.pathwayLabel = "Malla sugerida · tramo inicial";
  curriculum.pathwayDescription = description;
  curriculum.courseOverrides = { ...curriculum.courseOverrides };
  for (const [name, code] of Object.entries(source.technicalMatchesByPublishedName)) {
    const [area, credits] = identities.get(name);
    curriculum.courseOverrides[code] = { ...curriculum.courseOverrides[code], name,
      credits, preserveName: true, requirementId: areaIds[area],
      periodLabel: periodLabel(source.firstFourSemesters.flatMap((variant) => variant.periods)
        .find((period) => period.rows.some(([, rowName]) => rowName === name)).semester),
      officialIdentity: true, officialCredits: true, authorityStatus: "verified",
    };
  }
  const previousAdditional = curriculum.additionalCourses.filter(({ id }) => !id.startsWith("lim-grilla-"));
  const sourceOnly = Object.entries(source.sourceOnlyIdsByPublishedName).map(([name, id]) => {
    const [area, credits] = identities.get(name);
    const semester = source.firstFourSemesters.flatMap((variant) => variant.periods)
      .find((period) => period.rows.some(([, rowName]) => rowName === name)).semester;
    return { id, sourceCourseId: id, name, credits, requirementId: areaIds[area],
      periodLabel: periodLabel(semester), sourceUrl, availabilityStatus: "suggested-not-confirmed-current-offer" };
  });
  curriculum.additionalCourses = [...previousAdditional, ...sourceOnly];
  audit.uiNotice = "Malla sugerida parcial de FIC: sólo los semestres 1 a 4 están cotejados en dos variantes. Los semestres posteriores no están completos en la fuente. El catálogo sigue parcial; verificá con la Comisión de Carrera las unidades acreditables y la oferta vigente.";
  Object.assign(audit.conclusion, { trajectoryStatus: "official-trajectory-reproduced",
    trajectorySourceDataPath: sourcePath, trajectoryCoverage: "dos variantes indicativas de semestres 1-4",
    completeDegreeSequence: false, trajectoryReviewTrigger: "FIC/FING aclaren y publiquen la malla completa, incluido el semestre 5" });
  audit.remainingWork = "Contrastar el quinto semestre y las grillas 6-9 con una publicación oficial completa; ampliar catálogo verificado por curso sin inferir equivalencias.";
  const documented = new Map(audit.sources.map((item) => [item.url, item]));
  documented.set(sourceUrl, { url: sourceUrl, authority: source.source.authority,
    reviewedAt: source.reviewedAt, contentHash: `sha256:${source.source.documentSha256}`,
    supports: ["malla indicativa Fing y FCEA semestres 1-4", "ejemplos incompletos 6-9"] });
  documented.set(source.source.careerPage, { url: source.source.careerPage, authority: source.source.authority,
    reviewedAt: source.reviewedAt, supports: ["enlaces vigentes y carácter sugerido de ambas variantes"] });
  audit.sources = [...documented.values()];
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);

  const reviews = await readJson(reviewsPath);
  const review = { planId: source.planId, state: "official-trajectory-reproduced", reviewedAt: source.reviewedAt,
    effectiveAt: "malla sugerida FIC, archivo fechado 10 de diciembre de 2025",
    projectionMechanism: "official-periods",
    scope: { territories: ["Montevideo"], pathwayIds: ["malla-fing-1-4", "malla-fcea-1-4"],
      coverage: "sólo semestres 1-4 de las dos guías iniciales", completeDegreeSequence: false },
    sources: [{ authority: source.source.authority, url: sourceUrl, reviewedAt: source.reviewedAt,
      role: "malla sugerida parcial", contentHash: `sha256:${source.source.documentSha256}` },
      { authority: source.source.authority, url: source.source.careerPage, reviewedAt: source.reviewedAt,
        role: "enlace vigente; variantes sugeridas" }],
    evidence: { kind: "audited-projection", sourceDataPath: sourcePath, projectionDataPath: projectionPath,
      sourceCollection: "auditedPathways", projectionCollection: "publishedPathways", periodField: "periods",
      compareCoursePlacements: true, partial: true, completeDegreeSequence: false,
      reviewTrigger: "publicación oficial de semestre 5 y trayectoria completa" },
    conflictNotes: source.conflictsAndLimits,
  };
  const reviewIndex = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (reviewIndex < 0) reviews.reviews.push(review); else reviews.reviews[reviewIndex] = review;
  await writeJsonIfChanged(reviewsPath, reviews);

  await buildAndWriteAuditQueue();
  await buildExtractedAcademicPlans();
  await buildAndWriteUiCurriculumQueue();
  const inventory = await buildOfficialTrajectoryInventory();
  const projection = await readJson(projectionPath);
  verifyProjection(source, projection, inventory.plans.find(({ planId }) => planId === source.planId));
  console.log("Ingeniería de Medios 2018: dos tramos FIC 1-4 regenerados sin red; 5-9 siguen pendientes.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildFicIngenieriaMedios2018();
