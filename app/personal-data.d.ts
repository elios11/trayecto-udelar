export const PERSONAL_DATA_FORMAT: "trayecto-personal-data";
export const PERSONAL_DATA_VERSION: 3;

export type PersonalDataLoadUnit = "credits" | "hours" | "courses";
export type PersonalDataProgressStatus = "pending" | "approved" | "exonerated";
export type PersonalDataTermStatus = "planned" | "in-progress" | "closed";
export type PersonalDataJsonValue = null | boolean | number | string | PersonalDataJsonValue[] | { [key: string]: PersonalDataJsonValue };
export type PersonalDataExtensions = Record<string, PersonalDataJsonValue>;

export interface PersonalDataIssue {
  path: string;
  code: string;
  message: string;
}

export interface PersonalDataSelectionV3 {
  facultyId: string;
  careerId: string;
  planId: string;
  progressPlanId: string;
  campusId: string | null;
  trajectoryId: string | null;
  credentialId: string | null;
  extensions?: PersonalDataExtensions;
}

export interface PersonalDataProgressEntryV3 {
  courseId: string;
  status: PersonalDataProgressStatus;
  updatedAt: string | null;
  extensions?: PersonalDataExtensions;
}

export interface PersonalDataLoadTargetV3 {
  unit: PersonalDataLoadUnit;
  value: number;
}

export interface PersonalDataTermV3 {
  id: string;
  label: string;
  status: PersonalDataTermStatus;
  startsAt: string | null;
  endsAt: string | null;
  loadTarget: PersonalDataLoadTargetV3 | null;
  courseIds: string[];
  extensions?: PersonalDataExtensions;
}

export interface PersonalDataScenarioV3 {
  id: string;
  name: string;
  isPrimary: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  currentTermId: string | null;
  terms: PersonalDataTermV3[];
  extensions?: PersonalDataExtensions;
}

export interface PersonalDataPlanningV3 {
  activeScenarioId: string | null;
  scenarios: PersonalDataScenarioV3[];
  extensions?: PersonalDataExtensions;
}

export interface PersonalDataAcademicProfileV3 {
  id: string;
  selection: PersonalDataSelectionV3;
  curriculumRevision: string | null;
  loadUnit: PersonalDataLoadUnit;
  progress: PersonalDataProgressEntryV3[];
  planning: PersonalDataPlanningV3;
  extensions?: PersonalDataExtensions;
}

export interface PersonalDataDocumentV3 {
  format: typeof PERSONAL_DATA_FORMAT;
  formatVersion: typeof PERSONAL_DATA_VERSION;
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  lastModifiedByDeviceId: string | null;
  activeProfileId: string | null;
  profiles: PersonalDataAcademicProfileV3[];
  extensions?: PersonalDataExtensions;
}

export type PersonalDataParseResult =
  | { ok: true; document: PersonalDataDocumentV3 }
  | { ok: false; issues: PersonalDataIssue[] };

export class PersonalDataValidationError extends TypeError {
  issues: PersonalDataIssue[];
}

export function parsePersonalDataV3(input: unknown): PersonalDataParseResult;
export function classifyPersonalDataCompatibility(input: unknown): {
  status: "supported" | "legacy-migratable" | "future-protected" | "incompatible";
  formatVersion: number | null;
};
export function serializePersonalDataV3(document: PersonalDataDocumentV3): string;
