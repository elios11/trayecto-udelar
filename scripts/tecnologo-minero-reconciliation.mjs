import { createHash } from "node:crypto";

export function mineroSourceDigest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

export function mineroSourceEvidence(source) {
  return source.sources.map((entry) => ({
    ...entry,
    ...(entry.fingerprintFields ? {
      contentHash: mineroSourceDigest(Object.fromEntries(entry.fingerprintFields.map((key) => [key, source[key]]))),
    } : {}),
  }));
}

export function tecnologoMineroReconciliation(source) {
  const sourceUrl = source.sources.find(({ id }) => id === "cure-current").url;
  const rows = source.rows;
  const matched = rows.filter(({ sourceCourseId }) => sourceCourseId);
  const periods = source.trajectories[0].periods;
  const periodFor = (id) => periods.find(({ courseIds }) => courseIds.includes(id))?.label ?? "Catálogo flexible";
  return {
    reviewedAt: source.reviewedAt,
    sources: mineroSourceEvidence(source),
    trajectories: source.trajectories.map((trajectory) => ({
      ...trajectory,
      useOnlyConfiguredPeriods: true,
      restrictGeneratedCatalogToPublished: true,
      catalogSourceCourseIds: [...source.electiveRowIds, "validacion-final-plan"],
    })),
    curriculum: {
      sourceUrl,
      sourceDataPath: "data/cure/tecnologo-minero-2012.json",
      strictOfficialCourseIds: true,
      verifiedCourseIds: matched.map(({ sourceCourseId }) => sourceCourseId),
      includeAllCoursesInPathwayCatalog: true,
      courseOverrides: Object.fromEntries(matched.map((row) => [row.sourceCourseId, {
        name: row.officialLabel,
        preserveName: true,
        officialIdentity: true,
        officialCredits: false,
        credits: row.credits,
        requirementId: row.requirementId,
        periodLabel: periodFor(row.id),
      }])),
      additionalCourses: rows.filter(({ sourceCourseId }) => !sourceCourseId).map((row) => ({
        id: row.id,
        sourceCourseId: row.id,
        name: row.officialLabel,
        creditsPublished: false,
        officialCredits: false,
        creditsProvenance: "official-source-no-load",
        requirementId: row.requirementId,
        periodLabel: periodFor(row.id),
        sourceUrl,
      })),
      periodOrder: periods.map(({ label }) => label),
      projectionAnomalies: source.conflicts,
    },
    uiNotice: "Plan conjunto de tres años en Treinta y Tres. La secuencia semestral es sugerida: reproduce el ejemplo vigente de CURE, no una obligación ni oferta garantizada. Se conservan 272 créditos operativos, aunque el Plan aprobado y las preguntas frecuentes de CURE dicen 270. El tutor valida mínimos, pasantía y currículo flexible; tres filas tienen carga no publicada y no acreditan variantes de Bedelías automáticamente.",
    additionalAnomalies: source.conflicts,
    remainingWork: source.reviewCondition,
  };
}
