const PERIOD_PARTS = new Set([
  "first-semester",
  "second-semester",
  "annual",
  "first-half-semester",
  "second-half-semester",
  "other",
]);
const DECLARATIONS = new Set(["offered", "not-offered", "habitual"]);
const MODALITIES = new Set(["in-person", "remote", "hybrid", "unknown"]);

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isIsoDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const issue = (path, code, message) => ({ path, code, message });

function validateStringArray(value, path, issues) {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "invalid_scope", "Debe ser una lista de identificadores."));
    return;
  }
  const seen = new Set();
  value.forEach((entry, index) => {
    if (!isNonEmptyString(entry)) issues.push(issue(`${path}[${index}]`, "invalid_id", "El identificador no puede estar vacío."));
    else if (seen.has(entry)) issues.push(issue(`${path}[${index}]`, "duplicate_id", "El identificador está repetido."));
    else seen.add(entry);
  });
}

function validateDate(value, path, issues, optional = false) {
  if (optional && value === undefined) return;
  if (!isIsoDate(value)) issues.push(issue(path, "invalid_date", "La fecha debe usar YYYY-MM-DD y existir en el calendario."));
}

function validatePeriod(period, path, issues) {
  if (!isRecord(period)) {
    issues.push(issue(path, "invalid_period", "El período académico debe ser un objeto."));
    return;
  }
  if (!Number.isInteger(period.year) || period.year < 1900 || period.year > 2200) {
    issues.push(issue(`${path}.year`, "invalid_year", "El año académico no es válido."));
  }
  if (!PERIOD_PARTS.has(period.part)) issues.push(issue(`${path}.part`, "invalid_part", "La parte del período no está normalizada."));
  validateDate(period.startsOn, `${path}.startsOn`, issues, true);
  validateDate(period.endsOn, `${path}.endsOn`, issues, true);
  if (isIsoDate(period.startsOn) && Number(period.startsOn.slice(0, 4)) !== period.year) {
    issues.push(issue(`${path}.startsOn`, "period_year_mismatch", "El inicio debe pertenecer al año académico."));
  }
  if (isIsoDate(period.endsOn) && Number(period.endsOn.slice(0, 4)) !== period.year) {
    issues.push(issue(`${path}.endsOn`, "period_year_mismatch", "El fin debe pertenecer al año académico."));
  }
  if (isIsoDate(period.startsOn) && isIsoDate(period.endsOn) && period.startsOn > period.endsOn) {
    issues.push(issue(path, "inverted_period", "El período no puede terminar antes de comenzar."));
  }
}

function institutionalHttpsUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && (parsed.hostname === "edu.uy" || parsed.hostname.endsWith(".edu.uy"));
  } catch {
    return false;
  }
}

