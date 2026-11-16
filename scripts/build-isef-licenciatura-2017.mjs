import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = new URL("../", import.meta.url);
const sourcePath = "data/bedelias/audits/isef-licenciatura-2017-semester-evidence.json";
const registryPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const planId = "bedelias-isef-licenciatura-en-educacion-fisica-2017";
const projectionPath = `app/data/bedelias-generated/${planId}.json`;
const read = async (file) => JSON.parse(await readFile(new URL(file, root), "utf8"));
async function save(file, data) {
  const target = new URL(file, root);
  const original = await readFile(target, "utf8");
  const content = JSON.stringify(data, null, 2) + "\n";
  if (original.replaceAll("\r\n", "\n") === content) return;
  const temp = new URL(target.href + ".isef.tmp");
  await writeFile(temp, original.includes("\r\n") ? content.replaceAll("\n", "\r\n") : content);
  await rename(temp, target);
}

const { auditedPathways: previous, ...source } = await read(sourcePath);
const crosswalk = source.bedeliasCrosswalk;
const registry = await read(registryPath);
const reviews = await read(reviewsPath);
const audit = registry.audits.find(({ identity }) => identity === source.identity);
const snapshot = await read(crosswalk.snapshot);
const bedelias = new Map(snapshot.plan.courses.map((course) => [course.code, course]));
const common = source.common.flatMap((rows, index) => rows.map((name, column) => {
  const semester = index + 1;
  const code = crosswalk.commonCodes[index][column];
  if (code) return { code, name, semester, requirementId: "tronco" };
  const row = crosswalk.unresolvedCommon.find((entry) => entry.semester === semester && entry.index === column);
  assert.ok(row);
  return { code: `malla-2017-s${semester}-${column + 1}`, name, semester, requirementId: "tronco",
    credits: row.credits, sourceUrl: source.sources[row.source], sourceOnly: true };
}));
for (const [[semester], name] of source.annualCommon) {
  const code = crosswalk.annualCodes[semester === 5 ? 0 : 1];
  common.push({ code, name, semester, requirementId: "tronco" });
}
const choiceRows = source.deporteChoice.rows.map(([semester, name, credits], index) => ({
  semester, name, credits, code: crosswalk.deporteChoiceCodes[index],
  requirementId: "modalidades-deporte", choice: true,
}));
const optionRows = Object.fromEntries(Object.entries(source.options).map(([id, rows]) => [id,
  rows.map(([semester, name, credits], index) => ({
    semester: name === "Seminario" ? crosswalk.seminarioSemesters[0] : semester,
    name: name === "Seminario" ? `Seminario · ${audit.officialPlan.trajectories.find((item) => item.id === id).label}` : name,
    credits, code: crosswalk.optionCodes[id][index], requirementId: `${id}-fijas`,
  })),
]));
const rows = [...common, ...Object.values(optionRows).flat(), ...choiceRows];
assert.equal(new Set(rows.map(({ code }) => code)).size, 64);
const notice = "Malla oficial ISEF de ocho semestres. Las dos prácticas profesionales y el Seminario son anuales: se muestran una sola vez, al inicio del tramo. El egreso requiere además 30 créditos optativos o electivos, sujetos a validación institucional. Salud en Maldonado figura como perfil en CURE, pero la guía de ISEF no confirma su oferta allí: consultá a la sede.";
const label = (semester) => `Semestre ${semester}`;
const trajectories = audit.officialPlan.trajectories.map(({ id, label: title }) => {
  const placed = [...common, ...optionRows[id], ...(id === "deporte" ? choiceRows : [])];
  return {
    id, label: title, credentialId: id === "deporte" ? "bedelias-degree" : `bedelias-degree-${id}`,
    description: id === "deporte"
      ? "Opción Deporte: además de sus cinco cursos fijos, elegí cuatro de las siete modalidades de sexto a octavo (24 créditos en total). No hay un cupo por semestre."
      : `Opción ${title}, con 60 créditos específicos.`,
    periods: Array.from({ length: 8 }, (_, index) => {
      const periodRows = placed.filter(({ semester }) => semester === index + 1);
      const choiceCourseIds = periodRows.filter(({ choice }) => choice).map(({ code }) => code);
      return { label: label(index + 1), courseIds: periodRows.map(({ code }) => code),
        ...(choiceCourseIds.length ? { choiceCourseIds } : {}) };
    }),
  };
});

