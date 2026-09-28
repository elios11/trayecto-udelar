export function buildRegisteredPlanCourses(pathwayId, data) {
  if (!data) return [];
  const publishedPathways = data.publishedPathways ?? data.pathways;
  const pathway = publishedPathways[pathwayId] ?? publishedPathways[Object.keys(publishedPathways)[0] ?? ""];
  if (!pathway) return [];

  const activePeriods = new Map();
  pathway.periods.forEach((period, index) => {
    period.courseIds.forEach((id) => activePeriods.set(id, index + 1));
  });

  const availableIds = new Set();
  for (const candidate of Object.values(publishedPathways)) {
    for (const period of candidate.periods) {
      for (const id of period.courseIds) availableIds.add(id);
    }
    for (const id of candidate.catalogCourseIds ?? []) availableIds.add(id);
  }

  return data.courses
    .filter((course) => (course.authorityStatus ?? "verified") === "verified" && availableIds.has(course.id))
    .map((course) => ({
      ...course,
      semester: activePeriods.get(course.id) ?? "opt",
      offered: [],
    }));
}