/** Valida toda la colección y devuelve todos los problemas detectados. */
export function validateCourseOfferings(records, { catalog = [] } = {}) {
  const issues = [];
  if (!Array.isArray(records)) return { ok: false, issues: [issue("$", "invalid_dataset", "La oferta debe ser una lista.")] };
  const ids = new Set();
  const catalogKeys = new Set(catalog.map((entry) => `${entry.serviceId}:${entry.courseId}`));

  records.forEach((record, index) => {
    const path = `$[${index}]`;
    if (!isRecord(record)) {
      issues.push(issue(path, "invalid_record", "Cada evidencia debe ser un objeto."));
      return;
    }
    if (!isNonEmptyString(record.id)) issues.push(issue(`${path}.id`, "invalid_id", "El registro requiere un ID estable."));
    else if (ids.has(record.id)) issues.push(issue(`${path}.id`, "duplicate_id", "El ID de evidencia está repetido."));
    else ids.add(record.id);
    if (!isNonEmptyString(record.courseId)) issues.push(issue(`${path}.courseId`, "invalid_course_id", "La evidencia requiere una materia canónica."));
    if (!isNonEmptyString(record.serviceId)) issues.push(issue(`${path}.serviceId`, "invalid_service_id", "La evidencia requiere un servicio publicador."));
    if (catalogKeys.size && isNonEmptyString(record.courseId) && isNonEmptyString(record.serviceId) && !catalogKeys.has(`${record.serviceId}:${record.courseId}`)) {
      issues.push(issue(`${path}.courseId`, "unknown_course", "La materia no existe para el servicio indicado en el catálogo auditado."));
    }
    validateStringArray(record.planIds, `${path}.planIds`, issues);
    validateStringArray(record.campusIds, `${path}.campusIds`, issues);
    validatePeriod(record.academicPeriod, `${path}.academicPeriod`, issues);
    if (!DECLARATIONS.has(record.declaration)) issues.push(issue(`${path}.declaration`, "invalid_declaration", "La declaración no está normalizada."));
    if (!MODALITIES.has(record.modality)) issues.push(issue(`${path}.modality`, "invalid_modality", "La modalidad no está normalizada."));
    if (!isRecord(record.source)) issues.push(issue(`${path}.source`, "invalid_source", "La evidencia requiere una fuente."));
    else {
      if (!institutionalHttpsUrl(record.source.url)) issues.push(issue(`${path}.source.url`, "invalid_source_url", "La fuente debe ser una URL HTTPS institucional .edu.uy."));
      for (const field of ["title", "publisher"]) {
        if (!isNonEmptyString(record.source[field])) issues.push(issue(`${path}.source.${field}`, "invalid_source", "La fuente requiere título y publicador."));
      }
      validateDate(record.source.publishedAt, `${path}.source.publishedAt`, issues, true);
      validateDate(record.source.lastVerifiedAt, `${path}.source.lastVerifiedAt`, issues);
      validateDate(record.source.retrievedAt, `${path}.source.retrievedAt`, issues, true);
    }
    validateDate(record.validThrough, `${path}.validThrough`, issues);
    const periodBoundary = record.academicPeriod?.endsOn ?? (Number.isInteger(record.academicPeriod?.year) ? `${record.academicPeriod.year}-01-01` : null);
    if (isIsoDate(record.validThrough) && periodBoundary && record.validThrough < periodBoundary) {
      issues.push(issue(`${path}.validThrough`, "invalid_validity", "La vigencia no puede terminar antes del período publicado."));
    }
    if (isIsoDate(record.validThrough) && isIsoDate(record.source?.lastVerifiedAt) && record.validThrough < record.source.lastVerifiedAt) {
      issues.push(issue(`${path}.validThrough`, "invalid_validity", "La vigencia no puede preceder la última verificación."));
    }
    if (record.declaration === "not-offered" && (!Number.isInteger(record.academicPeriod?.year) || !PERIOD_PARTS.has(record.academicPeriod?.part))) {
      issues.push(issue(`${path}.declaration`, "inexact_negative", "Una negativa requiere un período académico exacto."));
    }
    if (record.declaration === "habitual" && record.basis !== "explicit") {
      issues.push(issue(`${path}.basis`, "unsupported_habit", "Una evidencia habitual individual sólo puede registrar una declaración institucional explícita."));
    }
    if (record.note !== undefined && !isNonEmptyString(record.note)) issues.push(issue(`${path}.note`, "invalid_note", "La cautela opcional no puede estar vacía."));
  });
  return { ok: issues.length === 0, issues };
}

const sortedUnique = (values) => [...new Set(values)].sort((left, right) => left.localeCompare(right, "es"));

/** Ordena IDs, alcances y registros para que la serialización auditada sea reproducible. */
export function normalizeCourseOfferings(records) {
  return records.map((record) => ({
    id: record.id,
    courseId: record.courseId,
    serviceId: record.serviceId,
    planIds: sortedUnique(record.planIds),
    campusIds: sortedUnique(record.campusIds),
    academicPeriod: {
      year: record.academicPeriod.year,
      part: record.academicPeriod.part,
      ...(record.academicPeriod.startsOn ? { startsOn: record.academicPeriod.startsOn } : {}),
      ...(record.academicPeriod.endsOn ? { endsOn: record.academicPeriod.endsOn } : {}),
    },
    declaration: record.declaration,
    ...(record.basis ? { basis: record.basis } : {}),
    modality: record.modality,
    source: {
      url: record.source.url,
      title: record.source.title,
      publisher: record.source.publisher,
      ...(record.source.publishedAt ? { publishedAt: record.source.publishedAt } : {}),
      lastVerifiedAt: record.source.lastVerifiedAt,
      ...(record.source.retrievedAt ? { retrievedAt: record.source.retrievedAt } : {}),
    },
    validThrough: record.validThrough,
    ...(record.note ? { note: record.note } : {}),
  })).sort((left, right) => left.id.localeCompare(right.id, "es"));
}

export function serializeCourseOfferings(records) {
  return JSON.stringify(normalizeCourseOfferings(records));
}

const scopeMatch = (record, target) => {
  if (record.courseId !== target.courseId) return "no";
  if (target.serviceId && record.serviceId !== target.serviceId) return "no";
  if (record.planIds.length) {
    if (!target.planId) return "unresolved";
    if (!record.planIds.includes(target.planId)) return "no";
  }
  if (record.campusIds.length) {
    if (!target.campusId) return "unresolved";
    if (!record.campusIds.includes(target.campusId)) return "no";
  }
  return "yes";
};

const periodsOverlap = (published, target) => published.year === target.year
  && (published.part === target.part || published.part === "annual");

const mappingIssueApplies = (entry, target) => entry.courseId === target.courseId
  && (!entry.serviceId || !target.serviceId || entry.serviceId === target.serviceId)
  && (!entry.academicPeriod || periodsOverlap(entry.academicPeriod, target.academicPeriod));

