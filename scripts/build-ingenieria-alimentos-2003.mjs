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
const sourcePath = "data/fq/ingenieria-alimentos-2003-curriculas.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const projectionPath = "app/data/bedelias-generated/bedelias-fq-ingenieria-de-alimentos-2003.json";
const planId = "bedelias-fq-ingenieria-de-alimentos-2003";
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));

async function writeJsonIfChanged(relative, value) {
  const target = path.join(root, relative);
  const previous = await readFile(target, "utf8");
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const next = previous.includes("\r\n") ? content.replace(/\n/g, "\r\n") : content;
  if (next === previous) return;
  const pending = `${target}.d03bn.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(pending, next, "utf8");
  await rename(pending, target);
}

const sourceOnlyId = (identity) => `ia2003-${identity}`;
const periodLabel = (number) => `Semestre ${number}`;
const sourceOnlyRequirements = {
  mat05: "food-mathematics", fq101: "food-chemistry", bioquim3: "food-biology",
  controlcalidad: "food-quality", gestionprocesos: "food-industrial-management",
  proyecto2: "food-integrative",
};

export function verifySource(source, previous) {
  assert.equal(source.planId, planId);
  assert.equal(source.plan.minimumCredits, 450);
  assert.deepEqual(source.pathways.map(({ id }) => id), ["trayectoria-flexible", "matematicas-fisicas-fing"]);
  assert.equal(source.rows.length, 60);
  const rows = new Map(source.rows.map((row) => [row[0], row]));
  assert.equal(rows.size, source.rows.length);
  const technical = new Map();
  for (const [identity, name, credits, service, code, alternative] of rows.values()) {
    assert.ok(name && credits > 0 && ["FQ", "FI", "FA", "FM", "FV"].includes(service));
    if (alternative) assert.ok(source.alternativeGroups[alternative]);
    if (!code) {
      assert.ok(sourceOnlyRequirements[identity], `Falta asignación de área: ${identity}`);
      continue;
    }
    const matches = previous.courses.filter((course) => course.bedeliasCode === code);
    assert.equal(matches.length, 1, `Código técnico ausente o ambiguo: ${code}`);
    assert.equal(matches[0].credits, credits, `Créditos distintos para ${code}`);
    technical.set(identity, { code, courseId: matches[0].id });
  }
  for (const pathway of source.pathways) {
    assert.equal(pathway.semesters.length, 10);
    for (const semester of pathway.semesters) {
      assert.ok(semester.length > 0);
      assert.equal(semester.length, new Set(semester).size);
      for (const identity of semester) assert.ok(rows.has(identity), `Fila sin fuente: ${identity}`);
    }
    assert.equal(new Set(pathway.semesters.flat()).size, pathway.semesters.flat().length);
  }
  for (const group of Object.keys(source.alternativeGroups)) {
    const identities = [...rows.values()].filter((row) => row[5] === group).map((row) => row[0]);
    assert.ok(identities.length > 1);
    for (const pathway of source.pathways) {
      const positions = identities.map((id) => pathway.semesters.findIndex((semester) => semester.includes(id)));
      assert.ok(positions.every((position) => position >= 0 && position === positions[0]));
    }
  }
  return { rows, technical };
}

export async function buildIngenieriaAlimentos2003() {
  const source = await readJson(sourcePath);
  const previous = await readJson(projectionPath);
  const { rows, technical } = verifySource(source, previous);
  source.auditedPathways = source.pathways.map((pathway) => ({
    id: pathway.id,
    periods: pathway.semesters.map((semester, index) => ({
      label: periodLabel(index + 1),
      courseIds: semester.map((identity) => technical.get(identity)?.code ?? sourceOnlyId(identity)),
    })),
  }));
  await writeJsonIfChanged(sourcePath, source);
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === "ingenieria de alimentos:2003");
  assert.ok(audit);
  const description = "Guía sugerida del Plan 2003; la elección de unidades y las equivalencias se aprueban en el currículo individual. En Bioquímica se cursa una opción; Nutrición y Gestión presentan alternativas, no créditos acumulativos. La grilla no garantiza oferta por semestre o sede.";
  const trajectories = source.pathways.map((pathway) => ({
    id: pathway.id, label: pathway.label, description, credentialId: "ingeniero-alimentario",
    campusIds: ["montevideo"], useOnlyConfiguredPeriods: true,
    restrictGeneratedCatalogToPublished: true,
    periods: pathway.semesters.map((semester, index) => ({
      label: periodLabel(index + 1),
      courseIds: semester.map((identity) => technical.get(identity)?.code ?? sourceOnlyId(identity)),
    })),
  }));
  audit.reviewedAt = source.reviewedAt;
  audit.officialPlan.trajectories = trajectories;
  const curriculum = audit.officialPlan.curriculum;
  curriculum.sourceDataPath = sourcePath;
  curriculum.preserveBedeliasCourseIds = true;
  curriculum.strictOfficialCourseIds = true;
  curriculum.verifiedCourseIds = [...new Set([...technical.values()].map(({ code }) => code))];
  curriculum.courseOverrides = {};
  curriculum.additionalCourses = curriculum.additionalCourses.filter(({ id }) => !id.startsWith("ia2003-"));
  curriculum.pathwayLabel = "Currícula sugerida";
  curriculum.pathwayDescription = description;
  for (const [identity, [, name, credits, , code, alternative]] of rows) {
    const sourceUrl = source.sources[source.pathways.find((pathway) => pathway.semesters.some((semester) => semester.includes(identity)))?.source]?.url;
    if (code) {
      curriculum.courseOverrides[code] = {
        name, preserveName: true, credits, officialIdentity: true, officialCredits: true,
        authorityStatus: "verified", creditSourceUrl: sourceUrl,
        ...(alternative ? { elective: true } : {}),
      };
    } else {
      curriculum.additionalCourses.push({
        id: sourceOnlyId(identity), sourceCourseId: sourceOnlyId(identity), name, credits,
        requirementId: sourceOnlyRequirements[identity], periodLabel: "Materias de la currícula sugerida",
        catalogRole: "official-source-only-course", availabilityStatus: "curricular-guide-not-current-offer",
        ...(alternative ? { elective: true } : {}), sourceUrl,
      });
    }
  }
  audit.scope = "Plan 2003 conjunto: dos currículas sugeridas de diez semestres para Montevideo; catálogo curricular verificado parcial; Salto conserva únicamente el primer año documentado.";
  audit.uiNotice = "Plan 2003 flexible de 450 créditos. Elegí entre las dos currículas sugeridas: base de Matemática y Física de Química o de Ingeniería. Las alternativas de Bioquímica, Nutrición y Gestión no se suman todas como obligatorias. El ingreso y la sede completa son en Montevideo; Salto sólo documenta el primer año.";
  Object.assign(audit.conclusion, {
    trajectoryStatus: "official-trajectory-reproduced",
    trajectorySourceDataPath: sourcePath,
    trajectoryCoverage: "dos variantes oficiales de diez semestres; catálogo parcial cotejado con Bedelías",
    completeDegreeSequence: false,
    trajectoryReviewTrigger: "la Comisión publique una guía revisada, códigos inequívocos o una oferta regional posterior al primer año",
  });
  audit.conclusion.normalization = [
    ...audit.conclusion.normalization.filter((line) => !/una sola trayectoria flexible|389 entradas|inventar semestres|Presentar las dos guías sugeridas|Publicar sólo materias verificadas por la guía/i.test(line)),
    "Presentar las dos guías sugeridas de diez semestres para el mismo Plan 2003, sin sumar alternativas como obligatorias simultáneas.",
    "Publicar sólo materias verificadas por la guía; retener las demás entradas de Bedelías como candidatas hasta cotejo oficial.",
  ];
  audit.remainingWork = "Aprobar currículo individual, cotejar códigos no publicados y materias optativas fuera de las dos guías, verificar vigencia y oferta semestral. Salto sólo acredita primer año; no extender allí la grilla completa.";
  const sources = new Map(audit.sources.map((item) => [item.url, item]));
  for (const key of ["fq", "fing"]) {
    const item = source.sources[key];
    sources.set(item.url, {
      url: item.url, authority: source.authority, reviewedAt: source.reviewedAt,
      contentHash: `sha256:${item.sha256}`,
      supports: [`currícula sugerida con Matemática y Física de ${key === "fq" ? "FQ" : "FING"}`, "diez semestres", "tres grupos de alternativas"],
    });
  }
  sources.set(source.careerPage, { url: source.careerPage, authority: source.authority, reviewedAt: source.reviewedAt,
    supports: ["enlace institucional a ambas currículas y al Plan 2003"] });
  audit.sources = [...sources.values()];
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);

  const reviews = await readJson(reviewsPath);
  const review = {
    planId, state: "official-trajectory-reproduced", reviewedAt: source.reviewedAt,
    effectiveAt: "guías institucionales enlazadas al 22/10/2026; sin fecha de aprobación impresa",
    projectionMechanism: "official-profiles",
    scope: { territories: ["Montevideo"], pathwayIds: trajectories.map(({ id }) => id),
      coverage: "dos currículas sugeridas de diez semestres; catálogo parcial", completeDegreeSequence: false },
    sources: ["fq", "fing"].map((key) => ({ authority: source.authority, url: source.sources[key].url,
      reviewedAt: source.reviewedAt, role: `guía ${key.toUpperCase()} cotejada visualmente`, contentHash: `sha256:${source.sources[key].sha256}` })),
    evidence: { kind: "audited-projection", sourceDataPath: sourcePath, projectionDataPath: projectionPath,
      sourceCollection: "auditedPathways", projectionCollection: "publishedPathways",
      periodField: "periods", compareCoursePlacements: true, partial: true,
      completeDegreeSequence: false, reviewTrigger: "revisión de las guías oficiales o nuevos códigos verificados" },
    conflictNotes: source.limits,
  };
  const index = reviews.reviews.findIndex(({ planId: id }) => id === planId);
  if (index < 0) reviews.reviews.push(review); else reviews.reviews[index] = review;
  await writeJsonIfChanged(reviewsPath, reviews);

  await buildAndWriteAuditQueue();
  await buildExtractedAcademicPlans();
  await buildAndWriteUiCurriculumQueue();
  const inventory = await buildOfficialTrajectoryInventory();
  const projection = await readJson(projectionPath);
  const entry = inventory.plans.find(({ planId: id }) => id === planId);
  assert.equal(entry.state, "official-trajectory-reproduced");
  assert.equal(entry.evidence.expectedCoursePlacements, entry.evidence.matchedCoursePlacements);
  for (const pathway of trajectories) {
    assert.equal(projection.publishedPathways[pathway.id].periods.length, 10);
    assert.equal(projection.publishedPathways[pathway.id].campusIds.join(), "montevideo");
  }
  console.log("Ingeniería de Alimentos 2003: dos guías oficiales de diez semestres regeneradas sin red.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildIngenieriaAlimentos2003();
