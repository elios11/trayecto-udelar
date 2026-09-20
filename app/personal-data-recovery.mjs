import { parsePersonalDataV4 } from "./personal-data.mjs";
import { migratePersonalDataV3ToV4 } from "./personal-data-migration.mjs";

export const RECOVERY_STORAGE_KEY = "trayecto-udelar-recovery-v1";
export const RECOVERY_FORMAT = "trayecto-personal-data-recovery";
export const RECOVERY_VERSION = 1;
export const MAX_RECOVERY_SNAPSHOTS = 10;
export const MAX_DELETED_TERMS = 20;
export const SNAPSHOT_RETENTION_DAYS = 90;
export const TRASH_RETENTION_DAYS = 30;

const TERM_STATUSES = new Set(["planned", "in-progress", "closed"]);
const LOAD_UNITS = new Set(["credits", "hours", "courses"]);
const issue = (path, code, message) => ({ path, code, message });
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value) => typeof value === "string" && value.trim() !== "";
const clone = (value) => JSON.parse(JSON.stringify(value));

function normalizeDate(value, path, issues) {
  if (!nonEmpty(value) || !Number.isFinite(Date.parse(value))) {
    issues.push(issue(path, "invalid_date", "La fecha de recuperación no es válida."));
    return null;
  }
  return new Date(value).toISOString();
}

function normalizeTerm(value, path, issues) {
  if (!isRecord(value)) {
    issues.push(issue(path, "invalid_term", "El semestre eliminado no es válido."));
    return null;
  }
  const id = nonEmpty(value.id) ? value.id.trim() : "";
  const label = nonEmpty(value.label) ? value.label.trim() : "";
  if (!id || !label || !TERM_STATUSES.has(value.status) || !Array.isArray(value.courseIds)) {
    issues.push(issue(path, "invalid_term", "El semestre eliminado está incompleto."));
    return null;
  }
  const courseIds = [];
  const seen = new Set();
  for (const [index, courseId] of value.courseIds.entries()) {
    if (!nonEmpty(courseId) || seen.has(courseId)) {
      issues.push(issue(`${path}.courseIds[${index}]`, "invalid_course", "Las materias del semestre deben ser identificadores únicos."));
      return null;
    }
    seen.add(courseId);
    courseIds.push(courseId.trim());
  }
  const startsAt = value.startsAt === null ? null : normalizeDate(value.startsAt, `${path}.startsAt`, issues);
  const endsAt = value.endsAt === null ? null : normalizeDate(value.endsAt, `${path}.endsAt`, issues);
  if ((value.startsAt !== null && !startsAt) || (value.endsAt !== null && !endsAt)) return null;
  if (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    issues.push(issue(`${path}.endsAt`, "invalid_date_order", "El cierre no puede ser anterior al inicio."));
    return null;
  }
  let loadTarget = null;
  if (value.loadTarget !== null && value.loadTarget !== undefined) {
    if (!isRecord(value.loadTarget) || !LOAD_UNITS.has(value.loadTarget.unit) || !Number.isFinite(value.loadTarget.value) || value.loadTarget.value <= 0) {
      issues.push(issue(`${path}.loadTarget`, "invalid_load_target", "La meta de carga del semestre no es válida."));
      return null;
    }
    loadTarget = { unit: value.loadTarget.unit, value: value.loadTarget.value };
  }
  return { id, label, status: value.status, startsAt, endsAt, loadTarget, courseIds };
}

function normalizeSnapshot(value, path, issues) {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.reason)) {
    issues.push(issue(path, "invalid_snapshot", "La instantánea está incompleta."));
    return null;
  }
  const createdAt = normalizeDate(value.createdAt, `${path}.createdAt`, issues);
  const expiresAt = normalizeDate(value.expiresAt, `${path}.expiresAt`, issues);
  const parsed = migratePersonalDataV3ToV4(value.document);
  if (!createdAt || !expiresAt || Date.parse(expiresAt) < Date.parse(createdAt) || !parsed.ok) {
    if (!parsed.ok) issues.push(...parsed.issues.map((entry) => ({ ...entry, path: `${path}.document${entry.path.slice(1)}` })));
    return null;
  }
  return { id: value.id.trim(), createdAt, expiresAt, reason: value.reason.trim(), document: parsed.document };
}

function normalizeDeletedTerm(value, path, issues) {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.profileId) || !nonEmpty(value.planId) || !nonEmpty(value.scenarioId) || !Number.isInteger(value.originalIndex) || value.originalIndex < 0) {
    issues.push(issue(path, "invalid_deleted_term", "El elemento de papelera está incompleto."));
    return null;
  }
  const deletedAt = normalizeDate(value.deletedAt, `${path}.deletedAt`, issues);
  const expiresAt = normalizeDate(value.expiresAt, `${path}.expiresAt`, issues);
  const term = normalizeTerm(value.term, `${path}.term`, issues);
  if (!deletedAt || !expiresAt || Date.parse(expiresAt) < Date.parse(deletedAt) || !term) return null;
  return {
    id: value.id.trim(), deletedAt, expiresAt, profileId: value.profileId.trim(), planId: value.planId.trim(), scenarioId: value.scenarioId.trim(), originalIndex: value.originalIndex, wasCurrent: value.wasCurrent === true, term,
  };
}

