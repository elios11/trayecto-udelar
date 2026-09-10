import type { PersonalDataDocumentV4, PersonalDataIssue, PersonalDataTermV3 } from "./personal-data.mjs";

export const RECOVERY_STORAGE_KEY: "trayecto-udelar-recovery-v1";
export const RECOVERY_FORMAT: "trayecto-personal-data-recovery";
export const RECOVERY_VERSION: 1;
export const MAX_RECOVERY_SNAPSHOTS: 10;
export const MAX_DELETED_TERMS: 20;

export interface RecoverySnapshot { id: string; createdAt: string; expiresAt: string; reason: string; document: PersonalDataDocumentV4 }
export interface DeletedTermRecovery { id: string; deletedAt: string; expiresAt: string; profileId: string; planId: string; scenarioId: string; originalIndex: number; wasCurrent: boolean; term: PersonalDataTermV3 }
export interface RecoveryStore { format: "trayecto-personal-data-recovery"; formatVersion: 1; snapshots: RecoverySnapshot[]; deletedTerms: DeletedTermRecovery[] }
export type RecoveryResult<T> = { ok: true } & T | { ok: false; issues: PersonalDataIssue[] };

export function emptyRecoveryStore(): RecoveryStore;
export function parseRecoveryStore(input: unknown, options?: { now?: string }): RecoveryResult<{ store: RecoveryStore; issues: PersonalDataIssue[] }>;
export function serializeRecoveryStore(store: RecoveryStore, options?: { now?: string }): string;
export function persistRecoveryStore(store: RecoveryStore, options: { now?: string; write: (serialized: string) => void }): { ok: true; serialized: string } | { ok: false; error: unknown };
export function matchesPersistedRecoveryStore(store: RecoveryStore, serialized: string | null, options?: { now?: string }): boolean;
export function personalDocumentFingerprint(document: unknown): string | null;
export function createRecoverySnapshot(store: RecoveryStore, document: unknown, options: { now: string; id: string; reason: string }): RecoveryResult<{ store: RecoveryStore; created: boolean; snapshot: RecoverySnapshot }>;
export function createDeletedTerm(value: Omit<DeletedTermRecovery, "id" | "deletedAt" | "expiresAt">, options: { now: string; id: string }): DeletedTermRecovery | null;
export function addDeletedTerm(store: RecoveryStore, deletedTerm: DeletedTermRecovery, options: { now: string }): RecoveryResult<{ store: RecoveryStore; item: DeletedTermRecovery }>;
export function removeRecoveryItem(store: RecoveryStore, kind: "snapshot" | "deleted-term", id: string, options?: { now?: string }): RecoveryResult<{ store: RecoveryStore }>;
export function restoreDeletedTerm(document: unknown, deletedTerm: DeletedTermRecovery): RecoveryResult<{ document: PersonalDataDocumentV4; omittedCourseIds: string[] }> | { ok: false; code: "missing_context" | "duplicate_term"; issues: PersonalDataIssue[] };
export function isDeletedTermAlreadyRestored(document: unknown, deletedTerm: DeletedTermRecovery): boolean;
