const LOAD_UNITS = new Set(["credits", "hours", "courses"]);

function courseLookup(courses) {
  if (courses instanceof Map) return courses;
  return new Map((courses ?? []).map((course) => [course.id, course]));
}

export function calculateTermLoad({ term, courses, unit }) {
  if (!LOAD_UNITS.has(unit)) throw new TypeError("La unidad de carga no es válida.");
  const byId = courseLookup(courses);
  const courseIds = [...new Set(term?.courseIds ?? [])];
  const missingCourseIds = [];
  const missingValueCourseIds = [];
  let value = 0;

  for (const courseId of courseIds) {
    const course = byId.get(courseId);
    if (!course) {
      missingCourseIds.push(courseId);
      continue;
    }
    if (unit === "courses") {
      value += 1;
      continue;
    }
    const amount = unit === "credits" ? course.credits : course.hours;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      missingValueCourseIds.push(courseId);
      continue;
    }
    value += amount;
  }

  return {
    unit,
    value,
    courseCount: courseIds.length,
    missingCourseIds,
    missingValueCourseIds,
    partial: missingCourseIds.length > 0 || (unit !== "courses" && missingValueCourseIds.length > 0),
  };
}

export function compareTermLoad(load, target) {
  if (!target) return { status: "none", difference: null };
  if (!LOAD_UNITS.has(target.unit) || typeof target.value !== "number" || target.value <= 0) {
    return { status: "invalid", difference: null };
  }
  if (load.unit !== target.unit || load.partial) return { status: "partial", difference: null };
  const difference = load.value - target.value;
  return { status: difference > 0 ? "exceeded" : difference === 0 ? "met" : "below", difference };
}

export function analyzePlannerLoad({ terms, courses, progress }) {
  const seen = new Map();
  const duplicates = new Set();
  const accredited = new Set();
  const byId = courseLookup(courses);
  const termSummaries = [];

  for (const term of terms ?? []) {
    for (const courseId of term.courseIds ?? []) {
      if (seen.has(courseId)) duplicates.add(courseId);
      else seen.set(courseId, term.id);
      if (progress?.[courseId] === "exonerated") accredited.add(courseId);
    }
    const unit = term.loadTarget?.unit ?? "credits";
    const load = calculateTermLoad({ term, courses: byId, unit });
    termSummaries.push({ termId: term.id, load, target: term.loadTarget ?? null, targetStatus: compareTermLoad(load, term.loadTarget) });
  }

  return {
    terms: termSummaries,
    duplicateCourseIds: [...duplicates],
    accreditedCourseIds: [...accredited],
  };
}

export function calculatePotentialCreditImpact(courses) {
  const nodeCredits = new Map();
  const ambiguousCourseIds = [];
  const unknownCourseIds = [];
  let totalCredits = 0;

  for (const course of courses ?? []) {
    const credits = typeof course.credits === "number" && course.credits > 0 ? course.credits : 0;
    totalCredits += credits;
    const allocations = (course.creditAllocations ?? []).filter((allocation) => allocation?.nodeId && allocation.credits > 0);
    const nodeIds = [...new Set(allocations.map((allocation) => allocation.nodeId))];
    if (nodeIds.length === 1) {
      const allocated = Math.min(credits, allocations.filter((allocation) => allocation.nodeId === nodeIds[0]).reduce((sum, allocation) => sum + allocation.credits, 0));
      nodeCredits.set(nodeIds[0], (nodeCredits.get(nodeIds[0]) ?? 0) + allocated);
    } else if (nodeIds.length > 1) {
      ambiguousCourseIds.push(course.id);
    } else if (credits > 0) {
      unknownCourseIds.push(course.id);
    }
  }

  return { totalCredits, nodeCredits: Object.fromEntries(nodeCredits), ambiguousCourseIds, unknownCourseIds };
}
