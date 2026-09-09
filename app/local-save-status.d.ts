export type LocalSavePhase = "checking" | "saved" | "external" | "conflict" | "failed";
export type LocalSaveErrorKind = "quota" | "blocked" | "corrupt" | "unknown";
export interface LocalSaveStatus { phase: LocalSavePhase; savedAt: string | null; errorKind: LocalSaveErrorKind | null; }
export const LOCAL_SAVE_PHASES: LocalSavePhase[];
export const LOCAL_SAVE_ERROR_KINDS: LocalSaveErrorKind[];
export function initialLocalSaveStatus(): LocalSaveStatus;
export function savedLocalSaveStatus(savedAt: unknown): LocalSaveStatus;
export function externalLocalSaveStatus(savedAt: unknown): LocalSaveStatus;
export function conflictedLocalSaveStatus(savedAt: unknown): LocalSaveStatus;
export function classifyLocalSaveError(error: unknown): LocalSaveErrorKind;
export function failedLocalSaveStatus(error?: unknown, options?: { savedAt?: unknown; errorKind?: LocalSaveErrorKind }): LocalSaveStatus;
export function localSaveStatusPresentation(status: LocalSaveStatus): { title: string; detail: string; canRetry: boolean };
export function persistLocalDocument<T>(document: T, options: { serialize: (document: T) => string; write: (serialized: string) => void; previousSavedAt?: unknown }): { ok: true; serialized: string; status: LocalSaveStatus } | { ok: false; error: unknown; status: LocalSaveStatus };
