import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";
import { buildRriiEvidenceValidation } from "./verify-rrii-2013-evidence.mjs";

const root = new URL("../", import.meta.url);
const registryPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const tiPath = "data/bedelias/audits/tecnologo-informatica-2007-semester-evidence.json";
const rriiPath = "data/fder/rrii-2013-2021-evidence.json";
const read = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
async function save(path, data) {
  const url = new URL(path, root);
  const original = await readFile(url, "utf8");
  const content = JSON.stringify(data, null, 2) + "\n";
  if (original.replaceAll("\r\n", "\n") === content) return;
  const temp = new URL(url.href + ".semesters.tmp");
  await writeFile(temp, original.includes("\r\n") ? content.replaceAll("\n", "\r\n") : content);
  await rename(temp, url);
}

const [registry, reviews, ti, rrii] = await Promise.all([registryPath, reviewsPath, tiPath, rriiPath].map(read));
const findAudit = (identity) => {
  const audit = registry.audits.find((entry) => entry.identity === identity);
  assert.ok(audit, identity);
  return audit;
};
const addAuditSources = (audit, sources) => {
  for (const { url, authority, role } of sources) {
    if (!audit.sources.some((source) => source.url === url)) audit.sources.push({ url, authority, supports: [role] });
  }
};
const projectionPath = (planId) => `app/data/bedelias-generated/${planId}.json`;
const review = ({ planId, reviewedAt, effectiveAt, sourceDataPath, scope, sources, conflictNotes, partial }) => {
  const entry = {
    planId, state: "official-trajectory-reproduced", reviewedAt, effectiveAt, projectionMechanism: "official-periods",
    scope: { ...scope, completeDegreeSequence: !partial },
    sources: sources.map((source) => ({ ...source, reviewedAt })),
    evidence: { kind: "audited-projection", sourceDataPath, projectionDataPath: projectionPath(planId),
      sourceCollection: "auditedPathways", projectionCollection: "publishedPathways", periodField: "periods",
      compareCoursePlacements: true, partial, completeDegreeSequence: !partial },
    conflictNotes,
  };
  const index = reviews.reviews.findIndex((item) => item.planId === planId);
  if (index === -1) reviews.reviews.push(entry);
  else reviews.reviews[index] = entry;
};
const semester = (number) => `Semestre ${number}`;

const tiAudit = findAudit(ti.identity);
const tiPlan = tiAudit.officialPlan;
const tiCurriculum = tiPlan.curriculum;
const tiUrl = ti.sources[0].url;
const tiNotice = "Referencia oficial de seis semestres del Plan 2007, común a las cinco sedes. Elegí el recorrido de ingreso que corresponda a tu bachillerato. La nivelación no suma créditos. Los espacios complementarios y optativos indican carga sugerida, no suman por sí solos: planificá las unidades concretas que ofrezca tu sede. Para egresar se mantienen los siete mínimos, los 252 créditos y la validación de la Comisión.";
const tiHash = `sha256:${createHash("sha256").update(JSON.stringify([ti.entryProfiles, ti.entryCourses, ti.semesters])).digest("hex")}`;
assert.deepEqual(ti.semesters.map((rows) => rows.reduce((sum, row) => sum + row[2], 0)), [20, 50, 48, 48, 38, 48]);
const tiRows = [...ti.entryCourses, ...ti.semesters.flat()];
const tiSlots = new Set(tiRows.filter((row) => row[3]).map(([id]) => id));
assert.equal(tiSlots.size, 12);
tiCurriculum.additionalCourses = [...tiCurriculum.additionalCourses.filter(({ id }) => !tiSlots.has(id)),
  ...ti.semesters.flatMap((rows, index) => rows.filter((row) => row[3]).map(([id, name, credits, requirementId]) => ({
    id, name: `${name} · ${credits} cr. sugeridos`, credits: 0, requirementId, periodLabel: semester(index + 1),
    curricularBlock: true, elective: true, catalogRole: "official-semester-option-slot",
    availabilityStatus: "published-plan-slot", sourceUrl: tiUrl,
  }))),
];
const tiExamples = ["TI04", "TI10", "TI15", "TI14", "TI20", "TI19"];
tiCurriculum.courseOverrides = {
  ...tiCurriculum.courseOverrides,
  ...Object.fromEntries(tiRows.filter((row) => !row[3]).map(([id, name, credits]) => [id, {
    name, credits, preserveName: true, officialIdentity: true, officialCredits: true, creditSourceUrl: tiUrl,
  }])),
  ...Object.fromEntries(tiExamples.map((id) => [id, {
    officialIdentity: true, officialCredits: true, elective: true, catalogRole: "official-plan-example-option",
  }])),
};
tiCurriculum.sourceDataPath = tiPath;
const tiCampuses = ["montevideo", "florida", "maldonado", "san-jose", "paysandu"];
tiPlan.trajectories = ti.entryProfiles.map(({ id, label, codes }) => ({
  id, label, credentialId: "tecnologo-informatica", campusIds: tiCampuses, description: tiNotice,
  periods: ti.semesters.map((rows, index) => ({
    label: semester(index + 1), courseIds: [...(index === 0 ? codes : []), ...rows.map(([code]) => code)],
  })),
  useOnlyConfiguredPeriods: true,
}));
tiAudit.uiNotice = tiNotice;
tiAudit.reviewedAt = ti.consultedAt;
const tiConflicts = [
  "Nivelación sin créditos diferenciada según el bachillerato de ingreso.",
  "Los 12 espacios flexibles no son materias ni otorgan créditos por sí mismos; el Plan nombra ejemplos, no una oferta vigente por sede.",
];
Object.assign(tiAudit.conclusion, {
  trajectoryStatus: "official-trajectory-reproduced", trajectorySourceDataPath: tiPath,
  trajectoryCoverage: "seis semestres, dos vías de ingreso y espacios flexibles oficiales, sin oferta nominal completa",
});
addAuditSources(tiAudit, ti.sources);
const tiAudited = tiPlan.trajectories.map(({ id, periods }) => ({ id, periods: periods.map(({ label, courseIds }) => ({
  label, courseIds: courseIds.map((code) => `fing-${code.toLowerCase()}${tiSlots.has(code) ? "" : "-2"}`),
})) }));
review({ planId: ti.planId, reviewedAt: ti.consultedAt, effectiveAt: ti.effectiveAt, sourceDataPath: tiPath,
  scope: { territories: ["Montevideo", "Florida", "Maldonado", "San José", "Paysandú"], pathwayIds: ti.entryProfiles.map(({ id }) => id) },
  sources: ti.sources.map((source, index) => index === 0 ? { ...source, contentHash: tiHash } : source),
  conflictNotes: tiConflicts, partial: true });

