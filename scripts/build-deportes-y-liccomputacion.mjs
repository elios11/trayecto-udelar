import assert from "node:assert/strict";
import { readFile, rename, writeFile } from "node:fs/promises";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = new URL("../", import.meta.url);
const registryPath = "data/bedelias/audits/official-source-audits.json";
const reviewPath = "data/official-trajectories/reviews.json";
const sportsPath = "data/bedelias/audits/tecnicatura-deportes-2007-trajectory.json";
const licPath = "data/fing/computacion-2025-trayectorias.json";
const read = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
async function save(path, data) {
  const url = new URL(path, root);
  const old = await readFile(url, "utf8");
  const content = JSON.stringify(data, null, 2) + "\n";
  if (old.replaceAll("\r\n", "\n") === content) return;
  const temp = new URL(url.href + ".trajectory.tmp");
  await writeFile(temp, old.includes("\r\n") ? content.replaceAll("\n", "\r\n") : content);
  await rename(temp, url);
}
const [registry, reviews, sports, lic] = await Promise.all([registryPath, reviewPath, sportsPath, licPath].map(read));
const auditFor = (identity) => {
  const audit = registry.audits.find((entry) => entry.identity === identity);
  assert.ok(audit, identity);
  return audit;
};
const addSources = (audit, sources) => {
  for (const { url, authority, role } of sources) {
    if (!audit.sources.some((entry) => entry.url === url)) audit.sources.push({ url, authority, supports: [role] });
  }
};
const review = (entry) => {
  const index = reviews.reviews.findIndex(({ planId }) => planId === entry.planId);
  if (index === -1) reviews.reviews.push(entry);
  else reviews.reviews[index] = entry;
};
const projectionPath = (planId) => `app/data/bedelias-generated/${planId}.json`;

const sportsId = "bedelias-isef-tecnicatura-en-deportes-2007";
const ted = auditFor("tecnicatura en deportes:2007");
const sportsPlan = ted.officialPlan;
const sportsSources = [
  { url: sports.sourceUrl, authority: sports.authority, role: "Tablas de formación básica de los dos años", contentHash: sports.pdfHash },
  { url: sports.indexUrl, authority: sports.authority, role: "Enlace vigente y condición de ingreso 2026" },
].map((source) => ({ ...source, reviewedAt: sports.consultedAt }));
const rows = sports.periods.flatMap(({ rows }) => rows);
assert.equal(rows.length, 20);
assert.equal(rows.reduce((sum, row) => sum + row[2], 0), 144);
assert.equal(rows.filter((row) => row[4] === "comun").reduce((sum, row) => sum + row[2], 0), 37);
const sportsCourses = new Map();
const campusForSport = { futbol: "montevideo", "actividades-acuaticas": "rocha", atletismo: "paysandu" };
const scopeNotice = "Estructura oficial del Plan 2007 para cohortes existentes. Las anuales se muestran una sola vez. ISEF no abrió Fútbol en 2026; tampoco se confirma nuevo ingreso para las demás opciones. Los 16 créditos optativos se completan con la oferta que ISEF confirme, sin semestre fijo ni catálogo nominal verificado.";
sportsPlan.trajectories = sportsPlan.documentedSportOptions.map(({ id, label }) => ({
  id, label, campusIds: [campusForSport[id]], description: scopeNotice, useOnlyConfiguredPeriods: true,
  localCatalogOnly: true, scopeProgressToPathway: true,
  periods: sports.periods.map(({ label: periodLabel, rows: units }) => ({
    label: periodLabel,
    courseIds: units.map(([key, name, credits, hours, block]) => {
      const requirementId = block === "comun" ? "ted-comun" : "ted-especifica";
      if (/^[A-Z0-9]+$/.test(key)) {
        sportsCourses.set(key, { id: key, name, credits, hours, requirementId,
          reuseBedeliasCourseId: `isef-${key.toLowerCase()}`, sourceUrl: sports.sourceUrl });
        return key;
      }
      const courseId = block === "opcion" ? `ted-${key}-${id}` : `ted-${key}`;
      sportsCourses.set(courseId, {
        id: courseId, name: block === "opcion" ? `${name} · ${label}` : name,
        credits, hours, requirementId, sourceUrl: sports.sourceUrl,
      });
      return courseId;
    }),
  })),
}));
sportsPlan.curriculum = {
  sourceUrl: sports.sourceUrl, sourceDataPath: sportsPath,
  augmentBedeliasCourses: true, catalogCourses: [...sportsCourses.values()],
  creditRequirements: [
    { id: "ted-comun", name: "Formación común", minCredits: 37 },
    { id: "ted-especifica", name: "Formación específica", minCredits: 107 },
    { id: "ted-opcional", name: "Formación opcional", minCredits: sports.optionalCredits },
  ],
};
ted.uiNotice = scopeNotice;
ted.reviewedAt = sports.consultedAt;
ted.conclusion.trajectoryStatus = "official-trajectory-reproduced";
addSources(ted, sportsSources);

