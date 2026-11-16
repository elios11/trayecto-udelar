import assert from "node:assert/strict";
import { readFile, rename, writeFile } from "node:fs/promises";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";
import { buildNotariadoEvidenceValidation } from "./verify-notariado-2016-evidence.mjs";
import { buildNotariadoCrosswalk } from "./build-notariado-2016-crosswalk.mjs";

const root = new URL("../", import.meta.url);
const read = async (p) => JSON.parse(await readFile(new URL(p, root), "utf8"));
async function save(p, data) {
  const target = new URL(p, root);
  const previous = await readFile(target, "utf8");
  const content = JSON.stringify(data, null, 2) + "\n";
  if (previous.replaceAll("\r\n", "\n") === content) return;
  const temp = new URL(target.href + ".tmp");
  await writeFile(temp, previous.includes("\r\n") ? content.replaceAll("\n", "\r\n") : content);
  await rename(temp, target);
}
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewPath = "data/official-trajectories/reviews.json";
const sourcePath = "data/fder/notariado-2016-curricular-rows.json";
const projectionPath = "app/data/bedelias-generated/bedelias-fder-notariado-2016.json";
const source = await read(sourcePath);
const evidence = await read("data/fder/notariado-2016-evidence.json");
const technical = await read("data/fder/notariado-2016-technical-evidence.json");
const registry = await read(auditPath);
const audit = registry.audits.find(({ identity }) => identity === "notariado:2016");
assert.equal(source.planId, evidence.planId);
assert.equal(source.rows.length, 57);
const keys = ["socio", "publico", "privado", "social", "practica", "flexibles"];
const creditRequirements = Object.entries(audit.officialPlan.currentMinimumCreditsByArea)
  .map(([name, minCredits], i) => ({ id: keys[i], name, shortName: name, minCredits }));
const periods = evidence.sourcePortion.semesterCredits.map((credits, i) => {
  const rows = source.rows.filter((r) => r.semester === i + 1);
  assert.equal(rows.reduce((sum, r) => sum + r.credits, 0), credits);
  return {label: `Semestre ${i + 1}`, courseIds: rows.map(r => r.bedeliasCode ?? r.id)};
});
const id = "grilla-notariado-2016";
const notice = "Grilla oficial de diez semestres. Las cifras por área no coinciden con los subtotales y requieren revisión de Facultad de Derecho. Los cupos flexibles no garantizan oferta. Quienes aprobaron el Seminario de Derecho Público antes de 2025 no deben cursar la Parte 2.";
const conflicts = [
  "Obligaciones y Contratos: 16 por áreas frente a 14 de curso; Seminario Público Parte 1: 3 frente a 2. Ambas filas computan sólo al total del plan.",
  "Las sumas por área de las filas, el pie de la grilla y los mínimos aprobados discrepan. Las cargas no se prorratean; se requiere la validación de Facultad de Derecho.",
  "Registral conserva las dos identidades de fuente y sus cargas publicadas sin asociarlas a los códigos técnicos de carga invertida.",
  technical.cohortRule.rule,
];
const sourceUrl = source.sourceUrl;
const trajectories = [{id, label:"Grilla oficial de Notariado", description:notice,
  campusIds:["montevideo","salto"], useOnlyConfiguredPeriods:true, restrictGeneratedCatalogToPublished:true, periods}];
function areaFields(row) {
  const allocations = row.areaAllocationStatus === "source-consistent" ? row.printedAreaCredits : {"plan-total":row.credits};
  const [requirementId, ...additionalRequirementIds] = Object.keys(allocations);
  return {requirementId, additionalRequirementIds, allocationCreditOverrides:allocations};
}
const courseOverrides = {}, additionalCourses = [];
for (const row of source.rows) {
  const flexible = row.kind === "flexible-slot";
  const fields = {name:row.name, credits:row.credits, periodLabel:`Semestre ${row.semester}`, ...areaFields(row)};
  if (row.bedeliasCode) courseOverrides[row.bedeliasCode] = {...fields, preserveName:true, officialIdentity:true, officialCredits:true};
  else additionalCourses.push({...fields, id:row.id, sourceCourseId:row.id,
    curricularBlock:flexible, elective:flexible, sourceUrl,
    catalogRole:flexible ? "official-flexible-slot" : "official-source-only-course"});
}
audit.scope = "plan, sedes y grilla semestral oficial; identificación técnica parcial";
audit.reviewedAt = source.reviewedAt;
audit.uiNotice = notice;
audit.officialPlan.trajectories = trajectories;
audit.officialPlan.curriculum = {
  sourceUrl, sourceDataPath:sourcePath, useBedeliasCompositionTree:true,
  preserveBedeliasCourseIds:true, usePublishedCredits:true, strictOfficialCourseIds:true,
  includeAllCoursesInPathwayCatalog:false, verifiedCourseIds:Object.keys(courseOverrides),
  courseOverrides, additionalCourses, creditRequirements, projectionAnomalies:conflicts,
  manualCompletionValidation:"Validación de requisitos y distribución por áreas con Facultad de Derecho",
  credentials:[
    {id:"bedelias-degree", title:audit.officialPlan.title, minTotalCredits:450, requiredCourseGroupIds:["validacion-final-plan"]},
    {id:"procurador", title:"Procurador", minTotalCredits:160, requiredCourseGroupIds:["validacion-final-plan"]},
  ],
};
Object.assign(audit.conclusion, {trajectoryStatus:"official-trajectory-reproduced", trajectorySourceDataPath:sourcePath,
  trajectoryCoverage:"diez semestres, con correspondencia técnica parcial y validación manual de áreas"});
audit.remainingWork = "Verificar la distribución por áreas con Facultad de Derecho, el catálogo nominal de optativas y las correspondencias técnicas pendientes.";
const reviews = await read(reviewPath);
const review = {planId:source.planId, state:"official-trajectory-reproduced", reviewedAt:source.reviewedAt,
  effectiveAt:"2024-12-27", projectionMechanism:"official-periods",
  scope:{territories:["Montevideo","Salto"], pathwayIds:[id], completeDegreeSequence:false},
  sources:[{url:sourceUrl, authority:source.authority, reviewedAt:source.reviewedAt, role:"grilla de diez semestres",
    contentHash:`sha256:${source.sourcePdfSha256}`}],
  evidence:{kind:"audited-projection", sourceDataPath:sourcePath, projectionDataPath:projectionPath,
    sourceCollection:"auditedPathways", projectionCollection:"publishedPathways", periodField:"periods",
    compareCoursePlacements:true, partial:true, completeDegreeSequence:false},
  conflictNotes:conflicts};
reviews.reviews = [...reviews.reviews.filter(r => r.planId !== source.planId), review];
assert.deepEqual(source.auditedPathways, [{id, periods}]);
registry.contentHash = officialAuditRegistryHash(registry);
await save(auditPath, registry);
await save(reviewPath, reviews);
await buildAndWriteAuditQueue();
await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const entry = inventory.plans.find(p => p.planId === source.planId);
assert.equal(entry.state, "official-trajectory-reproduced");
assert.equal(entry.evidence.matchedCoursePlacements, 57);
await buildNotariadoCrosswalk();
await buildNotariadoEvidenceValidation();
