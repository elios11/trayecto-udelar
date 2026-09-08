export const PERSONAL_DATA_FORMAT = "trayecto-personal-data";
export const PERSONAL_DATA_VERSION = 3;

const LOAD_UNITS = new Set(["credits", "hours", "courses"]);
const PROGRESS_STATUSES = new Set(["pending", "approved", "exonerated"]);
const TERM_STATUSES = new Set(["planned", "in-progress", "closed"]);
const ISO_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;

export class PersonalDataValidationError extends TypeError {
  constructor(issues) {
    super("El documento de datos personales v3 no es válido.");
    this.name = "PersonalDataValidationError";
    this.issues = issues;
  }
}

function addIssue(issues, path, code, message) {
  issues.push({ path, code, message });
}

function checkJsonValue(value, path, issues, ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) addIssue(issues, path, "not_json", "Debe ser un número finito para poder representarse en JSON.");
    return;
  }
  if (typeof value !== "object") {
    addIssue(issues, path, "not_json", "Contiene un valor que no puede representarse en JSON.");
    return;
  }
  if (ancestors.has(value)) {
    addIssue(issues, path, "not_json", "Contiene una referencia circular que no puede representarse en JSON.");
    return;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null) {
    addIssue(issues, path, "not_json", "Debe contener solamente objetos, arreglos y valores JSON.");
    return;
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        addIssue(issues, `${path}[${index}]`, "not_json", "Los arreglos no pueden contener posiciones vacías.");
      } else {
        checkJsonValue(value[index], `${path}[${index}]`, issues, ancestors);
      }
    }
  } else {
    for (const symbol of Object.getOwnPropertySymbols(value)) {
      if (Object.prototype.propertyIsEnumerable.call(value, symbol)) {
        addIssue(issues, path, "not_json", "Los objetos JSON no pueden contener claves Symbol.");
        break;
      }
    }
    for (const [key, child] of Object.entries(value)) {
      checkJsonValue(child, `${path}.${key}`, issues, ancestors);
    }
  }
  ancestors.delete(value);
}

function asRecord(value, path, issues) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    addIssue(issues, path, "invalid_type", "Debe ser un objeto.");
    return null;
  }
  return value;
}

function asArray(value, path, issues) {
  if (!Array.isArray(value)) {
    addIssue(issues, path, "invalid_type", "Debe ser una colección.");
    return [];
  }
  return value;
}

function asId(value, path, issues) {
  if (typeof value !== "string" || value.trim() === "") {
    addIssue(issues, path, "invalid_id", "Debe ser un identificador no vacío.");
    return "";
  }
  return value.trim();
}

function asNullableId(value, path, issues) {
  return value === null ? null : asId(value, path, issues);
}

function asText(value, path, issues) {
  if (typeof value !== "string" || value.trim() === "") {
    addIssue(issues, path, "invalid_text", "Debe ser un texto no vacío.");
    return "";
  }
  return value.trim();
}

function asBoolean(value, path, issues) {
  if (typeof value !== "boolean") {
    addIssue(issues, path, "invalid_type", "Debe ser verdadero o falso.");
    return false;
  }
  return value;
}

