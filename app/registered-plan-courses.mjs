export const GENERATED_PATHWAY_LABEL = "Recorrido orientativo generado";

const excludedAuthorityStatuses = new Set(["administrative", "historical-equivalent", "rejected"]);
const MAX_COURSES_PER_GENERATED_PERIOD = 6;

export function isRealCurricularCourse(course) {
  if (!course || course.placeholder || excludedAuthorityStatuses.has(course.authorityStatus)) return false;
  return !course.curricularBlock || course.credits > 0 || (course.hours ?? 0) > 0;
}

function uniqueCourseIds(ids, courseById) {
  const output = [];
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id) || !isRealCurricularCourse(courseById.get(id))) continue;
    seen.add(id);
    output.push(id);
  }
  return output;
}

function pathwayCourseIds(pathway, courseById) {
  return uniqueCourseIds([
    ...(pathway?.periods ?? []).flatMap((period) => period.courseIds),
    ...(pathway?.catalogCourseIds ?? []),
  ], courseById);
}

function generatedPeriodCount(data, courseCount) {
  const durationMonths = data.plan?.durationMonths;
  const durationPeriods = typeof durationMonths === "number" && durationMonths > 0
    ? Math.max(1, Math.ceil(durationMonths / 6))
    : 1;
  return Math.min(courseCount, durationPeriods);
}

function distributeGeneratedPeriods(data, courseIds) {
  const periodCount = generatedPeriodCount(data, courseIds.length);
  if (periodCount === 0) return [];
  const baseSize = Math.floor(courseIds.length / periodCount);
  const periodsWithExtraCourse = courseIds.length % periodCount;
  let start = 0;
  return Array.from({ length: periodCount }, (_, index) => {
    const size = baseSize + (index < periodsWithExtraCourse ? 1 : 0);
    const period = {
      label: `Tramo orientativo ${index + 1}`,
      courseIds: courseIds.slice(start, start + size),
    };
    start += size;
    return period;
  });
}

function generatedPeriods(data, pathway, courseById) {
  const pathwayIds = pathwayCourseIds(pathway, courseById);
  const orderedIds = pathwayIds.length > 0
    ? pathwayIds
    : data.courses.filter(isRealCurricularCourse).map((course) => course.id);
  const verifiedIds = orderedIds.filter((id) => (courseById.get(id)?.authorityStatus ?? "verified") === "verified");
  const preferredIds = verifiedIds.length > 0 ? verifiedIds : orderedIds;
  const maximumCoreSize = generatedPeriodCount(data, preferredIds.length) * MAX_COURSES_PER_GENERATED_PERIOD;
  const coreIds = preferredIds.slice(0, maximumCoreSize);
  const coreIdSet = new Set(coreIds);
  const preservedIds = new Set();
  const preservedPeriods = (pathway?.periods ?? [])
    .flatMap((period) => {
      const ids = uniqueCourseIds(period.courseIds, courseById).filter((id) => {
        if (!coreIdSet.has(id) || preservedIds.has(id)) return false;
        preservedIds.add(id);
        return true;
      });
      return Array.from({ length: Math.ceil(ids.length / MAX_COURSES_PER_GENERATED_PERIOD) }, (_, index) => ({
        label: `Agrupación Bedelías · ${period.label}${ids.length > MAX_COURSES_PER_GENERATED_PERIOD ? ` · parte ${index + 1}` : ""}`,
        courseIds: ids.slice(index * MAX_COURSES_PER_GENERATED_PERIOD, (index + 1) * MAX_COURSES_PER_GENERATED_PERIOD),
      }));
    })
    .filter((period) => period.courseIds.length > 0);
  const used = new Set(preservedPeriods.flatMap((period) => period.courseIds));
  const remaining = coreIds.filter((id) => !used.has(id));

  if (preservedPeriods.length > 0) {
    return remaining.length > 0
      ? [...preservedPeriods, ...distributeGeneratedPeriods(data, remaining)]
      : preservedPeriods;
  }

  return distributeGeneratedPeriods(data, remaining);
}

export function buildRegisteredPlanPresentation(pathwayId, data) {
  if (!data) return { courses: [], periods: [], generated: false, label: "Trayectoria oficial", description: "" };
  const publishedPathways = data.publishedPathways ?? data.pathways;
  const publishedPathway = publishedPathways[pathwayId] ?? publishedPathways[Object.keys(publishedPathways)[0] ?? ""];
  const sourcePathway = data.pathways[pathwayId] ?? data.pathways[Object.keys(data.pathways)[0] ?? ""] ?? publishedPathway;
  if (!publishedPathway || !sourcePathway) return { courses: [], periods: [], generated: false, label: "Trayectoria oficial", description: "" };

  const courseById = new Map(data.courses.map((course) => [course.id, course]));
  const hasOfficialPeriodCourses = publishedPathway.periods.some((period) => period.courseIds.some((id) => {
    const course = courseById.get(id);
    return isRealCurricularCourse(course) && (course.authorityStatus ?? "verified") === "verified";
  }));
  const restrictGeneratedCatalogToPublished = publishedPathway.restrictGeneratedCatalogToPublished === true;
  const periods = hasOfficialPeriodCourses
    ? publishedPathway.periods
    : generatedPeriods(data, restrictGeneratedCatalogToPublished ? publishedPathway : sourcePathway, courseById);
  const activePeriods = new Map();
  periods.forEach((period, index) => {
    period.courseIds.forEach((id) => activePeriods.set(id, index + 1));
  });

  const availableIds = new Set();
  if (hasOfficialPeriodCourses) {
    for (const candidate of Object.values(publishedPathways)) {
      for (const period of candidate.periods) {
        for (const id of period.courseIds) availableIds.add(id);
      }
      for (const id of candidate.catalogCourseIds ?? []) availableIds.add(id);
    }
  } else if (restrictGeneratedCatalogToPublished && pathwayCourseIds(publishedPathway, courseById).length > 0) {
    for (const id of pathwayCourseIds(publishedPathway, courseById)) availableIds.add(id);
  } else {
    for (const course of data.courses) {
      if (isRealCurricularCourse(course)) availableIds.add(course.id);
    }
  }

  const courses = data.courses
    .filter((course) => availableIds.has(course.id)
      && (hasOfficialPeriodCourses ? (course.authorityStatus ?? "verified") === "verified" : isRealCurricularCourse(course)))
    .map((course) => {
      const provisional = (course.authorityStatus ?? "verified") !== "verified";
      return {
        ...course,
        ...(provisional ? { provisional: true, eligibleRequirementIds: [], creditAllocations: [] } : {}),
        semester: activePeriods.get(course.id) ?? "opt",
        offered: [],
      };
    });

  return {
    courses,
    periods,
    generated: !hasOfficialPeriodCourses,
    label: hasOfficialPeriodCourses ? "Trayectoria oficial" : GENERATED_PATHWAY_LABEL,
    description: hasOfficialPeriodCourses
      ? publishedPathway.description
      : "Orden provisorio construido por Trayecto desde la composición de Bedelías, priorizando materias verificadas y dejando las opciones adicionales en un catálogo flexible. No es una trayectoria sugerida por la institución y será sustituido al reconciliar la malla oficial.",
  };
}

export function buildRegisteredPlanCourses(pathwayId, data) {
  return buildRegisteredPlanPresentation(pathwayId, data).courses;
}
