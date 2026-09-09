export const CURRICULUM_REVISION_EPOCH = "2026-09-09";

export function curriculumRevisionForPlan(planId) {
  if (typeof planId !== "string" || planId.trim() === "") throw new TypeError("El plan necesita un identificador.");
  return `trayecto-curriculum:${planId}:${CURRICULUM_REVISION_EPOCH}`;
}

export function validateCurriculumAliases(aliases) {
  if (!Array.isArray(aliases)) return { ok: false, issues: ["El registro de alias debe ser una colección."] };
  const issues = [];
  const identities = new Set();
  aliases.forEach((alias, index) => {
    const prefix = `Alias ${index + 1}`;
    if (!alias || typeof alias !== "object") {
      issues.push(`${prefix}: debe ser un objeto.`);
      return;
    }
    if (!["rename", "equivalence", "retired"].includes(alias.kind)) issues.push(`${prefix}: tipo inválido.`);
    if (![alias.planId, alias.fromCourseId, alias.effectiveAt, alias.sourceUrl].every((value) => typeof value === "string" && value.trim() !== "")) issues.push(`${prefix}: faltan identidad, fecha o fuente.`);
    if (!Number.isFinite(Date.parse(alias.effectiveAt))) issues.push(`${prefix}: fecha inválida.`);
    try {
      const source = new URL(alias.sourceUrl);
      if (source.protocol !== "https:") issues.push(`${prefix}: la fuente debe usar HTTPS.`);
    } catch {
      issues.push(`${prefix}: fuente inválida.`);
    }
    if (alias.kind !== "retired" && (typeof alias.toCourseId !== "string" || alias.toCourseId.trim() === "")) issues.push(`${prefix}: falta la materia de destino.`);
    if (alias.kind === "retired" && alias.toCourseId !== null) issues.push(`${prefix}: una materia retirada no debe apuntar a otra materia.`);
    const identity = `${alias.planId}|${alias.fromCourseId}`;
    if (identities.has(identity)) issues.push(`${prefix}: la referencia de origen está repetida.`);
    identities.add(identity);
  });
  return issues.length ? { ok: false, issues } : { ok: true, aliases: aliases.map((alias) => ({ ...alias })) };
}

export function resolveCurriculumCourseReference(courseId, currentCourseIds, aliases = []) {
  const current = currentCourseIds instanceof Set ? currentCourseIds : new Set(currentCourseIds ?? []);
  if (current.has(courseId)) return { status: "current", courseId };
  const alias = aliases.find((candidate) => candidate.fromCourseId === courseId) ?? null;
  if (!alias) return { status: "orphaned", courseId };
  if (alias.kind === "retired" || alias.toCourseId === null) return { status: "retired", courseId, alias };
  if (!current.has(alias.toCourseId)) return { status: "orphaned", courseId, alias };
  return { status: "aliased", courseId: alias.toCourseId, originalCourseId: courseId, alias };
}

export function classifyCurriculumReferences(document, courseIdsByPlan, aliases = []) {
  const references = [];
  for (const profile of document.profiles ?? []) {
    const currentIds = courseIdsByPlan.get(profile.selection.planId) ?? new Set();
    const planAliases = aliases.filter((alias) => alias.planId === profile.selection.planId);
    const ids = new Set([
      ...profile.progress.map((entry) => entry.courseId),
      ...profile.planning.scenarios.flatMap((scenario) => scenario.terms.flatMap((term) => term.courseIds)),
    ]);
    for (const courseId of ids) {
      references.push({ planId: profile.selection.planId, ...resolveCurriculumCourseReference(courseId, currentIds, planAliases) });
    }
  }
  return references;
}
