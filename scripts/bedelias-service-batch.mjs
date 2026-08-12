export function normalizeLookup(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slug(value) {
  return normalizeLookup(value).replace(/\s+/g, "-");
}

export function parseBoolean(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  throw new Error(`Valor booleano inválido: ${value}`);
}

function splitFilter(value) {
  return String(value ?? "")
    .split("|")
    .map(normalizeLookup)
    .filter(Boolean);
}

export function batchTargetKey(target) {
  return `${String(target.serviceCode).toUpperCase()}:${normalizeLookup(target.programName)}:${target.year}`;
}

export function selectServicePlans(index, options = {}) {
  const currentOnly = parseBoolean(options.currentOnly, true);
  const typeFilters = splitFilter(options.types);
  const careerFilters = splitFilter(options.careers);
  const serviceCode = String(index.service?.code ?? options.serviceCode ?? "").toUpperCase();
  const targets = [];

  for (const program of index.programs ?? []) {
    const normalizedType = normalizeLookup(program.type);
    const normalizedName = normalizeLookup(program.name);
    const matchesType = (filter) => {
      if (filter === "grado") return normalizedType.includes("grado") && !normalizedType.includes("posgrado");
      if (filter === "tecnicatura") return normalizedType.includes("tecnicatura") || normalizedType.includes("tecnologo");
      if (filter === "cio") return normalizedType.includes("cio") || normalizedType.includes("ciclo inicial");
      return normalizedType.includes(filter);
    };
    if (typeFilters.length && !typeFilters.some(matchesType)) continue;
    if (careerFilters.length && !careerFilters.includes(normalizedName)) continue;
    for (const plan of program.plans ?? []) {
      if (currentOnly && !plan.current) continue;
      targets.push({
        serviceCode,
        serviceName: index.service?.name ?? null,
        programName: program.name,
        programType: program.type,
        year: String(plan.year),
        planName: plan.name,
        current: Boolean(plan.current),
      });
    }
  }

  targets.sort((left, right) => left.programName.localeCompare(right.programName, "es") || right.year.localeCompare(left.year, "es"));
  const maxPlans = Number.parseInt(options.maxPlans ?? "", 10);
  return Number.isFinite(maxPlans) && maxPlans >= 0 ? targets.slice(0, maxPlans) : targets;
}

export function reconcileBatchState(previous, index, targets, options = {}, now = new Date().toISOString()) {
  const previousByKey = new Map((previous?.targets ?? []).map((target) => [target.key, target]));
  const reconciledTargets = targets.map((target) => {
    const key = batchTargetKey(target);
    const stored = previousByKey.get(key);
    return {
      ...target,
      key,
      output: options.outputForTarget(target),
      status: stored?.status ?? "pending",
      attempts: stored?.attempts ?? 0,
      startedAt: stored?.startedAt ?? null,
      finishedAt: stored?.finishedAt ?? null,
      lastError: stored?.lastError ?? null,
    };
  });

  return {
    schemaVersion: 1,
    source: index.source,
    service: index.service,
    selection: {
      currentOnly: parseBoolean(options.currentOnly, true),
      types: options.types ?? null,
      careers: options.careers ?? null,
    },
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    targets: reconciledTargets,
  };
}

export function summarizeBatch(state) {
  const summary = { total: 0, pending: 0, running: 0, succeeded: 0, failed: 0, interrupted: 0 };
  for (const target of state.targets ?? []) {
    summary.total += 1;
    if (Object.hasOwn(summary, target.status)) summary[target.status] += 1;
  }
  return summary;
}

export function buildPlanArguments(target, options = {}) {
  const args = [
    options.scraperPath,
    "plan",
    "--service", target.serviceCode,
    "--career", target.programName,
    "--year", target.year,
    "--delay", String(options.delayMs),
    "--output", target.output,
  ];
  if (options.browserPath) args.push("--browser", options.browserPath);
  if (options.headed) args.push("--headed");
  return args;
}
