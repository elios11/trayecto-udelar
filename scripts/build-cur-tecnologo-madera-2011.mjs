#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDataPath = "data/cur/tecnologo-madera-2011.json";
const projectionDataPath = "app/data/bedelias-generated/bedelias-cur-tecnologo-en-madera-2012.json";
const sourcePath = path.join(projectRoot, sourceDataPath);
const auditsPath = path.join(projectRoot, "data", "bedelias", "audits", "official-source-audits.json");
const reviewsPath = path.join(projectRoot, "data", "official-trajectories", "reviews.json");
const projectionPath = path.join(projectRoot, projectionDataPath);
const planUrl = "https://www.impo.com.uy/diariooficial/2011/11/21/avisos.pdf";
const bedeliasUrl = "https://bedelias.udelar.edu.uy/views/public/desktop/consultarPlan/consultarPlan01.xhtml?cid=1";
const expectedPeriodLabels = ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5", "Semestre 6"];
const expectedPeriodCounts = [8, 8, 9, 9, 11, 9];

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const fail = (message) => { throw new Error(message); };
const sameMembers = (actual, expected) => actual.length === expected.length
  && new Set(actual).size === actual.length
  && actual.every((value) => expected.includes(value));

function validateSource(source) {
  if (source.planId !== "bedelias-cur-tecnologo-en-madera-2012"
    || source.auditIdentity !== "tecnologo en madera:2012"
    || source.publication.officialPlanYear !== "2011"
    || source.publication.bedeliasTechnicalYear !== "2012"
    || source.publication.durationMonths !== 36
    || source.publication.durationSemesters !== 6
    || source.publication.minimumCredits !== 270
    || source.publication.currentAtReview !== true) {
    fail("La evidencia debe conservar Plan 2011, identidad técnica 2012, seis semestres, 270 créditos y vigencia comprobada.");
  }
  if (source.fingerprint?.value !== digest(source.sourcePortions)) {
    fail("La huella de sourcePortions no coincide con la evidencia normalizada.");
  }
  for (const [sourceId, portion] of Object.entries(source.sourcePortions)) {
    const expectedHash = digest(portion);
    if (source.fingerprint.sourceHashes?.[sourceId] !== expectedHash
      || source.sources.find(({ id }) => id === sourceId)?.contentHash !== expectedHash) {
      fail(`La huella normalizada no coincide para ${sourceId}.`);
    }
  }
  const fingCopy = source.sources.find(({ id }) => id === "fing-plan-copy");
  if (fingCopy?.rawPdfContentHash !== "sha256:afef87b689b0878f58708b9d24ac0ea3a62d3ec80c000e778d4081a031b14566"
    || JSON.stringify(fingCopy.visuallyInspectedPdfPages) !== JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])) {
    fail("La copia PDF institucional debe conservar su huella y la inspección visual completa de once páginas.");
  }
  if (source.bedeliasComparison.snapshotContentHash !== "sha256:82ef6c74215a2b24dd2f9aa28b703f84df5a4fdc662891dd538dfc11e4f18500"
    || source.bedeliasComparison.compositionEntryCount !== 63
    || source.bedeliasComparison.uniqueSourceCourseCodeCount !== 63) {
    fail("El contraste debe anclarse al snapshot de 63 identidades únicas de Bedelías.");
  }
  const rowIds = source.rows.map(({ sourceCourseId }) => sourceCourseId);
  if (source.rows.length !== 54 || new Set(rowIds).size !== 54
    || source.rows.reduce((sum, row) => sum + row.credits, 0) !== 342) {
    fail("La grilla publicada debe contener 54 identidades únicas y 342 créditos de oferta, no de obligación.");
  }
  const matchedIds = source.rows.filter(({ projectionBasis }) => projectionBasis === "bedelias-match").map(({ sourceCourseId }) => sourceCourseId);
  const sourceOnlyIds = source.rows.filter(({ projectionBasis }) => projectionBasis === "source-only").map(({ sourceCourseId }) => sourceCourseId);
  if (!sameMembers(matchedIds, source.authorityPolicy.verifiedBedeliasSourceCourseIds)
    || !sameMembers(sourceOnlyIds, ["marketing-plan-2011"])
    || source.bedeliasComparison.verifiedCourseCount !== 53
    || source.bedeliasComparison.candidateRetainedCount !== 10
    || source.bedeliasComparison.sourceOnlyCourseCount !== 1) {
    fail("La frontera curricular debe conservar 53 coincidencias exactas, Marketing sólo-fuente y diez candidatas.");
  }
  const trajectory = source.trajectories[0];
  if (source.trajectories.length !== 1
    || trajectory.id !== "bedelias"
    || trajectory.useOnlyConfiguredPeriods !== true
    || JSON.stringify(trajectory.periods.map(({ label }) => label)) !== JSON.stringify(expectedPeriodLabels)
    || JSON.stringify(trajectory.periods.map(({ courseIds }) => courseIds.length)) !== JSON.stringify(expectedPeriodCounts)
    || !sameMembers(trajectory.periods.flatMap(({ courseIds }) => courseIds), rowIds)) {
    fail("La implementación oficial debe conservar seis semestres y las 54 ubicaciones sin duplicados.");
  }
  if (JSON.stringify(source.sourcePortions["dgetp-current-grid-2024"].periodCourseIds)
    !== JSON.stringify(trajectory.periods.map(({ courseIds }) => courseIds))) {
    fail("La trayectoria debe reproducir exactamente la grilla vigente de DGETP-UTU.");
  }
  if (source.authorityPolicy.annexIvExamplesBecomeProfiles !== false
    || source.sourcePortions["impo-plan-2011"].annexIVTotals.join(",") !== "267,262,271") {
    fail("Los ejemplos flexibles del Anexo IV no pueden transformarse en perfiles oficiales.");
  }
}