const licId = "bedelias-fing-licenciatura-en-computacion-2025";
const licAudit = auditFor("licenciatura en computacion:2025");
const plan = licAudit.officialPlan;
const curr = plan.curriculum;
const shared = [
  ["second-semester-pi-60-plus", "trajectorySecondSemester60Plus", ["montevideo"]],
  ["second-semester-pi-20-59", "trajectorySecondSemester20To59", ["montevideo"]],
  ["litoral-norte", "trajectoryLitoralNorte", ["salto", "paysandu"]],
];
const sharedIds = new Set(shared.map(([id]) => id));
const licCourses = new Map(lic.courses.map((course) => [course.id, course]));
const licCodes = new Set(["MI2", "2044", "1030", "2043", "1061", "1375", "1031", "2046", "1062", "1025"]);
const licOverrides = {};
const licAdditions = new Map();
const licNotice = "Referencia parcial publicada por FING para Ingeniería y Licenciatura. El Trabajo Final integrador de Licenciatura vale 20 créditos y no tiene semestre fijado aquí; el Proyecto de Ingeniería de Software no lo sustituye. Se conservan los mínimos y los 360 créditos del título.";
const existingFlexible = plan.trajectories.find(({ id }) => id === "curricula-personalizada");
const licPathways = shared.map(([id, sourceKey, campusIds]) => {
  const trajectory = lic.trajectories[id];
  assert.match(trajectory.description, /Ingeniería y Licenciatura/);
  assert.equal(trajectory.periods.length, 8);
  for (const period of trajectory.periods) {
    assert.equal(period.courseIds.reduce((sum, code) => sum + licCourses.get(code).credits, 0), period.publishedCredits);
    for (const code of period.courseIds) {
      const course = licCourses.get(code);
      if (licCodes.has(code)) {
        licOverrides[code] ??= { name: course.name, credits: course.credits, preserveName: true,
          officialIdentity: true, officialCredits: true, creditSourceUrl: lic.source[sourceKey] };
      } else {
        licAdditions.set(code, { id: code, name: course.name, credits: course.credits, requirementId: "plan-total",
          sourceUrl: lic.source[sourceKey], periodLabel: "Materias de las guías compartidas" });
      }
    }
  }
  const regional = id === "litoral-norte";
  return {
    id, label: regional ? "Referencia regional · Litoral Norte" : trajectory.label,
    description: `${trajectory.description} ${regional ? "La grilla es regional: no indica qué asignaturas se dictan en cada ciudad. " : ""}${licNotice}`,
    campusIds, useOnlyConfiguredPeriods: true,
    periods: trajectory.periods.map(({ label, courseIds }) => ({ label, courseIds })),
  };
});
plan.trajectories = [existingFlexible, ...licPathways];
for (const offering of licAudit.offerings) {
  const supported = licPathways.filter(({ campusIds }) =>
    offering.locations.some((place) => campusIds.includes(place.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase())));
  offering.trajectoryIds = [...supported.map(({ id }) => id),
    ...offering.trajectoryIds.filter((id) => !sharedIds.has(id))];
}
curr.sourceDataPath = licPath;
curr.courseOverrides = { ...curr.courseOverrides, ...licOverrides };
curr.additionalCourses = [
  ...curr.additionalCourses.filter(({ id }) => !licAdditions.has(id)),
  ...licAdditions.values(),
];
licAudit.uiNotice = licNotice;
licAudit.conclusion.trajectoryStatus = "official-trajectory-identified-pending";
licAudit.conclusion.trajectoryCoverage = "tres guías compartidas reproducidas; ingreso inicial, Colonia, Tacuarembó y ubicación del Trabajo Final no extrapolados";
const licSources = shared.map(([, key]) => {
  const url = lic.source[key];
  const { contentHash } = lic.source.evidence.documents.find((document) => document.url === url);
  return { url, authority: lic.source.institution, role: "grilla que nombra a Ingeniería y Licenciatura", contentHash, reviewedAt: lic.source.reviewedAt };
});
addSources(licAudit, licSources);