/** Resuelve una afirmación para un período objetivo sin consultar red ni modificar datos personales. */
export function resolveCourseOffering({ records, mappingIssues = [], courseId, serviceId, planId, campusId, academicPeriod, now }) {
  if (!isIsoDate(now) || !isRecord(academicPeriod) || !Number.isInteger(academicPeriod.year) || !PERIOD_PARTS.has(academicPeriod.part)) {
    throw new TypeError("resolveCourseOffering requiere now y un período objetivo válidos.");
  }
  const target = { courseId, serviceId, planId, campusId, academicPeriod };
  if (mappingIssues.some((entry) => mappingIssueApplies(entry, target))) return { status: "needs-review", evidence: [], reason: "unresolved-mapping" };

  const scoped = [];
  let unresolvedScope = false;
  for (const record of records) {
    const applicability = scopeMatch(record, target);
    if (applicability === "yes") scoped.push(record);
    if (applicability === "unresolved") unresolvedScope = true;
  }
  if (unresolvedScope) return { status: "needs-review", evidence: [], reason: "unresolved-scope" };

  const exact = scoped.filter((record) => periodsOverlap(record.academicPeriod, academicPeriod));
  const declarations = new Set(exact.map((record) => record.declaration));
  if (declarations.has("offered") && declarations.has("not-offered")) {
    return { status: "needs-review", evidence: exact, reason: "contradictory-sources" };
  }
  const current = exact.filter((record) => record.validThrough >= now);
  const confirmed = current.filter((record) => record.declaration === "offered");
  if (confirmed.length) return { status: "confirmed", evidence: confirmed, reason: "current-offer" };
  const unavailable = current.filter((record) => record.declaration === "not-offered");
  if (unavailable.length) return { status: "not-offered", evidence: unavailable, reason: "explicit-negative" };
  const explicitHabit = current.filter((record) => record.declaration === "habitual" && record.basis === "explicit");
  if (explicitHabit.length) return { status: "habitual", evidence: explicitHabit, reason: "explicit-habit" };

  const comparable = scoped.filter((record) => record.declaration === "offered" && record.academicPeriod.part === academicPeriod.part);
  const comparableYears = new Set(comparable.map((record) => record.academicPeriod.year));
  if (comparableYears.size >= 2) return { status: "habitual", evidence: comparable, reason: "two-comparable-offers" };
  return { status: "unknown", evidence: exact, reason: exact.length ? "expired-evidence" : "insufficient-evidence" };
}

export function evidenceForCourse(records, { courseId, serviceId, planId, campusId }) {
  const target = { courseId, serviceId, planId, campusId };
  return records.filter((record) => scopeMatch(record, target) === "yes").sort((left, right) => {
    const byYear = right.academicPeriod.year - left.academicPeriod.year;
    return byYear || left.id.localeCompare(right.id, "es");
  });
}

function dateOnly(value) {
  if (isIsoDate(value)) return value;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) return null;
  const candidate = value.slice(0, 10);
  return isIsoDate(candidate) ? candidate : null;
}

/** Convierte solamente rangos inequívocos; nunca usa la posición o etiqueta del bloque. */
export function academicPeriodFromDateRange(range = {}) {
  const startsOn = dateOnly(range.startsOn ?? range.startsAt);
  const endsOn = dateOnly(range.endsOn ?? range.endsAt);
  if (!isIsoDate(startsOn) || !isIsoDate(endsOn) || startsOn > endsOn) return null;
  const startYear = Number(startsOn.slice(0, 4));
  const endYear = Number(endsOn.slice(0, 4));
  if (startYear !== endYear) return null;
  const startMonth = Number(startsOn.slice(5, 7));
  const endMonth = Number(endsOn.slice(5, 7));
  if (startMonth <= 2 && endMonth >= 11) return { year: startYear, part: "annual", startsOn, endsOn };
  if (startMonth <= 6 && endMonth <= 7) return { year: startYear, part: "first-semester", startsOn, endsOn };
  if (startMonth >= 7 && endMonth >= 7) return { year: startYear, part: "second-semester", startsOn, endsOn };
  return null;
}

export function formatAcademicPeriod(period) {
  const parts = {
    "first-semester": "1.er semestre",
    "second-semester": "2.º semestre",
    annual: "año lectivo",
    "first-half-semester": "1.er hemisemestre",
    "second-half-semester": "2.º hemisemestre",
    other: "período especial",
  };
  return `${parts[period.part]} ${period.year}`;
}

export function courseOfferingStatusPresentation(status) {
  return {
    confirmed: { label: "Confirmada", detail: "Existe una oferta institucional vigente para este período." },
    "not-offered": { label: "No se dicta", detail: "Una fuente institucional declara expresamente que no se dicta en este período." },
    habitual: { label: "Dictado habitual", detail: "Hay evidencia comparable, pero no confirma una próxima edición." },
    unknown: { label: "Sin información publicada", detail: "No equivale a que la materia no se dicte." },
    "needs-review": { label: "Requiere revisión", detail: "Las fuentes o el alcance no permiten una afirmación segura." },
  }[status];
}
