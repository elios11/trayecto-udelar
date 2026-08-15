#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renameWithRetry } from "./bedelias-atomic-write.mjs";
import { fileURLToPath } from "node:url";
import {
  batchTargetKey,
  normalizeLookup,
  selectServicePlans,
  slug,
} from "./bedelias-service-batch.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVICE_SCRIPT = path.join(PROJECT_ROOT, "scripts", "scrape-bedelias-service.mjs");
const SCRAPER_SCRIPT = path.join(PROJECT_ROOT, "scripts", "scrape-bedelias.mjs");
const DEFAULT_TYPES = "GRADO|TECNICATURA|CIO";
const PLAN_STATES = new Set([
  "discovered",
  "extracted",
  "structurally-valid",
  "official-sources-pending",
  "audited",
  "blocked",
]);

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const [rawKey, inlineValue] = item.slice(2).split("=", 2);
    const next = argv[index + 1];
    if (inlineValue !== undefined) options[rawKey] = inlineValue;
    else if (next && !next.startsWith("--")) {
      options[rawKey] = next;
      index += 1;
    } else options[rawKey] = true;
  }
  return options;
}

function parseBoolean(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  throw new Error(`Valor booleano inválido: ${value}`);
}

function splitCodes(value) {
  return String(value ?? "")
    .split("|")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

async function loadJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function atomicJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await renameWithRetry(temporaryPath, filePath);
}

function runChild(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: PROJECT_ROOT, stdio: "inherit", shell: false });
    child.once("error", (error) => resolve({ code: 1, signal: null, error }));
    child.once("exit", (code, signal) => resolve({ code, signal, error: null }));
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function selectCatalogServices(catalog, options = {}) {
  const requested = new Set(splitCodes(options.services));
  const excluded = new Set(splitCodes(options.excludeServices));
  const services = (catalog.services ?? [])
    .filter((service) => requested.size === 0 || requested.has(service.serviceCode.toUpperCase()))
    .filter((service) => !excluded.has(service.serviceCode.toUpperCase()))
    .sort((left, right) => left.serviceCode.localeCompare(right.serviceCode, "es"));
  const maxServices = Number.parseInt(options.maxServices ?? "", 10);
  return Number.isFinite(maxServices) && maxServices >= 0 ? services.slice(0, maxServices) : services;
}

export function reconcileInventoryRun(previous, services, selection, now = new Date().toISOString()) {
  const previousByCode = new Map((previous?.services ?? []).map((service) => [service.code, service]));
  return {
    schemaVersion: 1,
    selection,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    services: services.map((service) => {
      const stored = previousByCode.get(service.serviceCode);
      return {
        code: service.serviceCode,
        name: service.serviceName,
        area: service.area,
        status: stored?.status ?? "pending",
        attempts: stored?.attempts ?? 0,
        startedAt: stored?.startedAt ?? null,
        finishedAt: stored?.finishedAt ?? null,
        lastError: stored?.lastError ?? null,
      };
    }),
  };
}