function buildAudit(source) {
  const conflictByField = new Map(source.conflicts.map((conflict) => [conflict.field, conflict.resolution]));
  const matchedRows = source.rows.filter(({ projectionBasis }) => projectionBasis === "bedelias-match");
  const sourceOnlyRows = source.rows.filter(({ projectionBasis }) => projectionBasis === "source-only");
  const curriculumSource = source.sources.find(({ id }) => id === "dgetp-current-grid-2024");
  const sources = source.sources.map((entry) => ({
    url: entry.url,
    authority: entry.authority,
    supports: entry.supports,
    contentHash: entry.contentHash,
  }));
  return {
    identity: source.auditIdentity,
    career: "TECNÓLOGO EN MADERA",
    planYear: "2012",
    reviewedAt: source.reviewedAt,
    status: "official-evidence-complete",
    scope: "vigencia, plan aprobado, título conjunto, seis semestres, 270 créditos, mínimos, obligaciones y guía semestral flexible",
    publicationEligible: false,
    officialPlan: {
      approval: [
        "Resolución 20 del Consejo Directivo Central de 25/10/2011",
        "Grilla de seis semestres republicada por DGETP-UTU el 21/06/2024",
      ],
      planYear: "2011",
      title: source.publication.credential,
      careerName: source.publication.credential,
      facultyCode: "FAGRO",
      facultyName: "Facultad de Agronomía",
      sharedWith: ["Facultad de Ingeniería", "DGETP-UTU"],
      durationMonths: source.publication.durationMonths,
      semesters: source.publication.durationSemesters,
      minimumCredits: source.publication.minimumCredits,
      current: source.publication.currentAtReview,
      pathwayLabel: source.trajectories[0].label,
      trajectories: source.trajectories.map((trajectory) => ({
        ...trajectory,
        sourceUrl: curriculumSource.url,
        catalogSourceCourseIds: [],
        restrictGeneratedCatalogToPublished: true,
      })),
      degreeRule: "El título exige 270 créditos, los mínimos por área, las actividades obligatorias y un currículo coherente aprobado por la Comisión de Carrera. La grilla semestral publicada reúne opciones y no exige aprobar sus 54 ubicaciones.",
      curriculum: {
        useBedeliasCompositionTree: true,
        preserveBedeliasCourseIds: true,
        usePublishedCredits: true,
        strictOfficialCourseIds: true,
        verifiedCourseIds: source.authorityPolicy.verifiedBedeliasSourceCourseIds,
        sourceUrl: curriculumSource.url,
        sourceDataPath,
        includeAllCoursesInPathwayCatalog: false,
        pathRequirementMap: Object.fromEntries(source.requirements
          .filter(({ sourceGroupCode }) => sourceGroupCode)
          .map((requirement) => [requirement.sourceGroupCode, requirement.id])),
        courseOverrides: Object.fromEntries(matchedRows.map((row) => [row.sourceCourseId, {
          name: row.officialLabel,
          preserveName: true,
          officialIdentity: true,
          officialCredits: row.officialCredits ?? row.creditsProvenance !== "official-plan-no-credit",
          credits: row.credits,
          creditSourceUrl: row.creditsProvenance === "bedelias-operational-conflict" ? bedeliasUrl : planUrl,
          requirementId: row.requirementId,
          periodLabel: row.period,
          ...(row.courseType === "electiva" ? {
            elective: true,
            catalogRole: "official-semester-option",
          } : {}),
          ...(conflictByField.has(`${row.sourceCourseId}.credits`)
            ? { creditConflict: conflictByField.get(`${row.sourceCourseId}.credits`) }
            : {}),
        }])),
        additionalCourses: sourceOnlyRows.map((row) => ({
          id: row.sourceCourseId,
          sourceCourseId: row.sourceCourseId,
          name: row.officialLabel,
          credits: row.credits,
          requirementId: row.requirementId,
          periodLabel: row.period,
          sourceUrl: curriculumSource.url,
          elective: true,
          catalogRole: "official-semester-option",
          availabilityStatus: "published-current-grid",
        })),
        periodOrder: expectedPeriodLabels,
        pathwayLabel: source.trajectories[0].label,
        pathwayDescription: source.trajectories[0].description,
        creditRequirements: source.requirements.map((requirement) => ({
          id: requirement.id,
          ...(requirement.parentId ? { parentId: requirement.parentId } : {}),
          name: requirement.name,
          shortName: requirement.shortName,
          minCredits: requirement.minCredits,
          ...(requirement.credentialRequired === false ? { credentialRequired: false } : {}),
        })),
        requiredCourseGroups: source.requiredCourseGroups.map((group) => ({
          ...group,
          sourceUrl: planUrl,
        })),
        manualCompletionValidation: "Aprobación de la Comisión de Carrera del currículo coherente que completa los 270 créditos",
        projectionAnomalies: source.conflicts,
      },
    },
    offerings: [{
      serviceCode: "CUR",
      locations: ["Rivera"],
      role: "oferta conjunta de las facultades de Agronomía e Ingeniería y DGETP-UTU en el CENUR Noreste",
      trajectoryIds: ["bedelias"],
      curriculumVariant: false,
    }],
    bedeliasComparison: {
      canonicalSnapshot: source.bedeliasComparison.snapshotPath,
      metadataCurrent: true,
      publishedDurationMonths: 60,
      publishedMinimumCredits: 270,
      distinctCourseRecords: 63,
      distinctCourseCredits: 406,
      exactVerifiedEntries: 53,
      sourceOnlyEntries: 1,
      candidateEntriesPreserved: 10,
      interpretation: "La composición de Bedelías contiene 63 identidades y 406 créditos. Cincuenta y tres códigos coinciden con la grilla oficial; Marketing se conserva sólo-fuente y las diez entradas restantes siguen candidatas.",
    },
    conclusion: {
      canonicalModel: "one-joint-plan-with-flexible-official-semester-guide",
      regionalCurriculumVariant: false,
      siteSpecificTrajectoryAvailability: false,
      trajectoryStatus: "official-trajectory-reproduced",
      trajectorySourceDataPath: sourceDataPath,
      reason: "DGETP-UTU, autoridad conjunta de la carrera, republica como Plan de estudios las 54 ubicaciones del Anexo III. Se proyectan como guía flexible de seis semestres: el Plan exige 270 créditos y aprobación de la Comisión, no cursar las 54 ubicaciones.",
      normalization: [
        "Conservar una única carrera, un único Plan 2011, una sede en Rivera y un único progreso.",
        "Publicar seis semestres desde la grilla vigente de DGETP-UTU y el Anexo III, nunca desde las áreas administrativas de Bedelías.",
        "Mantener 53 coincidencias por código y Marketing como identidad sólo-fuente; conservar CUT-SILB, AAC10-AAC15, UNIV, GP1 y TM11 como candidatas.",
        "Las combinaciones tipo del Anexo IV no son menciones ni trayectorias certificadas separadas.",
        "Mostrar las unidades electivas como oferta para completar 270 créditos y mínimos por área, no como obligaciones acumulativas.",
      ],
    },
    sources,
    anomalies: source.conflicts,
    uiNotice: "Plan conjunto Udelar-UTU vigente en Rivera: 270 créditos y una guía flexible oficial de seis semestres. Elegí unidades para cumplir los mínimos por área y las actividades obligatorias; no se exige aprobar las 54 ubicaciones ni los ejemplos del Anexo IV son menciones.",
    remainingWork: "Revisar únicamente ante una nueva publicación oficial del Plan o de la grilla. Marketing y GP1 Comercialización permanecen separados hasta que una fuente competente publique su equivalencia.",
  };
}