const rrAudit = findAudit("licenciatura en relaciones internacionales:2013");
const rrPlan = rrAudit.officialPlan;
const rrCurriculum = rrPlan.curriculum;
const rrNotice = "Grilla oficial de ocho semestres. Elegí una Función Universitaria en octavo y una modalidad de egreso. Las optativas son alternativas para completar mínimos, no materias que deban aprobarse todas.";
// Keep the older ID in the raw catalog and storage; no equivalence was published.
delete rrCurriculum.courseOverrides["2015I"];
rrCurriculum.courseOverrides["2015"] = { periodLabel: "Semestre 2", officialIdentity: true };
rrCurriculum.sourceDataPath = rriiPath;
rrCurriculum.pathwayDescription = rrNotice;
const rrGroups = [
  { id: "funcion-universitaria", required: true, courseIds: ["2044I", "2045I", "2046I"] },
  { id: "modalidad-de-egreso", required: true, courseIds: ["3112B", "3113", "3123"] },
];
const rrPeriods = rrii.priorAuditPlacementCodes.map(({ semester: number, codes }) => ({
  label: semester(number), courseIds: codes,
  ...(number === 8 ? { alternativeGroups: [rrGroups[0]] } : {}),
}));
rrPeriods.push({ label: "Modalidades de egreso", courseIds: rrGroups[1].courseIds, alternativeGroups: [rrGroups[1]] });
rrPlan.trajectories = [{
  id: "bedelias", credentialId: "bedelias-degree", label: "Grilla oficial", description: rrNotice,
  periods: rrPeriods, useOnlyConfiguredPeriods: true, excludedCourseIds: ["2015I"],
}];
rrAudit.reviewedAt = rrii.reviewedAt;
rrAudit.uiNotice = rrNotice;
Object.assign(rrAudit.conclusion, {
  trajectoryStatus: "official-trajectory-reproduced", trajectorySourceDataPath: rriiPath,
  trajectoryCoverage: "ocho semestres, Función Universitaria y modalidades de egreso; optativas sin asignación oficial por semestre",
});
const rrSources = [
  { url: rrii.documentPageUrl, authority: rrii.authority, role: "publicación vigente de la grilla actualizada en 2021" },
  { url: rrii.curriculumUrl, authority: rrii.authority, role: "grilla cotejada en dos páginas", contentHash: rrii.visualReview.pdfHash },
  { url: rrii.currentResearchCodeUrl, authority: rrii.authority, role: "código 2015 en el calendario de 2026" },
  { url: rrii.historicalResearchCodeUrl, authority: rrii.authority, role: "código histórico 2015I en el calendario de 2025" },
];
addAuditSources(rrAudit, rrSources);
const rrAudited = [{ id: "bedelias", periods: rrPeriods.map(({ label, courseIds }) => ({
  label, courseIds: courseIds.map((code) => `fder-${code.toLowerCase()}-2`),
})) }];
review({ planId: rrii.planId, reviewedAt: rrii.reviewedAt, effectiveAt: rrii.publishedVersion, sourceDataPath: rriiPath,
  scope: { territories: ["Montevideo"], pathwayIds: ["bedelias"] }, sources: rrSources,
  conflictNotes: rrii.unresolved, partial: true });

registry.contentHash = officialAuditRegistryHash(registry);
await save(tiPath, { ...ti, normalizedRowsHash: tiHash, auditedPathways: tiAudited });
await save(rriiPath, { ...rrii, auditedPathways: rrAudited });
await save(registryPath, registry);
await save(reviewsPath, reviews);
await buildAndWriteAuditQueue();
await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
await buildRriiEvidenceValidation();
const inventory = await buildOfficialTrajectoryInventory();
for (const planId of [ti.planId, rrii.planId]) {
  assert.equal(inventory.plans.find((entry) => entry.planId === planId)?.state, "official-trajectory-reproduced");
}
