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
const sourcePath = "data/fcien/biotecnologia-2024-trayectorias.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const projectionPath = "app/data/bedelias-generated/bedelias-fq-licenciatura-en-biotecnologia-2024.json";
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));

async function writeJsonIfChanged(relative, value) {
  const target = path.join(root, relative);
  const previous = await readFile(target, "utf8");
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const next = previous.includes("\r\n") ? content.replace(/\n/g, "\r\n") : content;
  if (previous === next) return;
  const pending = `${target}.d03bm.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(pending, next, "utf8");
  await rename(pending, target);
}

const slug = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Sólo los códigos impresos expresamente en el anexo. Los nombres parecidos
// no acreditan equivalencia con la composición de Bedelías.
const printedCodes = new Map([
  ["cenurln-2024:3:Biología Celular (CBB27)", "CENURLN-CBB27"],
  ["fq-2024:6:Biología Molecular 536X", "536X"],
]);

// La propia fuente nombra la misma actividad de egreso y los mismos cursos
// FING/FQ en más de una puerta de entrada. No unir por similitud general.
const sharedSourceIds = new Map([
  ["trabajo-final-de-grado:30", "biotec-trabajo-final"],
  ["fundamentos-de-ingenieria-de-bioprocesos:10", "biotec-fing-fundamentos-bioprocesos"],
  ["ingenieria-de-bioprocesos:10", "biotec-fing-ingenieria-bioprocesos"],
  ["laboratorio-de-bioprocesos:10", "biotec-fing-laboratorio-bioprocesos"],
  ["procesos-de-separacion-y-purificacion:10", "biotec-fing-separacion-purificacion"],
  ["legislacion:5", "biotec-fq-legislacion"],
]);

function rowIdentity(pathway, period, row) {
  const [name, credits, kind] = row;
  const code = printedCodes.get(`${pathway.id}:${period.semester}:${name}`);
  if (code) return code;
  const shared = sharedSourceIds.get(`${slug(name)}:${credits}`);
  if (shared) return shared;
  if (kind === "flexible-slot") return `biotec-${pathway.id}-flex-s${period.semester}`;
  return `biotec-${pathway.id}-${slug(name)}-${credits}`;
}

export function verifySource(source, projection) {
  assert.equal(source.planId, "bedelias-fq-licenciatura-en-biotecnologia-2024");
  assert.deepEqual(source.pathways.map(({ id }) => id), ["fcien-2024", "cenurln-2024", "fq-2024"]);
  assert.equal(source.source.documentSha256.length, 64);
  const totals = [];
  const sourceOnly = new Map();
  const technical = new Map();
  for (const pathway of source.pathways) {
    assert.deepEqual(pathway.periods.map(({ semester }) => semester), [1, 2, 3, 4, 5, 6, 7, 8]);
    const placed = new Set();
    for (const period of pathway.periods) {
      assert.equal(period.rows.reduce((sum, row) => sum + row[1], 0), period.publishedCredits);
      for (const row of period.rows) {
        const [name, credits, kind] = row;
        const identity = rowIdentity(pathway, period, row);
        assert.ok(!placed.has(identity), `Identidad duplicada en ${pathway.id}: ${identity}`);
        placed.add(identity);
        if (printedCodes.has(`${pathway.id}:${period.semester}:${name}`)) {
          const matches = projection.courses.filter(({ bedeliasCode }) => bedeliasCode === identity);
          assert.equal(matches.length, 1, `Código técnico ambiguo: ${identity}`);
          assert.equal(matches[0].credits, credits, `Créditos técnicos distintos: ${identity}`);
          technical.set(identity, { name: name.replace(/\s+(?:\(CBB27\)|536X)$/, ""), credits });
          continue;
        }
        const previous = sourceOnly.get(identity);
        if (previous) assert.equal(previous.credits, credits, `Créditos discrepantes: ${identity}`);
        else sourceOnly.set(identity, { id: identity, name, credits, kind, semester: period.semester });
      }
    }
    totals.push(pathway.periods.reduce((sum, period) => sum + period.publishedCredits, 0));
  }
  assert.deepEqual(totals, [357, 360, 360]);
  return { sourceOnly, technical };
}

export async function buildBiotecnologia2024() {
  const source = await readJson(sourcePath);
  const previous = await readJson(projectionPath);
  const { sourceOnly, technical } = verifySource(source, previous);
  const registry = await readJson(auditPath);
  const audit = registry.audits.find(({ identity }) => identity === "licenciatura en biotecnologia:2024");
  assert.ok(audit, "Falta la auditoría del Plan 2024");
  const sourceUrl = source.source.documentUrl;
  const description = "Ejemplo institucional de ocho semestres actualizado en febrero de 2024. Es una guía flexible, no una secuencia obligatoria ni una garantía de oferta por sede; los cupos optativos son espacios a completar.";
  const trajectories = source.pathways.map((pathway) => ({
    id: pathway.id,
    label: `Entrada por ${pathway.entry}`,
    description,
    credentialId: "bedelias-degree",
    campusIds: pathway.campusIds,
    useOnlyConfiguredPeriods: true,
    restrictGeneratedCatalogToPublished: true,
    periods: pathway.periods.map((period) => ({
      label: `Semestre ${period.semester}`,
      courseIds: period.rows.map((row) => rowIdentity(pathway, period, row)),
    })),
  }));
  const auditedPathways = trajectories.map(({ id, periods }) => ({ id, periods }));
  if (source.auditedPathways) assert.deepEqual(source.auditedPathways, auditedPathways);
  else {
    source.auditedPathways = auditedPathways;
    await writeJsonIfChanged(sourcePath, source);
  }
  audit.reviewedAt = source.source.reviewedAt;
  audit.scope = "Plan 2024 compartido; tres ejemplos semestrales por puerta de entrada, sin acreditar oferta actual por sede";
  for (const offering of audit.offerings ?? []) {
    if (offering.entryServices?.includes("CENURLN")) offering.trajectoryIds = ["cenurln-2024"];
    else if (offering.entryServices?.includes("FCIEN")) offering.trajectoryIds = ["fcien-2024", "fq-2024"];
  }
  audit.officialPlan.trajectories = trajectories;
  audit.officialPlan.catalogFacultyCodes = ["FQ", "FCIEN", "CENURLN"];
  audit.officialPlan.catalogDefaultTrajectoryIds = {
    FQ: "fq-2024", FCIEN: "fcien-2024", CENURLN: "cenurln-2024",
  };
  audit.officialPlan.curriculum = {
    sourceUrl,
    sourceDataPath: sourcePath,
    useBedeliasCompositionTree: true,
    preserveBedeliasCourseIds: true,
    usePublishedCredits: true,
    strictOfficialCourseIds: true,
    verifiedCourseIds: [...technical.keys()],
    includeAllCoursesInPathwayCatalog: false,
    courseOverrides: Object.fromEntries([...technical].map(([code, { name, credits }]) => [code, {
      name, credits, preserveName: true, periodLabel: "Trayectoria sugerida",
      requirementId: "plan-total", officialIdentity: true, officialCredits: true,
      authorityStatus: "verified",
    }])),
    additionalCourses: [...sourceOnly.values()].map(({ id, name, credits, kind, semester }) => ({
      id, sourceCourseId: id, name, credits, requirementId: "plan-total",
      periodLabel: id.startsWith("biotec-fing-") || id === "biotec-trabajo-final"
        ? "Trayectorias sugeridas" : `Semestre ${semester}`,
      curricularBlock: kind === "flexible-slot" || kind === "alternative-slot",
      elective: kind === "flexible-slot",
      catalogRole: kind === "flexible-slot" ? "official-flexible-slot" : "official-source-only-course",
      sourceUrl, availabilityStatus: "curricular-space-not-current-course-offer",
    })),
  };
  audit.uiNotice = "Trayectorias sugeridas de Biotecnología (2024): tres entradas y ocho semestres orientativos. Los cupos flexibles no son cursos obligatorios ni garantizan oferta. Sólo se muestran filas de la fuente cotejada; la mayoría aún no tiene código técnico inequívoco.";
  Object.assign(audit.conclusion, {
    trajectoryStatus: "official-trajectory-reproduced",
    trajectorySourceDataPath: sourcePath,
    trajectoryCoverage: "tres ejemplos de ocho semestres; FCIEN suma 357 créditos y los otros dos 360",
    completeDegreeSequence: false,
    trajectoryReviewTrigger: "actualización oficial de las trayectorias o identificación técnica de los cursos sólo-fuente",
  });
  audit.remainingWork = "Cotejar códigos y versiones de las filas sin correspondencia inequívoca; verificar oferta efectiva regional y catálogo optativo sin transformar el ejemplo en obligación.";
  const sources = new Map(audit.sources.map((item) => [item.url, item]));
  sources.set(sourceUrl, { url: sourceUrl, authority: source.source.authority,
    reviewedAt: source.source.reviewedAt, contentHash: `sha256:${source.source.documentSha256}`,
    supports: ["tres entradas semestrales de ocho períodos", "filas, créditos y cupos flexibles cotejados visualmente"] });
  audit.sources = [...sources.values()];
  registry.contentHash = officialAuditRegistryHash(registry);
  await writeJsonIfChanged(auditPath, registry);

  const reviews = await readJson(reviewsPath);
  const review = {
    planId: source.planId, state: "official-trajectory-reproduced", reviewedAt: source.source.reviewedAt,
    effectiveAt: "anexo actualizado el 22/02/2024", projectionMechanism: "official-periods",
    scope: { territories: ["Montevideo", "Salto", "Paysandú"], pathwayIds: trajectories.map(({ id }) => id),
      coverage: "tres ejemplos de ocho semestres, sin equivalencia técnica completa ni oferta territorial confirmada",
      completeDegreeSequence: false },
    sources: [{ authority: source.source.authority, url: sourceUrl, reviewedAt: source.source.reviewedAt,
      role: "ejemplos semestrales cotejados visualmente", contentHash: `sha256:${source.source.documentSha256}` }],
    evidence: { kind: "audited-projection", sourceDataPath: sourcePath, projectionDataPath: projectionPath,
      sourceCollection: "auditedPathways", projectionCollection: "publishedPathways",
      periodField: "periods", compareCoursePlacements: true, partial: true,
      completeDegreeSequence: false, reviewTrigger: "revisión institucional o correspondencias técnicas adicionales" },
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
  assert.deepEqual(Object.keys(projection.publishedPathways), source.pathways.map(({ id }) => id));
  console.log("Biotecnología 2024: tres ejemplos semestrales y catálogo de fuente parcial regenerados sin red.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildBiotecnologia2024();