function countBy(items, keyForItem) {
  return items.reduce((counts, item) => {
    const key = keyForItem(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function contentHash(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

export function mergeServiceBatches(batchList, { outputExists = existsSync } = {}) {
  const selected = new Map();
  const timestamp = (batch, target) => Date.parse(
    target.finishedAt ?? target.startedAt ?? batch.updatedAt ?? batch.createdAt ?? 0,
  ) || 0;

  for (const batch of batchList.filter(Boolean)) {
    for (const target of batch.targets ?? []) {
      const key = target.key;
      if (!key) continue;
      const candidate = {
        batch,
        target,
        complete: target.status === "succeeded" && outputExists(target.output),
        timestamp: timestamp(batch, target),
      };
      const current = selected.get(key);
      if (!current
        || Number(candidate.complete) > Number(current.complete)
        || (candidate.complete === current.complete && candidate.timestamp >= current.timestamp)) {
        selected.set(key, candidate);
      }
    }
  }

  return {
    targets: [...selected.values()]
      .map((entry) => entry.target)
      .sort((left, right) => left.key.localeCompare(right.key, "es")),
  };
}

async function loadServiceBatches(serviceCode) {
  const directory = path.join(PROJECT_ROOT, "data", "bedelias", "batches");
  const prefix = `${slug(serviceCode)}-`;
  const names = (await readdir(directory))
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
    .sort();
  const batches = await Promise.all(names.map((name) => loadJson(path.join(directory, name))));
  return mergeServiceBatches(batches);
}

export async function buildInventoryManifest({ catalog, runState, indexes, batches, overrides = [], types = DEFAULT_TYPES }) {
  const overridesByKey = new Map(overrides.map((entry) => [entry.key, entry]));
  const runByCode = new Map((runState.services ?? []).map((service) => [service.code, service]));
  const services = [];
  const allPlans = [];

  for (const catalogService of selectCatalogServices(catalog, { services: runState.selection?.services })) {
    const code = catalogService.serviceCode;
    const run = runByCode.get(code);
    const index = indexes.get(code);
    const batch = batches.get(code);
    const batchByKey = new Map((batch?.targets ?? []).map((target) => [target.key, target]));
    const targets = index ? selectServicePlans(index, { currentOnly: true, types }) : [];
    const plans = [];

    for (const target of targets) {
      const key = batchTargetKey(target);
      const batchTarget = batchByKey.get(key);
      const override = overridesByKey.get(key);
      let state = "discovered";
      let stateEvidence = { source: "service-index", at: index.source?.extractedAt ?? null };
      let anomaly = null;

      if (batchTarget?.status === "failed" || batchTarget?.status === "interrupted") {
        state = "blocked";
        anomaly = {
          code: `extraction-${batchTarget.status}`,
          detail: batchTarget.lastError ?? "Extracción incompleta",
          action: "Reanudar exactamente el mismo comando del servicio.",
        };
      } else if (batchTarget?.status === "succeeded" && existsSync(batchTarget.output)) {
        const snapshot = await loadJson(batchTarget.output);
        const issues = snapshot?.validation?.issues;
        state = Array.isArray(issues) && issues.length === 0 ? "structurally-valid" : "extracted";
        stateEvidence = {
          source: "bedelias-snapshot",
          at: snapshot?.source?.extractedAt ?? batchTarget.finishedAt ?? null,
          contentHash: snapshot?.contentHash ?? null,
          validationIssues: Array.isArray(issues) ? issues.length : null,
        };
      }

      if (override) {
        if (!PLAN_STATES.has(override.state)) throw new Error(`Estado de manifiesto inválido para ${key}: ${override.state}`);
        state = override.state;
        stateEvidence = override.evidence;
        anomaly = override.anomaly ?? anomaly;
      }

      const plan = {
        key,
        serviceCode: code,
        career: { name: target.programName, type: target.programType },
        site: null,
        plan: { year: target.year, name: target.planName, current: target.current },
        state,
        stateEvidence,
        coverage: {
          bedeliasIndex: "verified",
          site: "not-published-by-service-index",
          officialSources: state === "audited" ? "audited" : "pending",
        },
        anomalies: anomaly ? [anomaly] : [],
      };
      plans.push(plan);
      allPlans.push(plan);
    }

    services.push({
      code,
      name: catalogService.serviceName,
      area: catalogService.area,
      state: run?.status === "failed" ? "blocked" : "discovered",
      source: index?.source ?? null,
      counts: {
        careers: new Set(plans.map((plan) => normalizeLookup(plan.career.name))).size,
        plans: plans.length,
        byType: countBy(plans, (plan) => plan.career.type),
        byState: countBy(plans, (plan) => plan.state),
      },
      block: run?.status === "failed" ? {
        detail: run.lastError,
        action: "Reanudar el inventario global con el mismo comando.",
      } : null,
      plans,
    });
  }

  const stableContent = {
    scope: { currentOnly: true, types },
    services: services.map(({ source, ...service }) => ({
      ...service,
      source: source ? { system: source.system, extractedAt: source.extractedAt } : null,
    })),
  };
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      system: catalog.source?.system ?? "SGAE Bedelías",
      catalogExtractedAt: catalog.source?.extractedAt ?? null,
      method: "global-service-dry-run",
    },
    scope: stableContent.scope,
    counts: {
      services: services.length,
      careers: new Set(allPlans.map((plan) => `${plan.serviceCode}:${normalizeLookup(plan.career.name)}`)).size,
      plans: allPlans.length,
      byType: countBy(allPlans, (plan) => plan.career.type),
      byState: countBy(allPlans, (plan) => plan.state),
    },
    services,
    contentHash: contentHash(stableContent),
  };
}

function printHelp() {
  console.log(`Inventario global reanudable de Bedelías

Uso:
  npm run bedelias:inventory -- --types "GRADO|TECNICATURA|CIO" --dry-run

Opciones:
  --services A|B          Limita el inventario a códigos de servicio
  --exclude-services A|B Excluye códigos de servicio
  --max-services N       Limita servicios para pruebas
  --types A|B            Tipos incluidos
  --delay 900             Pausa de descubrimiento (mínimo 500 ms)
  --max-attempts 3        Intentos máximos por servicio
  --retry-backoff 3000    Espera base creciente entre reintentos
  --refresh-index true    Refresca índices existentes
  --refresh-catalog true  Refresca el catálogo global de servicios
  --catalog ruta          Catálogo global de servicios
  --manifest-output ruta Salida del manifiesto global
  --checkpoint-output ruta Estado reanudable del inventario
  --dry-run               Obligatorio: no extrae composiciones ni previaturas
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!parseBoolean(options["dry-run"], false)) {
    throw new Error("El inventario global sólo se ejecuta con --dry-run; la extracción se hace por servicio.");
  }

  const types = String(options.types ?? DEFAULT_TYPES);
  const catalogPath = path.resolve(PROJECT_ROOT, options.catalog ?? "data/bedelias/catalog.json");
  const manifestPath = path.resolve(PROJECT_ROOT, options["manifest-output"] ?? "data/bedelias/inventory/global-current.json");
  const checkpointPath = path.resolve(PROJECT_ROOT, options["checkpoint-output"] ?? "data/bedelias/batches/global-inventory.json");
  const overridesPath = path.resolve(PROJECT_ROOT, options["status-overrides"] ?? "data/bedelias/inventory/status-overrides.json");
  if (parseBoolean(options["refresh-catalog"], false)) {
    const catalogArgs = [
      SCRAPER_SCRIPT,
      "catalog",
      "--output", catalogPath,
      "--delay", String(Math.max(500, Number(options.delay ?? 900))),
    ];
    if (options.browser) catalogArgs.push("--browser", options.browser);
    const result = await runChild(catalogArgs);
    if (result.code !== 0) throw new Error("No se pudo refrescar el catálogo global de servicios.");
  }
  const catalog = await loadJson(catalogPath);
  if (!catalog) throw new Error(`No se pudo leer el catálogo ${catalogPath}.`);

  const selectedServices = selectCatalogServices(catalog, {
    services: options.services,
    excludeServices: options["exclude-services"],
    maxServices: options["max-services"],
  });
  const selection = {
    services: selectedServices.map((service) => service.serviceCode).join("|"),
    types,
    currentOnly: true,
  };
  const previous = await loadJson(checkpointPath);
  const sameSelection = previous?.selection?.services === selection.services && previous?.selection?.types === selection.types;
  const state = reconcileInventoryRun(sameSelection ? previous : null, selectedServices, selection);
  await atomicJson(checkpointPath, state);

  const refreshIndex = parseBoolean(options["refresh-index"], false);
  const indexes = new Map();
  const batches = new Map();
  const overrides = (await loadJson(overridesPath, { plans: [] })).plans ?? [];

  const refreshManifest = async () => {
    for (const service of state.services) {
      const indexPath = path.join(PROJECT_ROOT, "data", "bedelias", "services", `${slug(service.code)}-index.json`);
      const index = await loadJson(indexPath);
      const batch = await loadServiceBatches(service.code);
      if (index) indexes.set(service.code, index);
      if (batch.targets.length > 0) batches.set(service.code, batch);
    }
    const manifest = await buildInventoryManifest({ catalog, runState: state, indexes, batches, overrides, types });
    await atomicJson(manifestPath, manifest);
    return manifest;
  };

  let interrupted = false;
  process.once("SIGINT", () => {
    interrupted = true;
    console.log("\nInterrupción solicitada; el inventario conservará el último servicio completo.");
  });

  for (const [position, service] of state.services.entries()) {
    const indexPath = path.join(PROJECT_ROOT, "data", "bedelias", "services", `${slug(service.code)}-index.json`);
    const batchPath = path.join(PROJECT_ROOT, "data", "bedelias", "batches", `${slug(service.code)}-vigentes.json`);
    if (!refreshIndex && service.status === "succeeded" && existsSync(indexPath) && existsSync(batchPath)) {
      console.log(`[${position + 1}/${state.services.length}] ${service.code}: índice ya inventariado.`);
      continue;
    }
    if (interrupted) break;

    service.status = "running";
    service.attempts += 1;
    service.startedAt = new Date().toISOString();
    service.finishedAt = null;
    service.lastError = null;
    state.updatedAt = service.startedAt;
    await atomicJson(checkpointPath, state);

    console.log(`\n[${position + 1}/${state.services.length}] Inventariando ${service.code} · ${service.name}`);
    const args = [
      SERVICE_SCRIPT,
      "--service", service.code,
      "--types", types,
      "--dry-run",
      "--delay", String(Math.max(500, Number(options.delay ?? 900))),
      "--index-output", indexPath,
      "--batch-output", batchPath,
    ];
    if (refreshIndex) args.push("--refresh-index", "true");
    if (options.browser) args.push("--browser", options.browser);
    const maxAttempts = Math.max(1, Number.parseInt(options["max-attempts"] ?? "3", 10));
    const retryBackoffMs = Math.max(0, Number(options["retry-backoff"] ?? 3000));
    let result;
    for (let childAttempt = 1; childAttempt <= maxAttempts; childAttempt += 1) {
      result = await runChild(args);
      if (result.code === 0 || interrupted || childAttempt === maxAttempts) break;
      const waitMs = retryBackoffMs * childAttempt;
      console.log(`${service.code}: intento ${childAttempt}/${maxAttempts} falló; reintento en ${waitMs} ms.`);
      await sleep(waitMs);
    }
    service.finishedAt = new Date().toISOString();
    service.status = result.code === 0 ? "succeeded" : "failed";
    service.lastError = result.error?.message ?? (result.code === 0 ? null : `Código de salida ${result.code}`);
    state.updatedAt = service.finishedAt;
    await atomicJson(checkpointPath, state);
    await refreshManifest();
    if (interrupted) break;
  }

  const manifest = await refreshManifest();
  console.log(`\nInventario: ${manifest.counts.services} servicios, ${manifest.counts.careers} carreras y ${manifest.counts.plans} planes vigentes en alcance.`);
  console.log(`Estados: ${Object.entries(manifest.counts.byState).map(([key, value]) => `${key}=${value}`).join("; ") || "sin planes"}.`);
  console.log(`Manifiesto: ${manifestPath}`);
  if (state.services.some((service) => service.status === "failed")) process.exitCode = 1;
  if (interrupted) process.exitCode = 130;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
