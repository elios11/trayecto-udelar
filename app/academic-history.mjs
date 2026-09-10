const EVENT_KINDS = new Set(["course-passed", "exemption", "exam-passed", "accreditation", "recorded-status"]);
const EVENT_SOURCES = new Set(["user", "migration", "import"]);
const EVENT_STATUSES = new Set(["approved", "exonerated"]);
const CREDITABLE_KINDS = new Set(["exemption", "exam-passed", "accreditation"]);
const EXTENSION_NAMESPACE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;

const issue = (path, code, message) => ({ path, code, message });
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value) => typeof value === "string" && value.trim() !== "";

function validCalendarDate(year, month, day) {
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function normalizeOccurredAt(value, path, issues) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    issues.push(issue(path, "invalid_date", "Debe ser una fecha ISO válida o null."));
    return null;
  }
  const calendar = CALENDAR_DATE.exec(value);
  if (calendar) {
    const [, year, month, day] = calendar;
    if (validCalendarDate(Number(year), Number(month), Number(day))) return value;
  }
  const dateTime = ISO_DATE_TIME.exec(value);
  if (dateTime && validDateTimeMatch(dateTime, value)) return new Date(value).toISOString();
  issues.push(issue(path, "invalid_date", "Debe ser una fecha ISO válida o null."));
  return null;
}

function normalizeRecordedAt(value, path, issues) {
  const match = typeof value === "string" ? ISO_DATE_TIME.exec(value) : null;
  if (!match || !validDateTimeMatch(match, value)) {
    issues.push(issue(path, "invalid_date", "Debe ser una fecha y hora ISO 8601 con zona horaria."));
    return "";
  }
  return new Date(value).toISOString();
}

function validDateTimeMatch(match, value) {
  const [, year, month, day, hour, minute, second, , zone] = match;
  const offsetHour = zone === "Z" ? 0 : Number(zone.slice(1, 3));
  const offsetMinute = zone === "Z" ? 0 : Number(zone.slice(4, 6));
  return validCalendarDate(Number(year), Number(month), Number(day))
    && Number(hour) <= 23
    && Number(minute) <= 59
    && Number(second) <= 59
    && offsetHour <= 23
    && offsetMinute <= 59
    && Number.isFinite(Date.parse(value));
}

function checkJsonValue(value, path, issues, ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) issues.push(issue(path, "not_json", "Debe ser un número finito."));
    return;
  }
  if (typeof value !== "object" || ancestors.has(value)) {
    issues.push(issue(path, "not_json", "Debe contener solamente valores JSON sin ciclos."));
    return;
  }
  ancestors.add(value);
  if (Array.isArray(value)) value.forEach((child, index) => checkJsonValue(child, `${path}[${index}]`, issues, ancestors));
  else Object.entries(value).forEach(([key, child]) => checkJsonValue(child, `${path}.${key}`, issues, ancestors));
  ancestors.delete(value);
}

function normalizeExtensions(value, path, issues) {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    issues.push(issue(path, "invalid_type", "Las extensiones deben ser un objeto."));
    return undefined;
  }
  checkJsonValue(value, path, issues);
  for (const key of Object.keys(value)) {
    if (!EXTENSION_NAMESPACE.test(key)) issues.push(issue(`${path}.${key}`, "invalid_extension_namespace", "La extensión debe usar un espacio de nombres con puntos."));
  }
  return { ...value };
}