function buildReview(source) {
  return {
    planId: source.planId,
    state: "official-trajectory-reproduced",
    reviewedAt: source.reviewedAt,
    effectiveAt: source.publication.currentGridPublishedAt,
    projectionMechanism: "official-periods",
    scope: {
      territories: ["Rivera"],
      pathwayIds: ["bedelias"],
    },
    sources: source.sources.map((entry) => ({
      authority: entry.authority,
      url: entry.url,
      reviewedAt: source.reviewedAt,
      role: entry.supports.join("; "),
    })),
    evidence: {
      kind: "audited-projection",
      sourceDataPath,
      projectionDataPath,
      sourceCollection: "trajectories",
      projectionCollection: "publishedPathways",
      periodField: "periods",
      compareCoursePlacements: true,
    },
    conflictNotes: source.conflicts.map(({ resolution }) => resolution),
  };
}

async function updateRegistries(source) {
  const audits = await readJson(auditsPath);
  const auditIndex = audits.audits.findIndex(({ identity }) => identity === source.auditIdentity);
  if (auditIndex < 0) fail("No existe la auditoría de Tecnólogo en Madera a reconciliar.");
  audits.audits[auditIndex] = buildAudit(source);
  audits.contentHash = officialAuditRegistryHash(audits);
  await writeJson(auditsPath, audits);

  const reviews = await readJson(reviewsPath);
  const review = buildReview(source);
  const reviewIndex = reviews.reviews.findIndex(({ planId }) => planId === source.planId);
  if (reviewIndex >= 0) reviews.reviews[reviewIndex] = review;
  else reviews.reviews.push(review);
  await writeJson(reviewsPath, reviews);
}

