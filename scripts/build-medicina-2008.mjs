import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";
import "./verify-medicina-2008-grilla.mjs";

const root = new URL("../", import.meta.url);
const read = async (p) => JSON.parse(await readFile(new URL(p, root), "utf8"));
async function save(p, data) {
  const target = new URL(p, root);
  const old = await readFile(target, "utf8");
  const content = JSON.stringify(data, null, 2) + "\n";
  if (old.replaceAll("\r\n", "\n") === content) return;
  const temp = new URL(target.href + ".medicina.tmp");
  await writeFile(temp, old.includes("\r\n") ? content.replaceAll("\n", "\r\n") : content);
  await rename(temp, target);
}
const sourcePath = "data/official-trajectories/medicina-2008-grilla.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewPath = "data/official-trajectories/reviews.json";
const { auditedPathways: previousPathways, ...source } = await read(sourcePath);
const projectionPath = `app/data/bedelias-generated/${source.planId}.json`;
const registry = await read(auditPath);
const reviews = await read(reviewPath);
const audit = registry.audits.find(({ identity }) => identity === "doctor en medicina:2008");
assert.equal(audit.officialPlan.minimumCredits, source.credentials.degree.publishedPlanMinimum);
const [first, second, internship] = ["primer-trienio", "segundo-trienio", "internado"];
const notice = "Grilla oficial de Medicina. Los cursos anuales y el internado se muestran una sola vez. En Litoral Norte, el CIO Salud Trayectoria Medicina en Paysandú se reconoce como primer año; después la carrera es intersede entre Paysandú y Salto. Para egresar se requieren las actas RCPA y RCRP y 60 créditos flexibles (mínimo 15 optativos y 10 electivos), con validación de Facultad. Para el título intermedio se requiere cuarto año completo y 20 flexibles.";
const conflicts = [
  "Clínica Quirúrgica tiene 58 créditos y Metodología Científica 2 tiene 24 en la grilla; ambos registros Bedelías indican 57 y 25.",
  "Los requisitos flexibles y actas de reanimación no están ubicados por semestre. Su cumplimiento debe verificarse con Facultad, sin inferir un mínimo total nuevo.",
];
const periods = source.periods.map(({ semesters, rows }) => ({
  label: semesters.length === 1 ? `Semestre ${semesters[0]}` : `Semestres ${semesters.join(" y ")}`,
  courseIds: rows.map(([code]) => code),
}));
assert.ok(!previousPathways || JSON.stringify(previousPathways) === JSON.stringify([{id:"bedelias", periods}]),
  "La grilla cambió: revisar los períodos auditados antes de regenerar.");
const allCodes = periods.flatMap(p => p.courseIds);
const throughFourth = periods.slice(0, 7).flatMap(p => p.courseIds);
const courseOverrides = Object.fromEntries(source.periods.flatMap(({ semesters, rows }, i) =>
  rows.map(([code, name, credits]) => [code, {
    name, credits, preserveName:true, officialIdentity:true, officialCredits:true,
    periodLabel:periods[i].label,
    requirementId:semesters[0] < 7 ? first : semesters[0] < 13 ? second : internship,
    ...(source.creditConflicts[code] ? {
      creditSourceUrl:source.sources.curriculum,
      creditConflict:`Facultad: ${credits}; Bedelías: ${source.creditConflicts[code].bedelias}.`,
    } : {}),
  }])));
const id = "bedelias"; // Conservar el identificador elegido por perfiles previos.
audit.scope = "plan, oferta intersede, grilla de previaturas de Facultad y requisitos de títulos";
audit.reviewedAt = source.reviewedAt;
audit.uiNotice = notice;
audit.officialPlan.trajectories = [{
  id, label:"Grilla oficial de Medicina", description:notice, periods,
  useOnlyConfiguredPeriods:true, restrictGeneratedCatalogToPublished:true,
}];
const requiredCourseGroups = [
  {id:"medicina-grilla", label:"Unidades de la grilla oficial", minCompleted:allCodes.length, sourceCourseIds:allCodes, sourceUrl:source.sources.curriculum},
  {id:"medicina-hasta-cuarto", label:"Unidades hasta cuarto año inclusive", minCompleted:throughFourth.length, sourceCourseIds:throughFourth, sourceUrl:source.sources.credentials},
];
audit.officialPlan.curriculum = {
  sourceUrl:source.sources.curriculum, sourceDataPath:sourcePath, useBedeliasCompositionTree:true,
  preserveBedeliasCourseIds:true, usePublishedCredits:true, strictOfficialCourseIds:true,
  verifiedCourseIds:allCodes, courseOverrides, requiredCourseGroups,
  creditRequirements:[
    {id:first,name:"Primer trienio",shortName:"Primer trienio",minCredits:265},
    {id:second,name:"Segundo trienio",shortName:"Segundo trienio",minCredits:330},
    {id:internship,name:"Internado Rotatorio",shortName:"Internado",minCredits:146},
  ],
  projectionAnomalies:conflicts,
  manualCompletionValidation:"Confirmación con Facultad de los requisitos que corresponden al título",
  credentials:[
    {id:"bedelias-degree", title:audit.officialPlan.title, minTotalCredits:741,
      requiredCourseGroupIds:["medicina-grilla","validacion-final-plan"], sourceUrl:source.sources.credentials},
    {id:"tecnico-promocion-salud", title:audit.officialPlan.intermediateTitle.title, minTotalCredits:395,
      requiredCourseGroupIds:["medicina-hasta-cuarto","validacion-final-plan"], sourceUrl:source.sources.credentials},
  ],
};
Object.assign(audit.conclusion,{trajectoryStatus:"official-trajectory-reproduced",
  trajectorySourceDataPath:sourcePath, trajectoryCoverage:"25 unidades en seis semestres individuales y cuatro tramos de dos semestres"});
audit.remainingWork = "Verificar catálogo nominal, acreditación flexible y actas de reanimación; sin asignar semestre a estos requisitos.";
const review = {
  planId:source.planId, state:"official-trajectory-reproduced", reviewedAt:source.reviewedAt,
  effectiveAt:"tabla vigente enlazada para ingreso 2027", projectionMechanism:"official-periods",
  scope:{territories:["Montevideo",source.region.label], pathwayIds:[id], completeDegreeSequence:false},
  sources:[{url:source.sources.curriculum, authority:source.authority, reviewedAt:source.reviewedAt,
    role:"25 unidades numeradas de la grilla; consulta de requisitos de título por separado",
    contentHash:`sha256:${createHash("sha256").update(JSON.stringify(source)).digest("hex")}`}],
  evidence:{kind:"audited-projection", sourceDataPath:sourcePath, projectionDataPath:projectionPath,
    sourceCollection:"auditedPathways", projectionCollection:"publishedPathways", periodField:"periods",
    compareCoursePlacements:true, partial:true, completeDegreeSequence:false},
  conflictNotes:conflicts,
};
reviews.reviews = [...reviews.reviews.filter(r => r.planId !== source.planId), review];
registry.contentHash = officialAuditRegistryHash(registry);
await save(sourcePath, {...source, auditedPathways:[{id,periods}]});
await save(auditPath, registry);
await save(reviewPath, reviews);
await buildAndWriteAuditQueue();
await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const entry = inventory.plans.find(p => p.planId === source.planId);
assert.equal(entry.state,"official-trajectory-reproduced");
assert.equal(entry.evidence.matchedCoursePlacements,25);