function normalizeEvent(value, path, issues) {
  if (!isRecord(value)) {
    issues.push(issue(path, "invalid_type", "El hito debe ser un objeto."));
    return null;
  }
  const id = nonEmpty(value.id) ? value.id.trim() : "";
  const courseId = nonEmpty(value.courseId) ? value.courseId.trim() : "";
  if (!id) issues.push(issue(`${path}.id`, "invalid_id", "El hito necesita un identificador no vacío."));
  if (!courseId) issues.push(issue(`${path}.courseId`, "invalid_id", "La materia necesita un identificador no vacío."));
  if (!EVENT_KINDS.has(value.kind)) issues.push(issue(`${path}.kind`, "invalid_enum", "El tipo de hito no es válido."));
  if (!EVENT_STATUSES.has(value.resultStatus)) issues.push(issue(`${path}.resultStatus`, "invalid_enum", "El resultado debe ser approved o exonerated."));
  if (value.kind === "course-passed" && value.resultStatus !== "approved") issues.push(issue(`${path}.resultStatus`, "inconsistent_result", "Un curso aprobado sólo puede proyectar approved."));
  if (CREDITABLE_KINDS.has(value.kind) && value.resultStatus !== "exonerated") issues.push(issue(`${path}.resultStatus`, "inconsistent_result", "El hito acreditable debe proyectar exonerated."));
  if (!Number.isInteger(value.revision) || value.revision < 1) issues.push(issue(`${path}.revision`, "invalid_revision", "La revisión debe ser un entero positivo."));
  const supersedesEventId = value.supersedesEventId === null ? null : nonEmpty(value.supersedesEventId) ? value.supersedesEventId.trim() : "";
  if (supersedesEventId === "") issues.push(issue(`${path}.supersedesEventId`, "invalid_id", "La referencia debe ser un identificador o null."));
  if (typeof value.voided !== "boolean") issues.push(issue(`${path}.voided`, "invalid_type", "La anulación debe ser verdadera o falsa."));
  if (!EVENT_SOURCES.has(value.source)) issues.push(issue(`${path}.source`, "invalid_enum", "El origen del hito no es válido."));
  const extensions = normalizeExtensions(value.extensions, `${path}.extensions`, issues);
  return {
    ...(extensions === undefined ? {} : { extensions }),
    id,
    courseId,
    kind: value.kind,
    resultStatus: value.resultStatus,
    occurredAt: normalizeOccurredAt(value.occurredAt, `${path}.occurredAt`, issues),
    recordedAt: normalizeRecordedAt(value.recordedAt, `${path}.recordedAt`, issues),
    revision: Number.isInteger(value.revision) ? value.revision : 0,
    supersedesEventId: supersedesEventId || null,
    voided: value.voided === true,
    source: value.source,
  };
}

export function validateAcademicHistory(value, path = "$.academicHistory") {
  const issues = [];
  if (!isRecord(value)) return { ok: false, issues: [issue(path, "invalid_type", "El historial debe ser un objeto.")] };
  if (!Array.isArray(value.events)) return { ok: false, issues: [issue(`${path}.events`, "invalid_type", "Los hitos deben ser una colección.")] };
  const events = value.events.map((event, index) => normalizeEvent(event, `${path}.events[${index}]`, issues)).filter(Boolean);
  const extensions = normalizeExtensions(value.extensions, `${path}.extensions`, issues);
  const byId = new Map();
  events.forEach((event, index) => {
    if (event.id && byId.has(event.id)) issues.push(issue(`${path}.events[${index}].id`, "duplicate_id", `El hito ${event.id} está repetido dentro del perfil.`));
    if (event.id) byId.set(event.id, event);
  });
  const childByParent = new Map();
  events.forEach((event, index) => {
    if (!event.supersedesEventId) return;
    const parent = byId.get(event.supersedesEventId);
    if (!parent) {
      issues.push(issue(`${path}.events[${index}].supersedesEventId`, "missing_reference", "El hito corregido no existe en este perfil."));
      return;
    }
    if (parent.courseId !== event.courseId) issues.push(issue(`${path}.events[${index}].supersedesEventId`, "cross_course_reference", "Una corrección no puede atravesar materias."));
    if (event.revision !== parent.revision + 1) issues.push(issue(`${path}.events[${index}].revision`, "invalid_revision_sequence", "La revisión debe continuar la secuencia del hito anterior."));
    if (childByParent.has(parent.id)) issues.push(issue(`${path}.events[${index}].supersedesEventId`, "multiple_terminal_revisions", "Una revisión no puede tener dos correcciones terminales."));
    childByParent.set(parent.id, event.id);
  });
  for (const event of events) {
    const visited = new Set();
    let cursor = event;
    while (cursor?.supersedesEventId) {
      if (visited.has(cursor.id)) {
        issues.push(issue(path, "revision_cycle", "Las referencias de corrección forman un ciclo."));
        break;
      }
      visited.add(cursor.id);
      cursor = byId.get(cursor.supersedesEventId);
    }
  }
  const history = { ...(extensions === undefined ? {} : { extensions }), events: [...events].sort(compareLogical) };
  return issues.length ? { ok: false, issues } : { ok: true, history };
}

function compareLogical(left, right) {
  return Date.parse(left.recordedAt) - Date.parse(right.recordedAt)
    || left.revision - right.revision
    || left.id.localeCompare(right.id);
}

export function effectiveAcademicHistoryEvents(history) {
  const parsed = validateAcademicHistory(history);
  if (!parsed.ok) throw new TypeError("El historial académico no es válido.");
  const superseded = new Set(parsed.history.events.map((event) => event.supersedesEventId).filter(Boolean));
  return parsed.history.events.filter((event) => !superseded.has(event.id) && !event.voided).sort(compareLogical);
}

export function deriveCourseStatuses(history) {
  const statuses = {};
  for (const event of effectiveAcademicHistoryEvents(history)) statuses[event.courseId] = event.resultStatus;
  return statuses;
}