const planUrl = audit.sources[0].url;
const creditRequirements = [{ id: "tronco", name: "Tronco común", shortName: "Común", minCredits: 270 },
  ...trajectories.map(({ id, label: title }) => ({
    id: `${id}-fijas`, name: `Unidades fijas · ${title}`, shortName: title,
    minCredits: id === "deporte" ? 36 : 60,
  })),
  { id: "modalidades-deporte", name: "Cuatro modalidades deportivas a elegir", shortName: "Modalidades", minCredits: 24 },
];
const group = (id, title, items, minCompleted = items.length) => ({
  id, label: title, sourceCourseIds: items.map(({ code }) => code), minCompleted, sourceUrl: source.sources.options,
});
const requiredCourseGroups = [
  group("tronco-comun", "Unidades del tronco común", common),
  ...trajectories.map(({ id, label: title }) => group(`fijas-${id}`, `Unidades fijas · ${title}`, optionRows[id])),
  group("cuatro-modalidades", "Cuatro de las siete modalidades deportivas", choiceRows, 4),
];
const conflicts = [
  "Educación Física y Prácticas Corporales (OPC01): 10 créditos en el programa y la guía oficial; 12 en Bedelías.",
  "Salud en Maldonado: CURE lista el perfil, pero la guía ISEF no indica dictado allí. Se conserva el perfil consultable con aviso, no una promesa de oferta.",
  "Dos materias del primer semestre se conservan sin código Bedelías por ambigüedad de identidades. No se mapea el historial por semejanza.",
];
audit.scope = "plan, sedes, ocho semestres y cuatro opciones oficiales; catálogo flexible no verificado";
audit.reviewedAt = source.consultedAt;
audit.uiNotice = notice;
audit.officialPlan.trajectories = trajectories;
audit.officialPlan.curriculum = {
  useBedeliasCompositionTree: true, usePublishedCredits: true, strictOfficialCourseIds: true,
  deduplicateSharedProfileCourses: true, preserveBedeliasCourseIds: true,
  sourceUrl: source.sources.programs, sourceDataPath: sourcePath,
  verifiedCourseIds: rows.filter((row) => !row.sourceOnly).map(({ code }) => code),
  courseOverrides: Object.fromEntries(rows.filter((row) => !row.sourceOnly).map((row) => {
    assert.ok(bedelias.has(row.code), row.code);
    const conflict = crosswalk.creditConflicts[row.code];
    return [row.code, {
      name: row.name, credits: row.credits ?? bedelias.get(row.code).credits, preserveName: true,
      officialIdentity: true, officialCredits: row.credits !== undefined, periodLabel: label(row.semester),
      requirementId: row.requirementId,
      ...(row.choice ? { elective: true } : {}),
      ...(conflict ? { creditSourceUrl: source.sources[conflict.source],
        creditConflict: `ISEF: ${conflict.official}; Bedelías: ${conflict.bedelias}.` } : {}),
    }];
  })),
  additionalCourses: rows.filter((row) => row.sourceOnly).map((row) => ({
    id: row.code, name: row.name, credits: row.credits, sourceUrl: row.sourceUrl,
    periodLabel: label(row.semester), requirementId: row.requirementId,
  })),
  creditRequirements, requiredCourseGroups, projectionAnomalies: conflicts,
  manualCompletionValidation: "Confirmación institucional de los 30 créditos optativos o electivos y requisitos de egreso",
  credentials: trajectories.map(({ id, credentialId }) => ({
    id: credentialId, title: audit.officialPlan.title, minTotalCredits: 360, sourceUrl: planUrl,
    nodeRequirements: creditRequirements.filter(({ id: nodeId }) => nodeId === "tronco"
      || nodeId === `${id}-fijas` || (id === "deporte" && nodeId === "modalidades-deporte"))
      .map(({ id: nodeId, minCredits }) => ({ nodeId, minCredits })),
    requiredCourseGroupIds: ["tronco-comun", `fijas-${id}`, "validacion-final-plan",
      ...(id === "deporte" ? ["cuatro-modalidades"] : [])],
  })),
};
Object.assign(audit.conclusion, { trajectoryStatus: "official-trajectory-reproduced",
  trajectorySourceDataPath: sourcePath, trajectoryCoverage: "ocho semestres y cuatro opciones; créditos flexibles sin secuencia nominal verificada" });
audit.remainingWork = "Verificar catálogo optativo/electivo y oferta efectiva de Salud en Maldonado.";
const auditedPathways = trajectories.map(({ id, periods }) => ({ id, periods: periods.map(({ label: period, courseIds }) => ({
  label: period, courseIds: courseIds.map((code) => `isef-${code.toLowerCase()}`),
})) }));
assert.deepEqual(previous ?? auditedPathways, auditedPathways);
const evidence = {
  planId, state: "official-trajectory-reproduced", reviewedAt: source.consultedAt,
  effectiveAt: "programas publicados para el Plan 2017 y reforma de Seminario 2025",
  projectionMechanism: "official-periods",
  scope: { territories: ["Montevideo", "Maldonado", "Paysandú"], pathwayIds: trajectories.map(({ id }) => id),
    completeDegreeSequence: false },
  sources: [{ url: source.sources.programs, authority: source.authority, reviewedAt: source.consultedAt,
    role: "orden por semestre; opciones, cargas y alcances cotejados en la fuente curada",
    contentHash: `sha256:${createHash("sha256").update(JSON.stringify(source)).digest("hex")}` }],
  evidence: { kind: "audited-projection", sourceDataPath: sourcePath, projectionDataPath: projectionPath,
    sourceCollection: "auditedPathways", projectionCollection: "publishedPathways", periodField: "periods",
    compareCoursePlacements: true, partial: true, completeDegreeSequence: false },
  conflictNotes: conflicts,
};
reviews.reviews = [...reviews.reviews.filter((review) => review.planId !== planId), evidence];
registry.contentHash = officialAuditRegistryHash(registry);
await save(sourcePath, { ...source, auditedPathways });
await save(registryPath, registry);
await save(reviewsPath, reviews);
await buildAndWriteAuditQueue();
await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const projection = await read(projectionPath);
const verified = projection.courses.filter(({ authorityStatus, id }) => authorityStatus === "verified"
  && id !== "isef-validacion-final-plan");
assert.equal(verified.length, 64);
assert.deepEqual(Object.entries(projection.publishedPathways).map(([id, { periods }]) => ({
  id, periods: periods.map(({ label: period, courseIds }) => ({ label: period, courseIds })),
})), auditedPathways);
const inventory = await buildOfficialTrajectoryInventory();
assert.equal(inventory.plans.find((entry) => entry.planId === planId).state, "official-trajectory-reproduced");
