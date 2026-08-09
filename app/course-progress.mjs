const STATUS_PRIORITY = new Map([
  ["exonerated", 0],
  ["approved", 1],
  ["pending", 2],
]);

const COURSE_NAME_COLLATOR = new Intl.Collator("es-UY", {
  sensitivity: "base",
  numeric: true,
});

export function hasRecordedCourseProgress(status) {
  return status === "approved" || status === "exonerated";
}

export function hasRecordedProgressOutsideCatalog(statuses, knownCourseIds) {
  return Object.entries(statuses).some(([courseId, status]) => (
    hasRecordedCourseProgress(status) && !knownCourseIds.has(courseId)
  ));
}

export function sortCoursesByProgress(courses, statuses) {
  return [...courses].sort((first, second) => {
    const firstPriority = STATUS_PRIORITY.get(statuses[first.id] ?? "pending") ?? 2;
    const secondPriority = STATUS_PRIORITY.get(statuses[second.id] ?? "pending") ?? 2;
    return firstPriority - secondPriority
      || COURSE_NAME_COLLATOR.compare(first.name, second.name)
      || COURSE_NAME_COLLATOR.compare(first.id, second.id);
  });
}
