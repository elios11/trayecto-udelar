import type { PersonalDataDocumentV4 } from "./personal-data.mjs";

export const PERSONAL_DATA_LOCK_KEY: string;
export const PERSONAL_DATA_CONFLICTS_KEY: string;
export const PERSONAL_DATA_EXTERNAL_MARKER_KEY: string;

export interface LocalDataConflict {
  id: string;
  detectedAt: string;
  reason: "stale-write" | "external-change";
  localDocument: PersonalDataDocumentV4;
  externalDocument: PersonalDataDocumentV4;
}

export interface LocalConflictStore { format: "trayecto-local-conflicts"; formatVersion: 1; items: LocalDataConflict[]; }

export function writeWithLocalLease(serialized: string, options: {
  dataKey: string;
  expectedSerialized: string | null;
  ownerId: string;
  read: (key: string) => string | null;
  write: (key: string, value: string) => void;
  remove: (key: string) => void;
  randomId: () => string;
  now?: () => number;
  lockKey?: string;
}): { ok: true; serialized: string } | { ok: false; kind: "busy" | "conflict"; currentSerialized: string | null };
export function classifyExternalChange(options: {
  knownSerialized: string | null;
  actualSerialized: string | null;
  eventOldValue: string | null;
  eventNewValue: string | null;
  hasUnsavedChanges: boolean;
  knownRevision?: number | null;
  eventNewRevision?: number | null;
}): "ignore" | "incorporate" | "conflict";
export function parseLocalConflictStore(raw: unknown): LocalConflictStore;
export function addLocalConflict(store: LocalConflictStore, conflict: LocalDataConflict): LocalConflictStore;
export function serializeLocalConflictStore(store: LocalConflictStore): string;
