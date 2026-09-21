import type { CurriculumAlias } from "./curriculum-revisions.mjs";
import type { PersonalDataAcademicProfileV4, PersonalDataDocumentV4 } from "./personal-data.mjs";

export const CURRICULUM_SNAPSHOTS_EXTENSION: "org.trayecto.curriculumSnapshots";
export type CurriculumSnapshot = {
  schemaVersion: 1;
  planId: string;
  revision: string;
  courses: Array<Record<string, unknown> & { id: string }>;
  nodes: Array<Record<string, unknown> & { id: string }>;
  credentials: Array<Record<string, unknown> & { id: string }>;
  rules: Array<Record<string, unknown> & { id: string }>;
};
export type CurriculumDifference = {
  kind: "added" | "removed" | "retired" | "aliased" | "changed";
  entity: "course" | "node" | "credential" | "rule";
  id: string;
  severity: "informational" | "review" | "blocked";
  affectsPersonalData: boolean;
  before: unknown;
  after: unknown;
};
export type CurriculumComparison = {
  status: "equivalent" | "changed" | "protected";
  adoptionAllowed: boolean;
  severity: "informational" | "review" | "blocked";
  differences: CurriculumDifference[];
  reason: string | null;
};
export function createCurriculumSnapshot(input: { planId: string; revision: string; courses?: unknown[]; creditStructure?: Record<string, unknown>; rules?: unknown[] }): CurriculumSnapshot;
export function compareCurriculumSnapshots(previous: unknown, current: unknown, options?: { personalCourseIds?: string[]; aliases?: CurriculumAlias[] }): CurriculumComparison;
export function readCurriculumSnapshot(document: PersonalDataDocumentV4, planId: string, revision: string): CurriculumSnapshot | null;
export function storeCurriculumSnapshot(document: PersonalDataDocumentV4, snapshot: CurriculumSnapshot): PersonalDataDocumentV4;
export function personalCourseIdsForProfile(profile: PersonalDataAcademicProfileV4): string[];