registry.contentHash = officialAuditRegistryHash(registry);
await save(registryPath, registry);
await buildAndWriteAuditQueue();
await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();

const sportsProjection = await read(projectionPath(sportsId));
const expectedSportsPathways = sportsPlan.trajectories.map(({ id, periods }) => ({
  id, periods: periods.map(({ label, courseIds }) => ({
    label, courseIds: courseIds.map((code) => {
      const expectedId = `isef-${code.toLowerCase()}`;
      const matches = sportsProjection.courses.filter((course) =>
        course.authorityStatus === "verified" && (course.id === expectedId || course.bedeliasCode === code));
      assert.equal(matches.length, 1, code);
      return matches[0].id;
    }),
  })),
}));
await save(sportsPath, { ...sports, auditedPathways: expectedSportsPathways });
review({
  planId: sportsId, state: "official-trajectory-reproduced", reviewedAt: sports.consultedAt, effectiveAt: sports.effectiveAt,
  projectionMechanism: "official-periods",
  scope: { territories: ["Montevideo", "Rocha", "Paysandú"], pathwayIds: Object.keys(campusForSport), completeDegreeSequence: false },
  sources: sportsSources,
  evidence: { kind: "audited-projection", sourceDataPath: sportsPath, projectionDataPath: projectionPath(sportsId),
    sourceCollection: "auditedPathways", projectionCollection: "publishedPathways", periodField: "periods",
    compareCoursePlacements: true, partial: true, completeDegreeSequence: false },
  conflictNotes: [sports.optionalNotes, "No se supone equivalencia automática entre materias específicas de deportes distintos."],
});
const licProjection = await read(projectionPath(licId));
for (const { id, periods } of licPathways) {
  const actual = licProjection.publishedPathways[id].periods;
  assert.deepEqual(actual.map(({ label, courseIds }) => [label, courseIds.map((courseId) => {
    const course = licProjection.courses.find(({ id }) => id === courseId);
    return course.bedeliasCode ?? course.id.replace(/^fing-/, "").toUpperCase();
  })]), periods.map(({ label, courseIds }) => [label, courseIds]));
}
review({
  planId: licId, state: "official-trajectory-identified-pending", reviewedAt: lic.source.reviewedAt,
  effectiveAt: "Plan 2025, ingreso desde 2026", projectionMechanism: "official-periods",
  scope: { territories: ["Montevideo", "CENUR Litoral Norte"], pathwayIds: [...sharedIds], completeDegreeSequence: false },
  sources: licSources,
  evidence: { kind: "insufficient-trajectory-evidence", sourceDataPath: licPath, projectionDataPath: projectionPath(licId),
    reason: "Se reproducen tres guías compartidas. No se publicó o cotejó la ubicación del Trabajo Final de Licenciatura ni una guía propia de ingreso inicial para cada sede." },
  conflictNotes: ["No se convierte el Proyecto de Ingeniería de Software en Trabajo Final de Licenciatura ni se comparte progreso entre los dos planes."],
});
await save(reviewPath, reviews);
await buildOfficialTrajectoryInventory();