export function academicHistoryForCourse(history, courseId) {
  const parsed = validateAcademicHistory(history);
  if (!parsed.ok) throw new TypeError("El historial académico no es válido.");
  const superseded = new Set(parsed.history.events.map((event) => event.supersedesEventId).filter(Boolean));
  return parsed.history.events
    .filter((event) => event.courseId === courseId)
    .sort(compareLogical)
    .map((event) => ({ ...event, terminal: !superseded.has(event.id) }));
}

function eventResultForKind(kind, requestedStatus) {
  if (kind === "course-passed") return "approved";
  if (CREDITABLE_KINDS.has(kind)) return "exonerated";
  return EVENT_STATUSES.has(requestedStatus) ? requestedStatus : null;
}

function appendValidated(history, event) {
  const candidate = { ...(history.extensions ? { extensions: history.extensions } : {}), events: [...history.events, event] };
  const parsed = validateAcademicHistory(candidate);
  if (!parsed.ok) throw new TypeError(parsed.issues.map((entry) => entry.message).join(" "));
  return parsed.history;
}

export function addAcademicHistoryEvent(history, input, options) {
  const parsed = validateAcademicHistory(history);
  if (!parsed.ok) throw new TypeError("El historial académico no es válido.");
  const resultStatus = eventResultForKind(input.kind, input.resultStatus);
  const event = {
    ...(input.extensions ? { extensions: input.extensions } : {}),
    id: options.id,
    courseId: input.courseId,
    kind: input.kind,
    resultStatus,
    occurredAt: input.occurredAt ?? null,
    recordedAt: options.recordedAt,
    revision: 1,
    supersedesEventId: null,
    voided: false,
    source: input.source ?? "user",
  };
  return appendValidated(parsed.history, event);
}

function terminalEvent(history, eventId) {
  const event = history.events.find((candidate) => candidate.id === eventId);
  if (!event) throw new TypeError("El hito no existe.");
  if (history.events.some((candidate) => candidate.supersedesEventId === eventId)) throw new TypeError("Sólo se puede revisar el último hito de una cadena.");
  return event;
}

export function correctAcademicHistoryEvent(history, eventId, changes, options) {
  const parsed = validateAcademicHistory(history);
  if (!parsed.ok) throw new TypeError("El historial académico no es válido.");
  const previous = terminalEvent(parsed.history, eventId);
  const kind = changes.kind ?? previous.kind;
  const resultStatus = eventResultForKind(kind, changes.resultStatus ?? previous.resultStatus);
  return appendValidated(parsed.history, {
    ...(previous.extensions ? { extensions: previous.extensions } : {}),
    id: options.id,
    courseId: previous.courseId,
    kind,
    resultStatus,
    occurredAt: Object.hasOwn(changes, "occurredAt") ? changes.occurredAt : previous.occurredAt,
    recordedAt: options.recordedAt,
    revision: previous.revision + 1,
    supersedesEventId: previous.id,
    voided: false,
    source: changes.source ?? "user",
  });
}

export function setAcademicHistoryEventVoided(history, eventId, voided, options) {
  const parsed = validateAcademicHistory(history);
  if (!parsed.ok) throw new TypeError("El historial académico no es válido.");
  const previous = terminalEvent(parsed.history, eventId);
  return appendValidated(parsed.history, {
    ...(previous.extensions ? { extensions: previous.extensions } : {}),
    id: options.id,
    courseId: previous.courseId,
    kind: previous.kind,
    resultStatus: previous.resultStatus,
    occurredAt: previous.occurredAt,
    recordedAt: options.recordedAt,
    revision: previous.revision + 1,
    supersedesEventId: previous.id,
    voided: Boolean(voided),
    source: "user",
  });
}

export function migrateProgressToAcademicHistory(progress, options) {
  const recordedAt = options.recordedAt;
  const events = progress
    .filter((entry) => entry.status === "approved" || entry.status === "exonerated")
    .sort((left, right) => left.courseId.localeCompare(right.courseId))
    .map((entry) => ({
      id: `history:migration:${encodeURIComponent(options.progressPlanId)}:${encodeURIComponent(entry.courseId)}:${entry.status}`,
      courseId: entry.courseId,
      kind: "recorded-status",
      resultStatus: entry.status,
      occurredAt: typeof entry.updatedAt === "string" && Number.isFinite(Date.parse(entry.updatedAt)) ? new Date(entry.updatedAt).toISOString() : null,
      recordedAt,
      revision: 1,
      supersedesEventId: null,
      voided: false,
      source: "migration",
      ...(entry.extensions ? { extensions: entry.extensions } : {}),
    }));
  const parsed = validateAcademicHistory({ events });
  if (!parsed.ok) throw new TypeError("No se pudo migrar el progreso al historial académico.");
  return parsed.history;
}