function isValidCalendarDate(year, month, day) {
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function normalizeDate(value, path, issues, nullable = false) {
  if (nullable && (value === null || value === undefined)) return null;
  if (typeof value !== "string") {
    addIssue(issues, path, "invalid_date", "Debe ser una fecha y hora ISO 8601 con zona horaria.");
    return "";
  }

  const match = ISO_DATE_TIME.exec(value);
  if (!match) {
    addIssue(issues, path, "invalid_date", "Debe ser una fecha y hora ISO 8601 con zona horaria.");
    return "";
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = zone === "Z" ? 0 : Number(zone.slice(1, 3));
  const offsetMinute = zone === "Z" ? 0 : Number(zone.slice(4, 6));
  const timestamp = Date.parse(value);
  if (!isValidCalendarDate(year, month, day) || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59 || !Number.isFinite(timestamp)) {
    addIssue(issues, path, "invalid_date", "Debe ser una fecha y hora ISO 8601 válida.");
    return "";
  }
  return new Date(timestamp).toISOString();
}

function validateDateOrder(createdAt, updatedAt, path, issues) {
  if (createdAt && updatedAt && Date.parse(updatedAt) < Date.parse(createdAt)) {
    addIssue(issues, `${path}.updatedAt`, "invalid_date_order", "No puede ser anterior a createdAt.");
  }
}

function asEnum(value, allowed, path, issues, label) {
  if (typeof value !== "string" || !allowed.has(value)) {
    addIssue(issues, path, "invalid_enum", `Debe ser ${label}.`);
    return "";
  }
  return value;
}

function parseSelection(value, path, issues) {
  const record = asRecord(value, path, issues);
  if (!record) return null;
  return {
    facultyId: asId(record.facultyId, `${path}.facultyId`, issues),
    careerId: asId(record.careerId, `${path}.careerId`, issues),
    planId: asId(record.planId, `${path}.planId`, issues),
    progressPlanId: asId(record.progressPlanId, `${path}.progressPlanId`, issues),
    campusId: asNullableId(record.campusId, `${path}.campusId`, issues),
    trajectoryId: asNullableId(record.trajectoryId, `${path}.trajectoryId`, issues),
    credentialId: asNullableId(record.credentialId, `${path}.credentialId`, issues),
  };
}

function parseLoadTarget(value, path, issues) {
  if (value === null || value === undefined) return null;
  const record = asRecord(value, path, issues);
  if (!record) return null;
  const target = {
    unit: asEnum(record.unit, LOAD_UNITS, `${path}.unit`, issues, "credits, hours o courses"),
    value: record.value,
  };
  if (typeof record.value !== "number" || !Number.isFinite(record.value) || record.value <= 0) {
    addIssue(issues, `${path}.value`, "invalid_number", "Debe ser un número finito mayor que cero.");
    target.value = 0;
  }
  return target;
}

function parseTerm(value, path, issues) {
  const record = asRecord(value, path, issues);
  if (!record) return null;
  const startsAt = normalizeDate(record.startsAt, `${path}.startsAt`, issues, true);
  const endsAt = normalizeDate(record.endsAt, `${path}.endsAt`, issues, true);
  if (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    addIssue(issues, `${path}.endsAt`, "invalid_date_order", "No puede ser anterior a startsAt.");
  }
  const courseIds = asArray(record.courseIds, `${path}.courseIds`, issues).map((courseId, index) => (
    asId(courseId, `${path}.courseIds[${index}]`, issues)
  ));
  const localCourseIds = new Set();
  courseIds.forEach((courseId, index) => {
    if (courseId && localCourseIds.has(courseId)) addIssue(issues, `${path}.courseIds[${index}]`, "duplicate_id", `La materia ${courseId} aparece más de una vez en el semestre.`);
    localCourseIds.add(courseId);
  });
  return {
    id: asId(record.id, `${path}.id`, issues),
    label: asText(record.label, `${path}.label`, issues),
    status: asEnum(record.status, TERM_STATUSES, `${path}.status`, issues, "planned, in-progress o closed"),
    startsAt,
    endsAt,
    loadTarget: parseLoadTarget(record.loadTarget, `${path}.loadTarget`, issues),
    courseIds,
  };
}

function parseScenario(value, path, issues) {
  const record = asRecord(value, path, issues);
  if (!record) return null;
  const createdAt = normalizeDate(record.createdAt, `${path}.createdAt`, issues);
  const updatedAt = normalizeDate(record.updatedAt, `${path}.updatedAt`, issues);
  validateDateOrder(createdAt, updatedAt, path, issues);

  const terms = asArray(record.terms, `${path}.terms`, issues)
    .map((term, index) => parseTerm(term, `${path}.terms[${index}]`, issues))
    .filter(Boolean);
  const termIds = new Set();
  const scenarioCourseIds = new Set();
  terms.forEach((term, termIndex) => {
    if (term.id && termIds.has(term.id)) addIssue(issues, `${path}.terms[${termIndex}].id`, "duplicate_id", `El semestre ${term.id} está repetido en el escenario.`);
    termIds.add(term.id);
    term.courseIds.forEach((courseId, courseIndex) => {
      if (courseId && scenarioCourseIds.has(courseId)) addIssue(issues, `${path}.terms[${termIndex}].courseIds[${courseIndex}]`, "duplicate_course", `La materia ${courseId} aparece en más de un semestre del escenario.`);
      scenarioCourseIds.add(courseId);
    });
  });

  const currentTermId = asNullableId(record.currentTermId, `${path}.currentTermId`, issues);
  if (currentTermId && !termIds.has(currentTermId)) {
    addIssue(issues, `${path}.currentTermId`, "missing_reference", "El semestre actual no existe en el escenario.");
  } else if (currentTermId && terms.find((term) => term.id === currentTermId)?.status === "closed") {
    addIssue(issues, `${path}.currentTermId`, "closed_reference", "El semestre actual no puede estar cerrado.");
  }

  return {
    id: asId(record.id, `${path}.id`, issues),
    name: asText(record.name, `${path}.name`, issues),
    isPrimary: asBoolean(record.isPrimary, `${path}.isPrimary`, issues),
    archived: asBoolean(record.archived, `${path}.archived`, issues),
    createdAt,
    updatedAt,
    currentTermId,
    terms,
  };
}

function parsePlanning(value, path, issues) {
  const record = asRecord(value, path, issues);
  if (!record) return null;
  const scenarios = asArray(record.scenarios, `${path}.scenarios`, issues)
    .map((scenario, index) => parseScenario(scenario, `${path}.scenarios[${index}]`, issues))
    .filter(Boolean);
  const scenarioIds = new Set();
  let primaryCount = 0;
  scenarios.forEach((scenario, index) => {
    if (scenario.id && scenarioIds.has(scenario.id)) addIssue(issues, `${path}.scenarios[${index}].id`, "duplicate_id", `El escenario ${scenario.id} está repetido.`);
    scenarioIds.add(scenario.id);
    if (scenario.isPrimary) primaryCount += 1;
  });
  if (primaryCount > 1) addIssue(issues, `${path}.scenarios`, "multiple_primary", "Sólo un escenario puede estar marcado como principal.");

  const activeScenarioId = asNullableId(record.activeScenarioId, `${path}.activeScenarioId`, issues);
  const activeScenario = scenarios.find((scenario) => scenario.id === activeScenarioId);
  if (activeScenarioId && !activeScenario) {
    addIssue(issues, `${path}.activeScenarioId`, "missing_reference", "El escenario activo no existe.");
  } else if (activeScenario?.archived) {
    addIssue(issues, `${path}.activeScenarioId`, "archived_reference", "El escenario activo no puede estar archivado.");
  }
  return { activeScenarioId, scenarios };
}

function parseProgress(value, path, issues) {
  const progress = asArray(value, path, issues).map((entry, index) => {
    const entryPath = `${path}[${index}]`;
    const record = asRecord(entry, entryPath, issues);
    if (!record) return null;
    return {
      courseId: asId(record.courseId, `${entryPath}.courseId`, issues),
      status: asEnum(record.status, PROGRESS_STATUSES, `${entryPath}.status`, issues, "pending, approved o exonerated"),
      updatedAt: normalizeDate(record.updatedAt, `${entryPath}.updatedAt`, issues, true),
    };
  }).filter(Boolean);
  const courseIds = new Set();
  progress.forEach((entry, index) => {
    if (entry.courseId && courseIds.has(entry.courseId)) addIssue(issues, `${path}[${index}].courseId`, "duplicate_id", `La materia ${entry.courseId} tiene más de un estado de progreso.`);
    courseIds.add(entry.courseId);
  });
  return progress;
}

function parseProfile(value, path, issues) {
  const record = asRecord(value, path, issues);
  if (!record) return null;
  return {
    id: asId(record.id, `${path}.id`, issues),
    selection: parseSelection(record.selection, `${path}.selection`, issues),
    curriculumRevision: asNullableId(record.curriculumRevision, `${path}.curriculumRevision`, issues),
    loadUnit: asEnum(record.loadUnit, LOAD_UNITS, `${path}.loadUnit`, issues, "credits, hours o courses"),
    progress: parseProgress(record.progress, `${path}.progress`, issues),
    planning: parsePlanning(record.planning, `${path}.planning`, issues),
  };
}

function parseDocument(input, issues) {
  const record = asRecord(input, "$", issues);
  if (!record) return null;
  if (record.format !== PERSONAL_DATA_FORMAT) addIssue(issues, "$.format", "unknown_format", `Debe ser ${PERSONAL_DATA_FORMAT}.`);
  if (record.formatVersion !== PERSONAL_DATA_VERSION) addIssue(issues, "$.formatVersion", "unsupported_version", `Sólo se admite formatVersion ${PERSONAL_DATA_VERSION}.`);

  const revision = record.revision;
  if (!Number.isInteger(revision) || revision < 0) addIssue(issues, "$.revision", "invalid_revision", "Debe ser un entero mayor o igual que cero.");
  const createdAt = normalizeDate(record.createdAt, "$.createdAt", issues);
  const updatedAt = normalizeDate(record.updatedAt, "$.updatedAt", issues);
  validateDateOrder(createdAt, updatedAt, "$", issues);
  const profiles = asArray(record.profiles, "$.profiles", issues)
    .map((profile, index) => parseProfile(profile, `$.profiles[${index}]`, issues))
    .filter(Boolean);
  const profileIds = new Set();
  profiles.forEach((profile, index) => {
    if (profile.id && profileIds.has(profile.id)) addIssue(issues, `$.profiles[${index}].id`, "duplicate_id", `El perfil ${profile.id} está repetido.`);
    profileIds.add(profile.id);
  });
  const activeProfileId = asNullableId(record.activeProfileId, "$.activeProfileId", issues);
  if (activeProfileId && !profileIds.has(activeProfileId)) addIssue(issues, "$.activeProfileId", "missing_reference", "El perfil académico activo no existe.");

  return {
    format: PERSONAL_DATA_FORMAT,
    formatVersion: PERSONAL_DATA_VERSION,
    id: asId(record.id, "$.id", issues),
    revision: Number.isInteger(revision) && revision >= 0 ? revision : 0,
    createdAt,
    updatedAt,
    lastModifiedByDeviceId: asNullableId(record.lastModifiedByDeviceId, "$.lastModifiedByDeviceId", issues),
    activeProfileId,
    profiles,
  };
}

export function parsePersonalDataV3(input) {
  const issues = [];
  try {
    checkJsonValue(input, "$", issues);
    const document = parseDocument(input, issues);
    return issues.length === 0 && document
      ? { ok: true, document }
      : { ok: false, issues };
  } catch {
    return {
      ok: false,
      issues: [{ path: "$", code: "unreadable_value", message: "No se pudo inspeccionar el valor sin ejecutar código externo." }],
    };
  }
}

export function serializePersonalDataV3(document) {
  const result = parsePersonalDataV3(document);
  if (!result.ok) throw new PersonalDataValidationError(result.issues);
  return JSON.stringify(result.document);
}
