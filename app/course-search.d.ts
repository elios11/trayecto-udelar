export type SearchableCourse = {
  id: string;
  name: string;
};

export function normalizeSearchText(value: string): string;
export function matchesCourseSearch(course: SearchableCourse, areaLabel: string, rawQuery: string): boolean;
