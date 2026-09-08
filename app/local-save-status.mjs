export const LOCAL_SAVE_PHASES = ["checking", "saved", "failed"];
export const LOCAL_SAVE_ERROR_KINDS = ["quota", "blocked", "corrupt", "unknown"];

export function initialLocalSaveStatus() {
  return { phase: "checking", savedAt: null, errorKind: null };
}

export function savedLocalSaveStatus(savedAt) {
  const timestamp = normalizeTimestamp(savedAt);
  return { phase: "saved", savedAt: timestamp, errorKind: null };
}

export function classifyLocalSaveError(error) {
  const name = typeof error === "object" && error !== null && typeof error.name === "string" ? error.name : "";
  const code = typeof error === "object" && error !== null && typeof error.code === "number" ? error.code : null;
  if (["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"].includes(name) || code === 22 || code === 1014) return "quota";
  if (["SecurityError", "NotAllowedError"].includes(name)) return "blocked";
  return "unknown";
}

export function failedLocalSaveStatus(error, options = {}) {
  const errorKind = options.errorKind && LOCAL_SAVE_ERROR_KINDS.includes(options.errorKind)
    ? options.errorKind
    : classifyLocalSaveError(error);
  return { phase: "failed", savedAt: normalizeTimestamp(options.savedAt), errorKind };
}

export function localSaveStatusPresentation(status) {
  if (!status || status.phase === "checking") {
    return {
      title: "Comprobando guardado…",
      detail: "Estamos revisando los datos de este navegador.",
      canRetry: false,
    };
  }
  if (status.phase === "saved") {
    return {
      title: "Guardado en este dispositivo",
      detail: "Tus cambios quedan en este navegador; no hay una cuenta ni una copia en la nube.",
      canRetry: false,
    };
  }
  const details = {
    quota: "El navegador no tiene espacio disponible. Exportá una copia y liberá almacenamiento antes de reintentar.",
    blocked: "El navegador bloqueó el almacenamiento local. Revisá sus permisos o probá fuera del modo privado.",
    corrupt: "La copia principal está dañada y permanece protegida. Importá una exportación válida para reactivar el guardado.",
    unknown: "El navegador no pudo guardar los últimos cambios. Exportá una copia y volvé a intentar.",
  };
  return {
    title: "Cambios sin guardar en este dispositivo",
    detail: details[status.errorKind] ?? details.unknown,
    canRetry: status.errorKind !== "corrupt",
  };
}

export function persistLocalDocument(document, options) {
  try {
    const serialized = options.serialize(document);
    options.write(serialized);
    return { ok: true, serialized, status: savedLocalSaveStatus(document?.updatedAt) };
  } catch (error) {
    return { ok: false, error, status: failedLocalSaveStatus(error, { savedAt: options.previousSavedAt }) };
  }
}

function normalizeTimestamp(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}
