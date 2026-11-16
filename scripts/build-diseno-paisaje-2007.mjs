import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = new URL("../", import.meta.url);
const sourcePath = "data/bedelias/audits/diseno-paisaje-2007-semester-evidence.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const read = async (file) => JSON.parse(await readFile(new URL(file, root), "utf8"));
async function save(file, data) {
  const url = new URL(file, root);
  const original = await readFile(url, "utf8");
  const content = JSON.stringify(data, null, 2) + "\n";
  if (original.replaceAll("\r\n", "\n") === content) return;
  const temp = new URL(url.href + ".paisaje.tmp");
  await writeFile(temp, original.includes("\r\n") ? content.replaceAll("\n", "\r\n") : content);
  await rename(temp, url);
}

const { auditedPathways: previous, ...source } = await read(sourcePath);
const { semesters, annual } = source;
const hash = createHash("sha256").update(JSON.stringify({ semesters, annual })).digest("hex");
assert.equal(source.normalizedRowsHash, `sha256:${hash}`);
const projectionPath = `app/data/bedelias-generated/${source.planId}.json`;
const registry = await read(auditPath);
const reviews = await read(reviewsPath);
const audit = registry.audits.find(({ identity }) => identity === source.identity);
const requirementIds = {
  transversal: "transversal-introduction", science: "science-technology",
  project: "project-practice", theory: "theory-history",
};
const blocks = [...semesters.map(({ number, rows }) => ({
  label: `Semestre ${number}`, rows, key: `s${number}`,
})), {
  label: "Semestres 7 y 8 · Proyecto Final anual", rows: [annual.row], key: "proyecto",
}].map(({ label, rows, key }) => ({
  label,
  rows: rows.map(([name, credits, axis, code], index) => ({
    id: code ?? `malla-2007-${key}-${index + 1}`,
    name, credits, requirementId: requirementIds[axis], periodLabel: label,
    sourceUrl: name === "Diseño de Paisaje V" ? source.sources.fagroGrid : source.sources.faduMap,
    technical: Boolean(code),
  })),
}));
const rows = blocks.flatMap((block) => block.rows);
assert.equal(rows.length, 29);
assert.equal(new Set(rows.map(({ id }) => id)).size, 29);
assert.equal(rows.reduce((sum, row) => sum + row.credits, 0), source.minimumCredits.core);
assert.equal(source.minimumCredits.total, audit.officialPlan.minimumCredits);
const technical = rows.filter((row) => row.technical);
const additional = rows.filter((row) => !row.technical);
const periods = blocks.map(({ label, rows: blockRows }) => ({ label, courseIds: blockRows.map(({ id }) => id) }));
const notice = "Referencia de ocho semestres para Maldonado basada en el mapa de FADU y la grilla de Fagro. El Proyecto Final anual abarca séptimo y octavo y se cuenta una vez. La referencia suma 310 créditos; los 50 créditos optativos y electivos no tienen semestre fijo ni catálogo completo verificado. La Comisión de Carrera valida el currículo individual. Esta secuencia no garantiza la oferta de cursos ni sustituye el plan aprobado.";
Object.assign(audit.officialPlan.curriculum, {
  sourceUrl: source.sources.faduMap, sourceDataPath: sourcePath, strictOfficialCourseIds: true,
  preserveBedeliasCourseIds: true, usePublishedCredits: true,
  periodOrder: periods.map(({ label }) => label),
  verifiedCourseIds: technical.map(({ id }) => id),
  courseOverrides: Object.fromEntries(technical.map(({ id, name, credits, periodLabel, requirementId, sourceUrl }) =>
    [id, { name, credits, periodLabel, requirementId, creditSourceUrl: sourceUrl,
      preserveName: true, officialIdentity: true, officialCredits: true }])),
  additionalCourses: additional.map(({ id, name, credits, requirementId, periodLabel, sourceUrl }) =>
    ({ id, name, credits, requirementId, periodLabel, sourceUrl })),
  projectionAnomalies: source.discrepancies,
});
audit.officialPlan.trajectories = [{
  id: "bedelias", label: "Referencia curricular", description: notice,
  periods, useOnlyConfiguredPeriods: true, restrictGeneratedCatalogToPublished: true,
}];
audit.reviewedAt = source.consultedAt;
audit.scope = "Plan 2007 en Maldonado; malla de referencia y mínimos por eje, sin catálogo optativo nominal verificado";
audit.uiNotice = notice;
audit.remainingWork = "Confirmar códigos ambiguos y optativas nominales, y revisar una eventual actualización del plan.";
if (!audit.sources.some(({ url }) => url === source.sources.faduMap)) audit.sources.push({
  url: source.sources.faduMap, authority: "FADU, Udelar",
  supports: ["ubicaciones y créditos del mapa curricular", "Proyecto Final anual", "50 créditos optativos y electivos"],
});
Object.assign(audit.conclusion, {
  trajectoryStatus: "official-trajectory-reproduced", trajectorySourceDataPath: sourcePath,
  trajectoryCoverage: "ocho semestres; 29 unidades, incluido un proyecto anual; flexibles sin catálogo verificado",
  normalization: [
    "Mostrar Plan 2007 y conservar el ID técnico 2008, un título, una sede y un progreso.",
    "Usar la referencia FADU de ocho semestres complementada por Diseño de Paisaje V de la grilla de Fagro.",
    "Conservar las variantes técnicas sin publicar ni inferir equivalencias; contabilizar el Proyecto Final 7.º–8.º una vez.",
    "Conservar los 360 créditos y los mínimos operativos 6+101+160+43+50; exigir validación de la Comisión de Carrera.",
    "No tratar la referencia como una lista de obligaciones individuales ni como la oferta efectiva.",
  ],
});
const auditedPathways = [{ id: "bedelias", periods: periods.map(({ label, courseIds }) => ({
  label, courseIds: courseIds.map((id) => `cure-${id.toLowerCase()}`),
})) }];
assert.deepEqual(previous ?? auditedPathways, auditedPathways);
reviews.reviews = [...reviews.reviews.filter(({ planId }) => planId !== source.planId), {
  planId: source.planId, state: "official-trajectory-reproduced", reviewedAt: source.consultedAt,
  effectiveAt: "mapa FADU 2022 enlazado desde la ficha vigente y grilla publicada por Fagro",
  projectionMechanism: "official-periods",
  scope: { territories: ["Maldonado"], pathwayIds: ["bedelias"], completeDegreeSequence: false },
  sources: [
    { url: source.sources.faduMap, authority: "FADU, Udelar", reviewedAt: source.consultedAt,
      role: "28 filas, ubicación y créditos del Proyecto Final, 50 flexibles; huella del cotejo normalizado",
      contentHash: source.normalizedRowsHash },
    { url: source.sources.fagroGrid, authority: "Facultad de Agronomía, Udelar", reviewedAt: source.consultedAt,
      role: "mismo plan aprobado en 2007, Diseño de Paisaje V en sexto" },
  ],
  evidence: { kind: "audited-projection", sourceDataPath: sourcePath, projectionDataPath: projectionPath,
    sourceCollection: "auditedPathways", projectionCollection: "publishedPathways", periodField: "periods",
    compareCoursePlacements: true, partial: true, completeDegreeSequence: false },
  conflictNotes: source.discrepancies,
}];
registry.contentHash = officialAuditRegistryHash(registry);
await save(sourcePath, { ...source, auditedPathways });
await save(auditPath, registry);
await save(reviewsPath, reviews);
await buildAndWriteAuditQueue();
await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const projection = await read(projectionPath);
assert.deepEqual(projection.publishedPathways.bedelias.periods, auditedPathways[0].periods);
const inventory = await buildOfficialTrajectoryInventory();
assert.equal(inventory.plans.find(({ planId }) => planId === source.planId).state, "official-trajectory-reproduced");
