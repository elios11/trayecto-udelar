import type { PersonalDataDocumentV4, PersonalDataIssue, PersonalDataLoadTargetV3, PersonalDataLoadUnit, PersonalDataSelectionV3 } from "./personal-data.mjs";
import type { AcademicHistory } from "./academic-history.mjs";

export const PERSONAL_DATA_STORAGE_KEY: "trayecto-udelar-personal-data-v4";
export const LEGACY_PERSONAL_DATA_V3_STORAGE_KEY: "trayecto-udelar-personal-data-v3";
export const LEGACY_PROGRESS_STORAGE_KEY: "trayecto-udelar-progress-v2";
export const LEGACY_COMPUTATION_PROGRESS_STORAGE_KEY: "trayecto-udelar-demo-v1";
export const LEGACY_PLANNER_STORAGE_KEY: "trayecto-udelar-planner-v1";
export const LEGACY_CURRENT_TERM_STORAGE_KEY: "trayecto-udelar-current-term-v1";
export const LEGACY_ACADEMIC_SELECTION_STORAGE_KEY: "trayecto-udelar-academic-selection-v1";

export type PersonalDataCatalogEntry = {
  facultyId: string;
  careerId: string;
  planId: string;
  progressPlanId: string;
  curriculumRevision?: string | null;
  defaultTrajectoryId: string | null;
  defaultCredentialId: string | null;
  trajectoryIds?: string[];
  campusIds?: string[];
  credentialIds?: string[];
  loadUnit: PersonalDataLoadUnit;
};

export type PlannerAppTerm = { id: string; label: string; startsAt?: string | null; endsAt?: string | null; loadTarget: PersonalDataLoadTargetV3 | null; courseIds: string[] };
export type LegacyPlannerTerm = Omit<PlannerAppTerm, "startsAt" | "endsAt">;
export type LegacyPlannerTransfer = { terms: PlannerAppTerm[]; currentTermId: string | null };
export type PersonalDataAppState = {
  progress: Record<string, Record<string, "pending" | "approved" | "exonerated">>;
  academicHistories: Record<string, AcademicHistory>;
  plannerPlans: Record<string, PlannerAppTerm[]>;
  currentPlannerTerms: Record<string, string | null>;
  selection: PersonalDataSelectionV3 | null;
  activeProfileId?: string | null;
  activeScenarioId?: string | null;
};

export type MigrationResult<T> =
  | ({ ok: true; issues: PersonalDataIssue[] } & T)
  | { ok: false; issues: PersonalDataIssue[]; source?: string };

export function migrateLegacyStateToPersonalData(
  legacy: { progressV2?: unknown; progressV1?: unknown; plannerV1?: unknown; currentTermV1?: unknown; selectionV1?: unknown },
  options: { catalog: PersonalDataCatalogEntry[]; now: string; documentId: string },
): MigrationResult<{ document: PersonalDataDocumentV4 }>;
export function migratePersonalDataV3ToV4(value: unknown): MigrationResult<{ document: PersonalDataDocumentV4; migrated: boolean }>;
export function hydratePersonalData(
  rawStorage: { personalDataV4?: string | null; personalDataV3?: string | null; progressV2?: string | null; progressV1?: string | null; plannerV1?: string | null; currentTermV1?: string | null; selectionV1?: string | null },
  options: { catalog: PersonalDataCatalogEntry[]; now: string; documentId: string },
): MigrationResult<{ document: PersonalDataDocumentV4; state: PersonalDataAppState; source: "v4" | "v3" | "legacy"; shouldPersist: boolean; canonicalWriteBlocked: boolean }>;
export function personalDataToAppState(document: unknown, catalog: PersonalDataCatalogEntry[]): MigrationResult<{ document: PersonalDataDocumentV4; state: PersonalDataAppState }>;
export function appStateToPersonalData(
  state: PersonalDataAppState,
  options: { catalog: PersonalDataCatalogEntry[]; now: string; documentId?: string; previousDocument?: PersonalDataDocumentV4 | null },
): MigrationResult<{ document: PersonalDataDocumentV4 }>;
export function parseCompleteTransfer(value: unknown, options: { catalog: PersonalDataCatalogEntry[]; now: string; documentId: string }): MigrationResult<{ document: PersonalDataDocumentV4; state: PersonalDataAppState; sourceVersion: number }>;
export function parsePlannerTransferFile(value: unknown, options: { catalog: PersonalDataCatalogEntry[]; now: string; documentId: string; planId: string }): MigrationResult<{ planner: LegacyPlannerTransfer; sourceVersion: number }>;
export function serializePersonalDataForStorage(document: PersonalDataDocumentV4): string;
export function personalDataStateFingerprint(state: PersonalDataAppState): string;
