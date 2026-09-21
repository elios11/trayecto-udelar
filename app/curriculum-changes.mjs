export const CURRICULUM_SNAPSHOTS_EXTENSION = "org.trayecto.curriculumSnapshots";

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
};

const stableString = (value) => JSON.stringify(stableValue(value));

const stableHash = (value) => {
  const input = stableString(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const compact = (value) => {
  if (Array.isArray(value)) return value.map(compact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .map(([key, child]) => [key, compact(child)]));
};

const byId = (entries = []) => new Map(entries.map((entry) => [entry.id, entry]));

function normalizedCourse(course) {
  return compact({
    id: course.id,
    code: course.bedeliasCode ?? course.code ?? null,
    name: course.name,
    credits: Number.isFinite(course.credits) ? course.credits : null,
    hours: Number.isFinite(course.hours) ? course.hours : null,
    areas: [...new Set(course.eligibleRequirementIds ?? [])].sort(),
    allocations: [...(course.creditAllocations ?? [])]
      .map((allocation) => compact({ nodeId: allocation.nodeId, credits: allocation.credits }))
      .sort((a, b) => `${a.nodeId}:${a.credits}`.localeCompare(`${b.nodeId}:${b.credits}`)),
    prerequisites: [...new Set(course.prerequisites ?? [])].sort(),
  });
}

function normalizedCredential(credential) {
  return compact({
    id: credential.id,
    title: credential.title,
    minTotalCredits: credential.minTotalCredits ?? null,
    nodeRequirements: [...(credential.nodeRequirements ?? [])].sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
    alternativeNodeRequirements: [...(credential.alternativeNodeRequirements ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
    requiredCourseGroups: [...(credential.requiredCourseGroups ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
    requiredActivities: [...(credential.requiredActivities ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
  });
}

export function createCurriculumSnapshot({ planId, revision, courses = [], creditStructure = {}, rules = [] }) {
  if (typeof planId !== "string" || !planId.trim()) throw new TypeError("La referencia curricular necesita un plan.");
  if (typeof revision !== "string" || !revision.trim()) throw new TypeError("La referencia curricular necesita una revisión.");
  return {
    schemaVersion: 1,
    planId,
    revision,
    courses: courses.map(normalizedCourse).sort((a, b) => a.id.localeCompare(b.id)),
    nodes: [...(creditStructure.nodes ?? [])].map((node) => compact({
      id: node.id,
      parentId: node.parentId ?? null,
      kind: node.kind,
      name: node.name,
      minCredits: node.minCredits ?? null,
    })).sort((a, b) => a.id.localeCompare(b.id)),
    credentials: [...(creditStructure.credentials ?? [])].map(normalizedCredential).sort((a, b) => a.id.localeCompare(b.id)),
    rules: rules.map((rule) => compact({
      id: `${rule.target?.code ?? ""}:${rule.target?.assessment ?? ""}`,
      target: rule.target ?? null,
      expressionFingerprint: stableHash(rule.expression ?? null),
      noPublishedRule: rule.noPublishedRule ?? false,
    })).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function difference({ kind, entity, id, before = null, after = null, severity = "review", personal = false }) {
  return { kind, entity, id, severity, affectsPersonalData: personal, before, after };
}

function compareEntities(entity, previousEntries, currentEntries, personalIds, aliases, differences) {
  const previous = byId(previousEntries);
  const current = byId(currentEntries);
  for (const [id, before] of previous) {
    const after = current.get(id);
    if (after) {
      if (stableString(before) !== stableString(after)) differences.push(difference({
        kind: "changed", entity, id, before, after,
        severity: entity === "course" || entity === "rule" || entity === "credential" ? "review" : "informational",
        personal: entity === "course" && personalIds.has(id),
      }));
      continue;
    }
    if (entity === "course") {
      const alias = aliases.find((candidate) => candidate.fromCourseId === id);
      if (alias?.kind !== "retired" && alias?.toCourseId && current.has(alias.toCourseId)) {
        differences.push(difference({ kind: "aliased", entity, id, before, after: current.get(alias.toCourseId), severity: "review", personal: personalIds.has(id) }));
      } else {
        differences.push(difference({ kind: alias?.kind === "retired" ? "retired" : "removed", entity, id, before, severity: personalIds.has(id) ? "blocked" : "review", personal: personalIds.has(id) }));
      }
    } else differences.push(difference({ kind: "removed", entity, id, before, severity: "review" }));
  }
  for (const [id, after] of current) {
    if (!previous.has(id) && !aliases.some((alias) => alias.toCourseId === id && previous.has(alias.fromCourseId))) {
      differences.push(difference({ kind: "added", entity, id, after, severity: "informational" }));
    }
  }
}

export function compareCurriculumSnapshots(previous, current, { personalCourseIds = [], aliases = [] } = {}) {
  if (!previous || !current || previous.schemaVersion !== 1 || current.schemaVersion !== 1) {
    return { status: "protected", adoptionAllowed: false, severity: "blocked", differences: [], reason: "La referencia histórica no es compatible o está incompleta." };
  }
  if (previous.planId !== current.planId) {
    return { status: "protected", adoptionAllowed: false, severity: "blocked", differences: [], reason: "Las referencias pertenecen a planes distintos." };
  }
  const personalIds = new Set(personalCourseIds);
  const planAliases = aliases.filter((alias) => alias.planId === current.planId);
  const differences = [];
  compareEntities("course", previous.courses, current.courses, personalIds, planAliases, differences);
  compareEntities("node", previous.nodes, current.nodes, personalIds, planAliases, differences);
  compareEntities("credential", previous.credentials, current.credentials, personalIds, planAliases, differences);
  compareEntities("rule", previous.rules, current.rules, personalIds, planAliases, differences);
  differences.sort((a, b) => `${a.severity}|${a.entity}|${a.id}|${a.kind}`.localeCompare(`${b.severity}|${b.entity}|${b.id}|${b.kind}`));
  const severity = differences.some((item) => item.severity === "blocked")
    ? "blocked"
    : differences.some((item) => item.severity === "review") ? "review" : "informational";
  return {
    status: differences.length ? "changed" : "equivalent",
    adoptionAllowed: severity !== "blocked",
    severity,
    differences,
    reason: null,
  };
}

export function readCurriculumSnapshot(document, planId, revision) {
  const collection = document?.extensions?.[CURRICULUM_SNAPSHOTS_EXTENSION];
  const snapshot = collection && typeof collection === "object" && !Array.isArray(collection)
    ? collection[`${planId}|${revision}`]
    : null;
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? cloneJson(snapshot) : null;
}

export function storeCurriculumSnapshot(document, snapshot) {
  const key = `${snapshot.planId}|${snapshot.revision}`;
  const existing = document?.extensions?.[CURRICULUM_SNAPSHOTS_EXTENSION];
  return {
    ...document,
    extensions: {
      ...(document.extensions ?? {}),
      [CURRICULUM_SNAPSHOTS_EXTENSION]: {
        ...(existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {}),
        [key]: cloneJson(snapshot),
      },
    },
  };
}

export function personalCourseIdsForProfile(profile) {
  return [...new Set([
    ...(profile?.progress ?? []).map((entry) => entry.courseId),
    ...(profile?.academicHistory?.events ?? []).map((event) => event.courseId),
    ...(profile?.planning?.scenarios ?? []).flatMap((scenario) => scenario.terms.flatMap((term) => term.courseIds)),
  ])].sort();
}
