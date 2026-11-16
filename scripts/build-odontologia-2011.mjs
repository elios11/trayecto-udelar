import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = new URL("../", import.meta.url);
const sourcePath = "data/bedelias/audits/odontologia-2011-semester-evidence.json";
const registryPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const read = async (file) => JSON.parse(await readFile(new URL(file, root), "utf8"));
async function save(file, data) {
  const target = new URL(file, root);
  const old = await readFile(target, "utf8");
  const content = JSON.stringify(data, null, 2) + "\n";
  if (old.replaceAll("\r\n", "\n") === content) return;
  const temp = new URL(target.href + ".odon.tmp");
  await writeFile(temp, old.includes("\r\n") ? content.replaceAll("\n", "\r\n") : content);
  await rename(temp, target);
}
const { auditedPathways: previous, ...source } = await read(sourcePath);
const { periods, finalWork, optatives } = source;
const hash = createHash("sha256").update(JSON.stringify({ periods, finalWork, optatives })).digest("hex");
assert.equal(source.normalizedRowsHash, `sha256:${hash}`);
const snapshot = await read(source.bedeliasSnapshot);
const byCode = new Map(snapshot.plan.courses.map((course) => [course.code, course]));
const registry = await read(registryPath);
const reviews = await read(reviewsPath);
const projectionPath = `app/data/bedelias-generated/${source.planId}.json`;
const audit = registry.audits.find(({ identity }) => identity === source.identity);
const curriculum = audit.officialPlan.curriculum;
const group = curriculum.requiredCourseGroups.find(({ id }) => id === "odontologia-nucleo-troncal");
const blocks = periods.map(({ semesters, courseCodes }) => ({
  label: semesters.length === 1 ? `Semestre ${semesters[0]}` : `Semestres ${semesters.join(" y ")}`,
  courseIds: courseCodes,
}));
blocks.push({ label: "Trabajo Final · desde cuarto año, sin semestre fijo", courseIds: [finalWork.code] });
const coreCodes = blocks.flatMap(({ courseIds }) => courseIds);
assert.equal(coreCodes.length, 40);
assert.equal(new Set(coreCodes).size, 40);
assert.equal(coreCodes.reduce((sum, code) => sum + byCode.get(code).credits, 0), source.minimumCredits.core);
const notice = "Plan 2011 de once semestres y 495 créditos en Montevideo: 40 unidades troncales (465 créditos) y 30 créditos flexibles. Las clínicas que abarcan dos semestres se muestran una sola vez. El Trabajo Final es obligatorio y se puede iniciar desde cuarto año, sin semestre fijo. Las optativas publicadas no garantizan oferta en un período particular. Si cursaste Iniciación a la Investigación con el código 1601, confirmá su reconocimiento con Facultad; para ingreso 2026 figura 1600.";
const conflicts = [
  "La malla histórica no prevalece sobre el Reglamento 2025: Pasantía 2 se ubica en 10.º y Pasantía 3 en 11.º; el Trabajo Final no se vuelve una actividad exclusiva del semestre 11.",
  "Iniciación a la Investigación Científica: inscripción 2026 publica 1600, no 1601. No se declara equivalencia ni se migra progreso.",
  "Encerado de Diagnóstico (4049) tiene 7 créditos y Taller Trabajo Final (4070) tiene 4 según Facultad; Bedelías registra 6 para ambos.",
  "Tres optativas figuran en la malla sin correspondencia Bedelías inequívoca. No se promueven las electivas externas sólo presentes en Bedelías.",
];
const overrides = curriculum.courseOverrides;
for (const { prior, current } of source.priorAuditCodeConflicts) {
  const requirementId = "odontologia-general-academica";
  overrides[prior] = { credits: 0, requirementId: "odontologia-flexible", periodLabel: "Versiones anteriores" };
  overrides[current] = { ...overrides[current], name: "Iniciación a la Investigación Científica",
    preserveName: true, credits: byCode.get(current).credits, requirementId };
}
for (const block of blocks) for (const code of block.courseIds) {
  overrides[code] = { ...overrides[code], periodLabel: block.label, officialIdentity: true,
    officialCredits: code === finalWork.code };
}
overrides[finalWork.code] = { ...overrides[finalWork.code], name: "Trabajo Final de Carrera",
  preserveName: true, credits: finalWork.credits, creditSourceUrl: source.sources.regulation };
