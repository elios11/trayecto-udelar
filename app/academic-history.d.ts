import type { PersonalDataExtensions, PersonalDataProgressStatus } from "./personal-data.mjs";

export type AcademicHistoryKind = "course-passed" | "exemption" | "exam-passed" | "accreditation" | "recorded-status";
export type AcademicHistorySource = "user" | "migration" | "import";
export interface AcademicHistoryEvent {
  id: string;
  courseId: string;
  kind: AcademicHistoryKind;
  resultStatus: Exclude<PersonalDataProgressStatus, "pending">;
  occurredAt: string | null;
  recordedAt: string;
  revision: number;
  supersedesEventId: string | null;
  voided: boolean;
  source: AcademicHistorySource;
  extensions?: PersonalDataExtensions;
}
export interface AcademicHistory { events: AcademicHistoryEvent[]; extensions?: PersonalDataExtensions }
export interface AcademicHistoryIssue { path: string; code: string; message: string }

export function validateAcademicHistory(value: unknown, path?: string): { ok: true; history: AcademicHistory } | { ok: false; issues: AcademicHistoryIssue[] };
export function effectiveAcademicHistoryEvents(history: AcademicHistory): AcademicHistoryEvent[];
export function deriveCourseStatuses(history: AcademicHistory): Record<string, "approved" | "exonerated">;
export function academicHistoryForCourse(history: AcademicHistory, courseId: string): Array<AcademicHistoryEvent & { terminal: boolean }>;
export function addAcademicHistoryEvent(history: AcademicHistory, input: { courseId: string; kind: AcademicHistoryKind; resultStatus?: "approved" | "exonerated"; occurredAt?: string | null; source?: AcademicHistorySource; extensions?: PersonalDataExtensions }, options: { id: string; recordedAt: string }): AcademicHistory;
export function correctAcademicHistoryEvent(history: AcademicHistory, eventId: string, changes: { kind?: AcademicHistoryKind; resultStatus?: "approved" | "exonerated"; occurredAt?: string | null; source?: AcademicHistorySource }, options: { id: string; recordedAt: string }): AcademicHistory;
export function setAcademicHistoryEventVoided(history: AcademicHistory, eventId: string, voided: boolean, options: { id: string; recordedAt: string }): AcademicHistory;
export function migrateProgressToAcademicHistory(progress: Array<{ courseId: string; status: PersonalDataProgressStatus; updatedAt: string | null; extensions?: PersonalDataExtensions }>, options: { progressPlanId: string; recordedAt: string }): AcademicHistory;
