import { migratePersonalDataV3ToV4 } from "./personal-data-migration.mjs";

export const PERSONAL_DATA_LOCK_KEY = "trayecto-udelar-personal-data-lock-v1";
export const PERSONAL_DATA_CONFLICTS_KEY = "trayecto-udelar-personal-data-conflicts-v1";
export const PERSONAL_DATA_EXTERNAL_MARKER_KEY = "trayecto-udelar-external-change-v1";

const LOCK_TTL_MS = 5_000;
const MAX_CONFLICTS = 5;

export function writeWithLocalLease(serialized, options) {
  const ownerId = options.ownerId;
  const now = Number(options.now?.() ?? Date.now());
  const lockKey = options.lockKey ?? PERSONAL_DATA_LOCK_KEY;
  const existingLock = parseLock(options.read(lockKey));
  if (existingLock && existingLock.ownerId !== ownerId && existingLock.expiresAt > now) {
    return { ok: false, kind: "busy", currentSerialized: options.read(options.dataKey) };
  }

  const token = `${ownerId}:${now}:${options.randomId()}`;
  const lock = JSON.stringify({ ownerId, token, expiresAt: now + LOCK_TTL_MS });
  options.write(lockKey, lock);
  if (parseLock(options.read(lockKey))?.token !== token) {
    return { ok: false, kind: "busy", currentSerialized: options.read(options.dataKey) };
  }

  try {
    const currentSerialized = options.read(options.dataKey);
    if (currentSerialized !== (options.expectedSerialized ?? null)) {
      return { ok: false, kind: "conflict", currentSerialized };
    }
    if (parseLock(options.read(lockKey))?.token !== token) {
      return { ok: false, kind: "busy", currentSerialized };
    }
    options.write(options.dataKey, serialized);
    const confirmed = options.read(options.dataKey);
    if (confirmed !== serialized) return { ok: false, kind: "conflict", currentSerialized: confirmed };
    return { ok: true, serialized };
  } finally {
    if (parseLock(options.read(lockKey))?.token === token) options.remove(lockKey);
  }
}

export function classifyExternalChange({ knownSerialized, actualSerialized, eventOldValue, eventNewValue, hasUnsavedChanges, knownRevision, eventNewRevision }) {
  if (!eventNewValue || eventNewValue !== actualSerialized || eventNewValue === knownSerialized) return "ignore";
  const advancesRevision = !Number.isInteger(knownRevision) || (Number.isInteger(eventNewRevision) && eventNewRevision > knownRevision);
  if (!hasUnsavedChanges && eventOldValue === knownSerialized && advancesRevision) return "incorporate";
  return "conflict";
}

export function parseLocalConflictStore(raw) {
  if (typeof raw !== "string" || raw.length === 0) return { format: "trayecto-local-conflicts", formatVersion: 1, items: [] };
  try {
    const value = JSON.parse(raw);
    if (value?.format !== "trayecto-local-conflicts" || value?.formatVersion !== 1 || !Array.isArray(value.items)) throw new TypeError("invalid conflict store");
    return { ...value, items: value.items.map(normalizeConflict).filter(Boolean).slice(0, MAX_CONFLICTS) };
  } catch {
    return { format: "trayecto-local-conflicts", formatVersion: 1, items: [] };
  }
}

export function addLocalConflict(store, conflict) {
  const normalized = normalizeConflict(conflict);
  if (!normalized) throw new TypeError("invalid conflict");
  const items = [normalized, ...store.items.filter((item) => item.id !== normalized.id)].slice(0, MAX_CONFLICTS);
  return { format: "trayecto-local-conflicts", formatVersion: 1, items };
}

export function serializeLocalConflictStore(store) {
  return JSON.stringify(store);
}

function parseLock(raw) {
  try {
    const value = JSON.parse(raw);
    return typeof value?.ownerId === "string" && typeof value?.token === "string" && Number.isFinite(value?.expiresAt) ? value : null;
  } catch {
    return null;
  }
}

function normalizeConflict(value) {
  if (!(value && typeof value.id === "string" && typeof value.detectedAt === "string"
    && Number.isFinite(Date.parse(value.detectedAt))
    && ["stale-write", "external-change"].includes(value.reason))) return null;
  const local = migratePersonalDataV3ToV4(value.localDocument);
  const external = migratePersonalDataV3ToV4(value.externalDocument);
  return local.ok && external.ok ? { ...value, localDocument: local.document, externalDocument: external.document } : null;
}