function byNewest(left, right) {
  return Date.parse(right.createdAt ?? right.deletedAt) - Date.parse(left.createdAt ?? left.deletedAt);
}

export function emptyRecoveryStore() {
  return { format: RECOVERY_FORMAT, formatVersion: RECOVERY_VERSION, snapshots: [], deletedTerms: [] };
}

export function parseRecoveryStore(input, options = {}) {
  const issues = [];
  const now = normalizeDate(options.now ?? new Date().toISOString(), "$.now", issues);
  if (!now) return { ok: false, issues };
  let value = input;
  if (typeof input === "string") {
    try { value = JSON.parse(input); } catch {
      return { ok: true, store: emptyRecoveryStore(), issues: [issue("$", "invalid_json", "La copia de recuperación no contiene JSON válido.")] };
    }
  }
  if (value === null || value === undefined || value === "") return { ok: true, store: emptyRecoveryStore(), issues };
  if (!isRecord(value) || value.format !== RECOVERY_FORMAT || value.formatVersion !== RECOVERY_VERSION) {
    return { ok: true, store: emptyRecoveryStore(), issues: [issue("$", "unsupported_format", "La copia de recuperación no es compatible.")] };
  }
  const snapshots = Array.isArray(value.snapshots) ? value.snapshots : [];
  const deletedTerms = Array.isArray(value.deletedTerms) ? value.deletedTerms : [];
  if (!Array.isArray(value.snapshots)) issues.push(issue("$.snapshots", "invalid_type", "Las instantáneas deben ser una colección."));
  if (!Array.isArray(value.deletedTerms)) issues.push(issue("$.deletedTerms", "invalid_type", "La papelera debe ser una colección."));
  const snapshotIds = new Set();
  const normalizedSnapshots = snapshots.map((entry, index) => normalizeSnapshot(entry, `$.snapshots[${index}]`, issues)).filter((entry) => {
    if (!entry || snapshotIds.has(entry.id) || Date.parse(entry.expiresAt) <= Date.parse(now)) return false;
    snapshotIds.add(entry.id);
    return true;
  }).sort(byNewest).slice(0, MAX_RECOVERY_SNAPSHOTS);
  const termIds = new Set();
  const normalizedTerms = deletedTerms.map((entry, index) => normalizeDeletedTerm(entry, `$.deletedTerms[${index}]`, issues)).filter((entry) => {
    if (!entry || termIds.has(entry.id) || Date.parse(entry.expiresAt) <= Date.parse(now)) return false;
    termIds.add(entry.id);
    return true;
  }).sort(byNewest).slice(0, MAX_DELETED_TERMS);
  return { ok: true, store: { format: RECOVERY_FORMAT, formatVersion: RECOVERY_VERSION, snapshots: normalizedSnapshots, deletedTerms: normalizedTerms }, issues };
}

export function serializeRecoveryStore(store, options = {}) {
  const parsed = parseRecoveryStore(store, options);
  if (!parsed.ok) throw new TypeError("La copia de recuperación no es válida.");
  return JSON.stringify(parsed.store);
}

export function persistRecoveryStore(store, options = {}) {
  if (typeof options.write !== "function") return { ok: false, error: new TypeError("La escritura de recuperación no está disponible.") };
  try {
    const serialized = serializeRecoveryStore(store, options);
    options.write(serialized);
    return { ok: true, serialized };
  } catch (error) {
    return { ok: false, error };
  }
}

