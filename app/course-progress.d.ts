export type ProgressStatus = "pending" | "approved" | "exonerated";
export type ProgressCourse = { id: string; name: string };

export function hasRecordedCourseProgress(status: ProgressStatus | undefined): boolean;
export function hasRecordedProgressOutsideCatalog(statuses: Record<string, ProgressStatus>, knownCourseIds: Set<string>): boolean;
export function sortCoursesByProgress<T extends ProgressCourse>(courses: T[], statuses: Record<string, ProgressStatus>): T[];
