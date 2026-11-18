import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { buildAndWriteAuditQueue, officialAuditRegistryHash } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const root = new URL("../", import.meta.url);
const sourcePath = "data/bedelias/audits/fing-trayectos-iniciales-litoral-norte-review.json";
const auditPath = "data/bedelias/audits/official-source-audits.json";
const reviewsPath = "data/official-trajectories/reviews.json";
const read = async (file) => JSON.parse(await readFile(new URL(file, root), "utf8"));
async function save(file, data) {
  const url = new URL(file, root);
  const original = await readFile(url, "utf8");
  const content = JSON.stringify(data, null, 2) + "\n";
  if (original.replaceAll("\r\n", "\n") === content) return;
  const temp = new URL(url.href + ".litoral.tmp");
  await writeFile(temp, original.includes("\r\n") ? content.replaceAll("\n", "\r\n") : content);
  await rename(temp, url);
}

const [source, registry, reviews] = await Promise.all([sourcePath, auditPath, reviewsPath].map(read));
const ifmGuidePath = "data/official-trajectories/fing-fisico-matematica-2017-montevideo.json";
const ifmGuide = await read(ifmGuidePath);
const ifmPathwayId = "montevideo-inicial";
const consultedAt = source.consultedAt;
const contentHash = `sha256:${createHash("sha256").update(JSON.stringify(source.rows)).digest("hex")}`;
const regionalPathways = ["salto-inicial", "paysandu-inicial"];
const territories = { salto: "Salto", paysandu: "Paysandú" };
const normalizeId = (name) => name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-");
const plans = [
  { identity: "ingenieria en agrimensura:2023", slug: "ingenieria-en-agrimensura-2023",
    evidenceKey: "agrimensura-2023", credits: [[44, 48], [44, 48]], anomaly: "regionalGatewayVsCampus" },
  { identity: "ingenieria fisico matematica:2017", slug: "ingenieria-fisico-matematica-2017",
    evidenceKey: "fisico-matematica-2017", credits: [[44, 48, 47, 45], [40, 48, 47, 45]], anomaly: "campusScope" },
];
const auditedPathwaysByPlan = [];
for (const { identity, slug, evidenceKey, credits, anomaly } of plans) {
  const planId = `bedelias-fing-${slug}`;
  const audit = registry.audits.find((entry) => entry.identity === identity);
  assert.ok(audit, identity);
  const officialPlan = audit.officialPlan;
  const curriculum = officialPlan.curriculum;
  const data = source.rows[evidenceKey];
  const oldTrajectories = officialPlan.trajectories.filter(({ id }) => id !== ifmPathwayId && !regionalPathways.includes(id));
  const credentialId = oldTrajectories[0].credentialId;
  assert.ok(credentialId);
  const rowsById = new Map();
  const regional = Object.entries(territories).map(([campusId, label], territoryIndex) => {
    const rows = data.sharedSemesters ?? Object.entries(data.shared).map(([number, common]) =>
      [...common, ...(data[`${campusId}Additions`][number] ?? [])]);
    assert.deepEqual(rows.map((semester) => semester.reduce((sum, [, value]) => sum + value, 0)), credits[territoryIndex]);
    const periods = rows.map((semester, index) => ({
      label: `Semestre ${index + 1}`,
      courseIds: semester.map(([name, credits]) => {
        const id = `litoral-norte-${normalizeId(name)}`;
        const prior = rowsById.get(id);
        if (prior) assert.deepEqual([prior.name, prior.credits], [name, credits]);
        else rowsById.set(id, {
          id, name, credits, requirementId: "plan-total", periodLabel: `Semestre ${index + 1}`,
          sourceUrl: source.sources[campusId],
        });
        return id;
      }),
    }));
    return {
      id: `${campusId}-inicial`, label: `Inicio en ${label}`, credentialId, campusIds: [campusId],
      description: `Trayectoria inicial oficial de ${periods.length} semestres; la carrera completa continúa en Montevideo. Algunas materias pueden dictarse en la otra sede del Litoral Norte. Consultá inscripción, modalidad y reválidas con FING. La grilla documenta créditos totales, no el reparto por área ni la oferta actual.`,
      useOnlyConfiguredPeriods: true, catalogSourceCourseIds: [], localCatalogOnly: true, periods,
    };
  });
  const newIds = [...rowsById.keys()];
  officialPlan.trajectories = [
    ...oldTrajectories.map((trajectory) => ({
      ...trajectory, excludedCourseIds: [...new Set([...(trajectory.excludedCourseIds ?? []), ...newIds])],
    })),
    ...regional,
  ];
  curriculum.additionalCourses = [
    ...(curriculum.additionalCourses ?? []).filter(({ id }) => !rowsById.has(id)), ...rowsById.values(),
  ];
  if (planId === ifmGuide.planId) {
    const { semesterCodes, initialWorkshopCodes, earlyOptionCodes } = ifmGuide.catalogReconciliation;
    assert.ok(semesterCodes.flat().every(Boolean));
    assert.equal(ifmGuide.initialWorkshop.choose, 1);
    const choice = [...initialWorkshopCodes];
    const optionCodes = earlyOptionCodes.filter(Boolean);
    curriculum.verifiedCourseIds = [...new Set([...(curriculum.verifiedCourseIds ?? []),
      ...semesterCodes.flat(), ...choice, ...optionCodes])];
    officialPlan.trajectories.unshift({
      id: ifmPathwayId,
      label: "Montevideo · primeros cuatro semestres",
      credentialId,
      campusIds: ["montevideo"],
      description: "Guía parcial para ingreso con suficiencia en la prueba diagnóstica. En primero elegí un taller; las opciones adicionales de tercero y cuarto quedan en el catálogo sin semestre fijo. La guía indica 7 créditos para Principios de Química General y Bedelías registra 8 en Montevideo: no se asignó esa materia a un semestre ni se cambió su carga. La Comisión debe aprobar el currículo individual.",
      excludedCourseIds: newIds,
      useOnlyConfiguredPeriods: true,
      periods: semesterCodes.map((codes, index) => ({
        label: `Semestre ${index + 1}`,
        courseIds: index === 0 ? [...codes, ...choice] : codes,
        ...(index === 0 ? { alternativeGroups: [{ id: "taller-inicial", required: true, courseIds: choice }] } : {}),
      })),
    });
    const capital = audit.offerings.find(({ locations }) => locations.includes("Montevideo"));
    capital.trajectoryIds = [ifmPathwayId, ...capital.trajectoryIds.filter((id) => id !== ifmPathwayId)];
    if (!audit.sources.some(({ url }) => url === ifmGuide.source.url)) {
      audit.sources.push({ url: ifmGuide.source.url, authority: ifmGuide.source.authority,
        supports: ["cuatro semestres iniciales de Montevideo y sus alternativas"] });
    }
  }
  const notice = "Los CIO son carreras independientes. Las Trayectorias Ingeniería publicadas para Salto y Paysandú son inicios parciales de este mismo plan, distintos del CIO, con continuidad en Montevideo; no son sedes completas.";
  audit.offerings = [
    ...audit.offerings.filter((offering) => !offering.trajectoryIds?.some((id) => regionalPathways.includes(id))),
    ...Object.entries(territories).map(([campusId, label]) => ({
      serviceCode: "CENURLN", locations: [label], role: "trayectoria inicial oficial intersede con continuidad en Montevideo",
      admissionStatus: "active", trajectoryIds: [`${campusId}-inicial`],
    })),
  ];
  audit.reviewedAt = planId === ifmGuide.planId ? ifmGuide.source.reviewedAt : consultedAt;
  audit.anomalies.find(({ field }) => field === anomaly).resolution = notice;
  const sources = Object.entries(source.sources).map(([id, url]) => ({
    url, authority: source.authority, reviewedAt: consultedAt, role: id === "indice"
      ? "índice vigente de Trayectorias Ingeniería, inscripción y continuidad" : `grilla inicial de ${territories[id]}`,
    ...(id === "indice" ? {} : { contentHash }),
  }));
  for (const { url, authority, role } of sources) {
    if (!audit.sources.some((item) => item.url === url)) audit.sources.push({ url, authority, supports: [role] });
  }
  const pending = "Continúa pendiente la secuencia sugerida y la cobertura de asignaturas de Montevideo; no se extrapola de Salto ni Paysandú.";
  audit.conclusion.regionalCurriculumVariant = true;
  audit.conclusion.regionalTrajectoryEvidencePath = sourcePath;
  audit.remainingWork = planId === ifmGuide.planId
    ? "Cotejar y proyectar los perfiles avanzados de Montevideo; resolver la discrepancia de créditos de Química General."
    : pending;
  auditedPathwaysByPlan.push({ id: planId, pathways: regional.map(({ id, periods }) => ({
    id, periods: periods.map(({ label, courseIds }) => ({ label, courseIds: courseIds.map((code) => `fing-${code}`) })),
  })) });
  const entry = {
    planId, state: "research-pending", reviewedAt: consultedAt, effectiveAt: source.effectiveAt,
    projectionMechanism: "official-periods",
    scope: { territories: ["Salto", "Paysandú"], pathwayIds: regionalPathways, completeDegreeSequence: false },
    sources,
    evidence: {
      kind: "audited-projection", sourceDataPath: sourcePath, projectionDataPath: `app/data/bedelias-generated/${planId}.json`,
      sourcePlanId: planId, sourceCollection: "pathways", projectionCollection: "publishedPathways", periodField: "periods",
      compareCoursePlacements: true, partial: true, completeDegreeSequence: false,
    },
    conflictNotes: [notice, pending, "Las filas de fuente no publican códigos ni equivalencias con Bedelías. Los mínimos del grado permanecen intactos."],
  };
  const reviewIndex = reviews.reviews.findIndex((item) => item.planId === planId);
  if (reviewIndex === -1) reviews.reviews.push(entry);
  else if (reviews.reviews[reviewIndex].state === "research-pending") reviews.reviews[reviewIndex] = entry;
  if (planId === ifmGuide.planId) {
    const review = reviews.reviews.find((item) => item.planId === planId);
    review.scope.territories = ["Montevideo", "Salto", "Paysandú"];
    // The audited projection evidence below still compares the regional rows only.
    review.evidence.reason = "Se reproducen los cuatro primeros semestres de Montevideo y los inicios regionales. Falta cotejar y proyectar los perfiles avanzados de Montevideo.";
    review.conflictNotes = [notice, audit.remainingWork, `Guía inicial de Montevideo: ${ifmGuidePath}.`];
    review.sources.find(({ url }) => url === ifmGuide.source.url).role = "guía inicial capitalina de cuatro semestres reproducida";
  }
}

registry.contentHash = officialAuditRegistryHash(registry);
await save(sourcePath, { ...source, normalizedRowsHash: contentHash, plans: auditedPathwaysByPlan });
await save(auditPath, registry);
await save(reviewsPath, reviews);
await buildAndWriteAuditQueue();
await buildExtractedAcademicPlans();
await buildAndWriteUiCurriculumQueue();
await buildOfficialTrajectoryInventory();