export function matchesPersistedRecoveryStore(store, serialized, options = {}) {
  if (typeof serialized !== "string") return false;
  try {
    return serializeRecoveryStore(store, options) === serialized;
  } catch {
    return false;
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

export function personalDocumentFingerprint(document) {
  const parsed = migratePersonalDataV3ToV4(document);
  if (!parsed.ok) return null;
  const semantic = { ...parsed.document };
  delete semantic.revision;
  delete semantic.createdAt;
  delete semantic.updatedAt;
  return JSON.stringify(canonicalize(semantic));
}

export function createRecoverySnapshot(store, document, options = {}) {
  const now = options.now;
  const reason = options.reason;
  const id = options.id;
  const parsedStore = parseRecoveryStore(store, { now });
  const parsedDocument = migratePersonalDataV3ToV4(document);
  if (!parsedStore.ok || !parsedDocument.ok || !nonEmpty(reason) || !nonEmpty(id)) {
    return { ok: false, issues: [...(parsedStore.issues ?? []), ...(parsedDocument.issues ?? []), ...(!nonEmpty(reason) ? [issue("$.reason", "invalid_text", "La instantánea necesita un motivo.")] : []), ...(!nonEmpty(id) ? [issue("$.id", "invalid_id", "La instantánea necesita un identificador.")] : [])] };
  }
  const createdAt = normalizeDate(now, "$.now", []);
  const expiresAt = new Date(Date.parse(createdAt) + SNAPSHOT_RETENTION_DAYS * 86400000).toISOString();
  const fingerprint = personalDocumentFingerprint(parsedDocument.document);
  const previous = parsedStore.store.snapshots[0];
  if (previous && personalDocumentFingerprint(previous.document) === fingerprint) return { ok: true, store: parsedStore.store, created: false, snapshot: previous };
  const snapshot = { id: id.trim(), createdAt, expiresAt, reason: reason.trim(), document: parsedDocument.document };
  const normalized = parseRecoveryStore({ ...parsedStore.store, snapshots: [snapshot, ...parsedStore.store.snapshots] }, { now: createdAt });
  return { ok: true, store: normalized.store, created: true, snapshot };
}

export function addDeletedTerm(store, deletedTerm, options = {}) {
  const now = options.now;
  const parsedStore = parseRecoveryStore(store, { now });
  const issues = [...(parsedStore.issues ?? [])];
  const item = normalizeDeletedTerm(deletedTerm, "$.deletedTerm", issues);
  if (!parsedStore.ok || !item) return { ok: false, issues };
  const normalized = parseRecoveryStore({ ...parsedStore.store, deletedTerms: [item, ...parsedStore.store.deletedTerms.filter((entry) => entry.id !== item.id)] }, { now });
  return { ok: true, store: normalized.store, item };
}

export function createDeletedTerm(value, options = {}) {
  const now = normalizeDate(options.now, "$.now", []);
  if (!now || !nonEmpty(options.id)) return null;
  return {
    id: options.id.trim(), deletedAt: now, expiresAt: new Date(Date.parse(now) + TRASH_RETENTION_DAYS * 86400000).toISOString(),
    profileId: value.profileId, planId: value.planId, scenarioId: value.scenarioId, originalIndex: value.originalIndex, wasCurrent: value.wasCurrent === true, term: clone(value.term),
  };
}

export function removeRecoveryItem(store, kind, id, options = {}) {
  const parsed = parseRecoveryStore(store, options);
  if (!parsed.ok || !nonEmpty(id)) return { ok: false, issues: parsed.issues ?? [issue("$.id", "invalid_id", "El identificador no es válido.")] };
  const key = kind === "snapshot" ? "snapshots" : kind === "deleted-term" ? "deletedTerms" : null;
  if (!key) return { ok: false, issues: [issue("$.kind", "invalid_kind", "El tipo de elemento no es válido.")] };
  return { ok: true, store: { ...parsed.store, [key]: parsed.store[key].filter((item) => item.id !== id) } };
}

export function restoreDeletedTerm(document, deletedTerm) {
  const parsedDocument = migratePersonalDataV3ToV4(document);
  const issues = [];
  const item = normalizeDeletedTerm(deletedTerm, "$.deletedTerm", issues);
  if (!parsedDocument.ok || !item) return { ok: false, issues: [...(parsedDocument.issues ?? []), ...issues] };
  const next = clone(parsedDocument.document);
  const profile = next.profiles.find((candidate) => candidate.id === item.profileId && candidate.selection.planId === item.planId);
  const scenario = profile?.planning.scenarios.find((candidate) => candidate.id === item.scenarioId);
  if (!scenario) return { ok: false, code: "missing_context", issues: [issue("$.deletedTerm", "missing_context", "El plan o semestre original todavía no existe.")] };
  if (scenario.archived) return { ok: false, code: "scenario_archived", issues: [issue("$.deletedTerm.scenarioId", "scenario_archived", "Restaurá el escenario original antes de recuperar este semestre.")] };
  if (scenario.terms.some((term) => term.id === item.term.id)) return { ok: false, code: "duplicate_term", issues: [issue("$.deletedTerm.term.id", "duplicate_id", "Ya existe un semestre con ese identificador.")] };
  const assigned = new Set(scenario.terms.flatMap((term) => term.courseIds));
  const omittedCourseIds = item.term.courseIds.filter((courseId) => assigned.has(courseId));
  const restoredTerm = { ...item.term, courseIds: item.term.courseIds.filter((courseId) => !assigned.has(courseId)) };
  scenario.terms.splice(Math.min(item.originalIndex, scenario.terms.length), 0, restoredTerm);
  if (item.wasCurrent) scenario.currentTermId = restoredTerm.id;
  scenario.updatedAt = next.updatedAt;
  const checked = parsePersonalDataV4(next);
  return checked.ok ? { ok: true, document: checked.document, omittedCourseIds } : { ok: false, issues: checked.issues };
}

export function isDeletedTermAlreadyRestored(document, deletedTerm) {
  const parsedDocument = migratePersonalDataV3ToV4(document);
  const issues = [];
  const item = normalizeDeletedTerm(deletedTerm, "$.deletedTerm", issues);
  if (!parsedDocument.ok || !item) return false;
  const profile = parsedDocument.document.profiles.find((candidate) => candidate.id === item.profileId && candidate.selection.planId === item.planId);
  const scenario = profile?.planning.scenarios.find((candidate) => candidate.id === item.scenarioId);
  return Boolean(scenario?.terms.some((term) => term.id === item.term.id));
}