const flex = "odontologia-flexible";
const optativeLabel = "Optativas publicadas por Facultad";
const optionalIds = optatives.map(([name, credits, code], index) => {
  if (!code) return `optativa-malla-2011-${index + 1}`;
  const creditConflict = source.optativeCreditConflicts[code];
  overrides[code] = { name, credits, preserveName: true, officialIdentity: true, officialCredits: true,
    requirementId: flex, periodLabel: optativeLabel, elective: true, creditSourceUrl: source.sources.mainGrid,
    ...(creditConflict ? { creditConflict: `Facultad: ${creditConflict.malla}; Bedelías: ${creditConflict.bedelias}.` } : {}) };
  return code;
});
const referenced = [...coreCodes, ...optionalIds];
assert.equal(new Set(referenced).size, 60);
Object.assign(curriculum, {
  sourceDataPath: sourcePath, strictOfficialCourseIds: true, preserveBedeliasCourseIds: true,
  includeAllCoursesInPathwayCatalog: true,
  verifiedCourseIds: referenced.filter((code) => byCode.has(code)),
  additionalCourses: optatives.flatMap(([name, credits, code], index) => code ? [] : [{
    id: optionalIds[index], name, credits, sourceUrl: source.sources.mainGrid,
    requirementId: flex, elective: true, periodLabel: optativeLabel,
  }]),
  periodOrder: [...blocks.map(({ label }) => label), optativeLabel],
  projectionAnomalies: conflicts,
});
Object.assign(group, { sourceCourseIds: coreCodes, minCompleted: 40 });
audit.officialPlan.trajectories = [{
  id: "bedelias", label: "Malla oficial", description: "Núcleo del Plan 2011 por semestre y por tramo anual, con 20 optativas fuera de los períodos fijos.",
  credentialId: "doctor-odontologia", periods: blocks, catalogSourceCourseIds: optionalIds,
  useOnlyConfiguredPeriods: true, restrictGeneratedCatalogToPublished: true,
}];
audit.reviewedAt = source.consultedAt;
audit.scope = "Plan 2011 en Montevideo: periodización respaldada, requisitos y catálogo institucional parcial";
audit.uiNotice = notice;
for (const key of ["regulation", "admissions2026", "successor"]) {
  if (!audit.sources.some(({ url }) => url === source.sources[key])) audit.sources.push({
    url: source.sources[key], authority: source.authority, supports: [key === "regulation"
      ? "ubicación de pasantías, Trabajo Final y créditos flexibles"
      : key === "admissions2026" ? "identidades publicadas para el ingreso 2026" : "plan sucesor anunciado; no prueba transición"],
  });
}
audit.anomalies = audit.anomalies.filter(({ field }) => field !== "duplicateVersions");
audit.anomalies.push({ field: "duplicateVersions", resolution: conflicts[1] });
Object.assign(audit.conclusion, {
  trajectoryStatus: "official-trajectory-reproduced", trajectorySourceDataPath: sourcePath,
  trajectoryCoverage: "once semestres, un Trabajo Final sin período fijo y lista parcial de optativas",
  normalization: [
    "Conservar una única carrera y los IDs de plan, progreso, trayectoria y título.",
    "Reproducir las unidades troncales por semestre o tramo respaldado, sin duplicar clínicas ni pasantías.",
    "Conservar el Trabajo Final de 10 créditos y exigir los 30 créditos flexibles con validación institucional.",
    "Publicar sólo las 20 optativas identificadas; no garantizar oferta futura ni promover candidatos del snapshot.",
    "No inferir equivalencia entre variantes ni migrar el progreso al plan sucesor.",
  ],
});
audit.remainingWork = "Confirmar el plan sucesor y su transición por cohorte, códigos ambiguos y electivas externas.";
const auditedPathways = [{ id: "bedelias", periods: blocks.map(({ label, courseIds }) => ({
  label, courseIds: courseIds.map((code) => `odon-${code.toLowerCase()}`),
})) }];
assert.deepEqual(previous ?? auditedPathways, auditedPathways);
reviews.reviews = [...reviews.reviews.filter(({ planId }) => planId !== source.planId), {
  planId: source.planId, state: "official-trajectory-reproduced", reviewedAt: source.consultedAt,
  effectiveAt: "malla institucional del Plan 2011, reglamento de octubre de 2025 y códigos de ingreso 2026",
  projectionMechanism: "official-periods",
  scope: { territories: ["Montevideo"], pathwayIds: ["bedelias"], completeDegreeSequence: false },
  sources: [
    { url: source.sources.mainGrid, authority: source.authority, reviewedAt: source.consultedAt,
      role: "núcleo y lista de optativas; huella de filas normalizadas cotejadas",
      contentHash: source.normalizedRowsHash },
    { url: source.sources.regulation, authority: source.authority, reviewedAt: source.consultedAt,
      role: "pasantías en semestres 10 y 11, Trabajo Final y 30 créditos flexibles" },
  ],
  evidence: { kind: "audited-projection", sourceDataPath: sourcePath, projectionDataPath: projectionPath,
    sourceCollection: "auditedPathways", projectionCollection: "publishedPathways", periodField: "periods",
    compareCoursePlacements: true, partial: true, completeDegreeSequence: false },
  conflictNotes: conflicts,
}];
registry.contentHash = officialAuditRegistryHash(registry);
await save(sourcePath, { ...source, auditedPathways });
await save(registryPath, registry);
await save(reviewsPath, reviews);
await buildAndWriteAuditQueue();
await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const projection = await read(projectionPath);
const pathway = projection.publishedPathways.bedelias;
assert.deepEqual(pathway.periods, auditedPathways[0].periods);
assert.equal(pathway.catalogCourseIds.length, 20);
const inventory = await buildOfficialTrajectoryInventory();
assert.equal(inventory.plans.find(({ planId }) => planId === source.planId).state, "official-trajectory-reproduced");