function validateProjection(source, projection, inventoryEntry) {
  const verified = projection.courses.filter(({ authorityStatus, dataStatus }) => authorityStatus === "verified" && dataStatus !== "manual-validation");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  if (verified.length !== 54 || candidates.length !== 10 || projection.plan.courseCatalogAuditStatus !== "partial") {
    fail(`La frontera esperada es 54 verificadas y diez candidatas; resultó ${verified.length}/${candidates.length}.`);
  }
  if (!sameMembers(candidates.map(({ bedeliasCode }) => bedeliasCode).filter(Boolean), source.bedeliasComparison.candidateSourceCourseIds)) {
    fail("La regeneración promovió o eliminó candidatas sin autoridad curricular.");
  }
  const marketing = projection.courses.find(({ sourceCourseId }) => sourceCourseId === "marketing-plan-2011");
  if (!marketing || marketing.name !== "Marketing" || marketing.credits !== 5 || marketing.elective !== true) {
    fail("Marketing debe conservarse como opción oficial sólo-fuente de cinco créditos.");
  }
  for (const [code, credits] of [["TIMEM", 0], ["ETC4", 6], ["SE4", 7]]) {
    if (projection.courses.find(({ bedeliasCode }) => bedeliasCode === code)?.credits !== credits) {
      fail(`No se conservó la resolución documental de créditos para ${code}.`);
    }
  }
  const pathway = projection.publishedPathways?.bedelias;
  if (!pathway
    || JSON.stringify(pathway.periods.map(({ label }) => label)) !== JSON.stringify(expectedPeriodLabels)
    || JSON.stringify(pathway.periods.map(({ courseIds }) => courseIds.length)) !== JSON.stringify(expectedPeriodCounts)
    || pathway.periods.flatMap(({ courseIds }) => courseIds).length !== 54
    || pathway.periods.some(({ label }) => label === "Validación de egreso")) {
    fail("La proyección debe conservar sólo la guía oficial de seis semestres y 54 ubicaciones.");
  }
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  const pathwayCredits = pathway.periods.flatMap(({ courseIds }) => courseIds)
    .reduce((sum, id) => sum + (courseById.get(id)?.credits ?? 0), 0);
  if (pathwayCredits !== 342) {
    fail(`La oferta semestral debe sumar 342 créditos disponibles; resultó ${pathwayCredits}.`);
  }
  const minima = Object.fromEntries(projection.creditStructure.nodes.map(({ id, minCredits }) => [id, minCredits]));
  if (minima["plan-total"] !== 270 || minima["basic-mathematics"] !== 22
    || minima["basic-physical"] !== 27 || minima["basic-biochemical"] !== 45
    || minima.technology !== 110 || minima["technology-common"] !== 66 || minima.complementary !== 34) {
    fail("La regeneración alteró los mínimos oficiales de egreso.");
  }
  const credentialGroups = projection.creditStructure.credentials[0].requiredCourseGroups;
  if (!sameMembers(credentialGroups.map(({ id }) => id), [
    "mandatory-introductory-workshop",
    "mandatory-common-technology",
    "mandatory-complementary-activities",
    "validacion-final-plan",
  ])) {
    fail("La regeneración alteró las actividades obligatorias o la validación de la Comisión.");
  }
  if (inventoryEntry?.state !== "official-trajectory-reproduced"
    || inventoryEntry.currentProjection?.primary !== "official-periods"
    || inventoryEntry.evidence?.expectedCoursePlacements !== 54
    || inventoryEntry.evidence?.matchedCoursePlacements !== 54) {
    fail("El inventario no confirmó los seis períodos y las 54 ubicaciones oficiales.");
  }
}

const source = await readJson(sourcePath);
validateSource(source);
await updateRegistries(source);
await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
const projection = await readJson(projectionPath);
validateProjection(source, projection, inventory.plans.find(({ planId }) => planId === source.planId));

console.log(`D03ah regenerado: Plan 2011, guía flexible de seis semestres, 54 ubicaciones oficiales, 53 códigos Bedelías, Marketing sólo-fuente y diez candidatas; ${report.counts.generatedPlans} planes e inventario actualizados.`);
