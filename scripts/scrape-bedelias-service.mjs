#!/usr/bin/env node

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPlanArguments,
  parseBoolean,
  reconcileBatchState,
  selectServicePlans,
  slug,
  summarizeBatch,
} from "./bedelias-service-batch.mjs";

const BASE_URL = "https://bedelias.udelar.edu.uy/";
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRAPER_PATH = path.join(PROJECT_ROOT, "scripts", "scrape-bedelias.mjs");
const DEFAULT_BROWSER_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function pickBrowserPath(explicitPath) {
  if (explicitPath && existsSync(explicitPath)) return explicitPath;
  const detected = DEFAULT_BROWSER_PATHS.find(existsSync);
  if (!detected) throw new Error("No se encontró Chrome ni Edge. Use --browser con la ruta al ejecutable.");
  return detected;
}

async function atomicJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

async function loadJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

class ServiceDiscoveryBrowser {
  constructor(options) {
    this.delayMs = Math.max(500, Number(options.delay ?? 900));
    this.browserPath = pickBrowserPath(options.browser);
    this.headless = options.headed !== true;
    this.browser = null;
    this.page = null;
    this.requestCount = 0;
  }

  async open() {
    this.browser = await chromium.launch({
      executablePath: this.browserPath,
      headless: this.headless,
      args: ["--disable-background-networking", "--disable-component-update"],
    });
    const context = await this.browser.newContext({ locale: "es-UY" });
    await context.route("**/*", async (route) => {
      if (["image", "font", "media"].includes(route.request().resourceType())) await route.abort();
      else await route.continue();
    });
    this.page = await context.newPage();
    this.page.setDefaultTimeout(15_000);
    this.page.on("request", (request) => {
      if (new URL(request.url()).hostname === "bedelias.udelar.edu.uy") this.requestCount += 1;
    });
    return this;
  }

  async close() {
    await this.browser?.close();
  }

  async settle(extraMs = 0) {
    await this.page.waitForLoadState("domcontentloaded");
    await sleep(this.delayMs + extraMs);
  }

  async openService(serviceCode) {
    await this.page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await this.settle();
    const accept = this.page.getByRole("link", { name: "Aceptar", exact: true });
    if (await accept.count()) {
      await accept.click();
      await this.settle();
    }
    await this.page.getByRole("link", { name: "PLANES DE ESTUDIO", exact: true }).click();
    await this.page.getByRole("link", { name: "Planes de estudio / Previas", exact: true }).click();
    await this.settle();
    await this.page.getByRole("tab", { name: /TECNOLOGÍA Y CIENCIAS DE LA NATURALEZA/ }).waitFor();

    const services = await this.page.evaluate(() => {
      const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
      return [...document.querySelectorAll('[role="tabpanel"] tr[data-rk]')].map((row) => {
        const text = normalize(row.textContent);
        const [code, ...name] = text.split(" - ");
        const panel = row.closest('[role="tabpanel"]');
        const labelledBy = panel?.getAttribute("aria-labelledby");
        const labelledTab = labelledBy ? document.getElementById(labelledBy) : null;
        return {
          area: normalize(labelledTab?.textContent ?? panel?.previousElementSibling?.textContent),
          dataKey: row.getAttribute("data-rk"),
          code,
          name: name.join(" - "),
        };
      });
    });
    const service = services.find((candidate) => candidate.code.toUpperCase() === serviceCode.toUpperCase());
    if (!service) throw new Error(`No se encontró el servicio ${serviceCode}.`);
    const escapedArea = service.area.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tab = this.page.locator('[role="tab"]:visible').filter({ hasText: new RegExp(escapedArea) }).first();
    if (await tab.getAttribute("aria-selected") !== "true") {
      await tab.click();
      await sleep(this.delayMs);
    }
    const row = this.page.locator(`tr[data-rk="${service.dataKey}"]`)
      .filter({ hasText: new RegExp(`^${service.code} - `) })
      .first();
    await Promise.all([
      this.page.waitForURL(/consultaOfertaAcademica02/, { timeout: 20_000 }),
      row.click(),
    ]);
    await this.settle();
    await this.page.getByRole("textbox", { name: "Filtrar por Nombre" }).waitFor();
    return service;
  }

  async listProgramsPage() {
    return this.page.evaluate(() => {
      const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
      const table = [...document.querySelectorAll('[role="grid"]')]
        .find((node) => normalize(node.textContent).includes("Nombre") && normalize(node.textContent).includes("Tipo"));
      if (!table) return [];
      return [...table.querySelectorAll(":scope > tbody > tr[data-rk]")].map((row) => {
        const cells = [...row.querySelectorAll(":scope > td")].map((cell) => normalize(cell.textContent));
        return { dataKey: row.getAttribute("data-rk"), name: cells.at(-2), type: cells.at(-1) };
      }).filter((program) => program.name);
    });
  }

  async listAllPrograms() {
    const collected = new Map();
    const visitedPages = new Set();
    for (let pageIndex = 0; pageIndex < 100; pageIndex += 1) {
      const programs = await this.listProgramsPage();
      const signature = programs.map((program) => `${program.name}:${program.type}`).join("|");
      if (visitedPages.has(signature)) break;
      visitedPages.add(signature);
      for (const program of programs) collected.set(`${program.name}:${program.type}`, program);

      const next = this.page.locator(".ui-paginator-next:visible").last();
      if ((await next.count()) === 0) break;
      const className = await next.getAttribute("class");
      const ariaDisabled = await next.getAttribute("aria-disabled");
      if (ariaDisabled === "true" || /ui-state-disabled/.test(className ?? "")) break;
      await next.click();
      await this.settle();
    }
    return [...collected.values()];
  }

  async listPlans(programName) {
    const input = this.page.getByRole("textbox", { name: "Filtrar por Nombre" });
    await input.fill("");
    await input.type(programName);
    await input.press("Enter");
    await this.settle(250);
    const first = this.page.locator(".ui-paginator-first:visible").last();
    if ((await first.count()) > 0) {
      const className = await first.getAttribute("class");
      const ariaDisabled = await first.getAttribute("aria-disabled");
      if (ariaDisabled !== "true" && !/ui-state-disabled/.test(className ?? "")) {
        await first.click();
        await this.settle();
      }
    }
    const programs = await this.listProgramsPage();
    const program = programs.find((candidate) => candidate.name.toUpperCase() === programName.toUpperCase());
    if (!program) throw new Error(`No se encontró la carrera «${programName}» luego de aplicar el filtro.`);
    const row = this.page.locator(`tr[data-rk="${program.dataKey}"]`).first();
    await row.getByRole("button", { name: "Alternar fila" }).click();
    await this.settle();
    return row.evaluate((element) => {
      const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
      return [...(element.nextElementSibling?.querySelectorAll("tbody > tr") ?? [])].map((planRow) => {
        const cells = [...planRow.querySelectorAll(":scope > td")];
        if (cells.length < 3) return null;
        return {
          year: normalize(cells[0].textContent),
          name: normalize(cells[1].textContent),
          current: /^s[ií]$/i.test(normalize(cells[2].textContent)),
        };
      }).filter(Boolean);
    });
  }
}

async function discoverService(options, outputPath) {
  const serviceCode = String(options.service ?? "FING").toUpperCase();
  const client = await new ServiceDiscoveryBrowser(options).open();
  try {
    const service = await client.openService(serviceCode);
    const discoveredPrograms = await client.listAllPrograms();
    const programs = [];
    for (let index = 0; index < discoveredPrograms.length; index += 1) {
      const program = discoveredPrograms[index];
      const plans = await client.listPlans(program.name);
      programs.push({ name: program.name, type: program.type, plans });
      process.stdout.write(`\rDescubriendo ${index + 1}/${discoveredPrograms.length} · ${program.name}   `);
    }
    process.stdout.write("\n");
    const dataset = {
      schemaVersion: 1,
      source: {
        system: "SGAE Bedelías",
        baseUrl: BASE_URL,
        extractedAt: new Date().toISOString(),
        method: "public-ui-browser",
        rateLimitMs: client.delayMs,
        requestCount: client.requestCount,
      },
      service: { code: service.code, name: service.name, area: service.area },
      programs,
    };
    await atomicJson(outputPath, dataset);
    return dataset;
  } finally {
    await client.close();
  }
}

function runChild(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: PROJECT_ROOT, stdio: "inherit", shell: false });
    child.once("error", (error) => resolve({ code: 1, signal: null, error }));
    child.once("exit", (code, signal) => resolve({ code, signal, error: null }));
  });
}

function printHelp() {
  console.log(`Recolector desatendido de Bedelías por servicio

Uso:
  npm run bedelias:service -- --service FING

Opciones:
  --current-only true   Procesa solo planes vigentes (predeterminado)
  --types A|B           Filtra tipos; por defecto grado, tecnicaturas y CIO; all incluye todos
  --careers A|B         Filtra por nombres exactos de carrera
  --max-plans N         Limita el lote para pruebas
  --delay 900           Pausa del importador por plan (mínimo 500 ms)
  --between-plans 3000  Pausa adicional entre planes
  --dry-run             Descubre y muestra el lote sin extraer planes
  --refresh-index true  Actualiza el índice; por defecto reutiliza el existente
  --headed              Muestra los navegadores durante la extracción
  --browser ruta        Ejecutable de Chrome/Edge
  --index-output ruta   Ruta del índice descubierto
  --batch-output ruta   Ruta del estado reanudable del lote
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const serviceCode = String(options.service ?? "FING").toUpperCase();
  const delayMs = Math.max(500, Number(options.delay ?? 900));
  const betweenPlansMs = Math.max(0, Number(options["between-plans"] ?? 3000));
  const indexPath = path.resolve(PROJECT_ROOT, options["index-output"] ?? `data/bedelias/services/${slug(serviceCode)}-index.json`);
  const batchPath = path.resolve(PROJECT_ROOT, options["batch-output"] ?? `data/bedelias/batches/${slug(serviceCode)}-vigentes.json`);
  const refreshIndex = parseBoolean(options["refresh-index"], !existsSync(indexPath));
  const dryRun = parseBoolean(options["dry-run"], false);

  let index = !refreshIndex ? await loadJson(indexPath, null) : null;
  if (!index) index = await discoverService({ ...options, service: serviceCode, delay: delayMs }, indexPath);

  const typeFilter = options.types === "all" ? undefined : options.types ?? "Grado|Tecnicatura|Tecnólogo|CIO|Ciclo Inicial";
  const targets = selectServicePlans(index, {
    currentOnly: options["current-only"],
    types: typeFilter,
    careers: options.careers,
    maxPlans: options["max-plans"],
  });
  const previous = await loadJson(batchPath, null);
  const outputForTarget = (target) => path.resolve(PROJECT_ROOT, `data/bedelias/${slug(target.serviceCode)}-${slug(target.programName)}-${target.year}.json`);
  const state = reconcileBatchState(previous, index, targets, {
    currentOnly: options["current-only"],
    types: typeFilter,
    careers: options.careers,
    outputForTarget,
  });
  await atomicJson(batchPath, state);

  console.log(`Lote: ${targets.length} planes de ${index.service.name}.`);
  for (const [indexPosition, target] of state.targets.entries()) {
    console.log(`  ${indexPosition + 1}. ${target.programName} · ${target.year} · ${target.programType}`);
  }
  if (dryRun || targets.length === 0) {
    console.log(dryRun ? "Modo dry-run: no se extrajeron planes." : "No hay planes que coincidan con los filtros.");
    return;
  }

  let interrupted = false;
  process.once("SIGINT", () => {
    interrupted = true;
    console.log("\nInterrupción solicitada; se conservarán los checkpoints.");
  });

  for (let indexPosition = 0; indexPosition < state.targets.length; indexPosition += 1) {
    const target = state.targets[indexPosition];
    if (target.status === "succeeded" && existsSync(target.output)) {
      console.log(`Omitiendo ${target.programName} ${target.year}: ya está completo.`);
      continue;
    }
    if (interrupted) break;

    target.status = "running";
    target.attempts += 1;
    target.startedAt = new Date().toISOString();
    target.finishedAt = null;
    target.lastError = null;
    state.updatedAt = target.startedAt;
    await atomicJson(batchPath, state);

    console.log(`\n[${indexPosition + 1}/${state.targets.length}] ${target.programName} · Plan ${target.year}`);
    const result = await runChild(buildPlanArguments(target, {
      scraperPath: SCRAPER_PATH,
      delayMs,
      browserPath: options.browser,
      headed: parseBoolean(options.headed, false),
    }));
    target.finishedAt = new Date().toISOString();
    if (result.code === 0) {
      target.status = "succeeded";
    } else if (result.signal || interrupted) {
      target.status = "interrupted";
      target.lastError = result.signal ? `Señal ${result.signal}` : "Interrumpido por la persona usuaria";
    } else {
      target.status = "failed";
      target.lastError = result.error?.message ?? `Código de salida ${result.code}`;
    }
    state.updatedAt = target.finishedAt;
    await atomicJson(batchPath, state);
    if (interrupted) break;
    if (indexPosition < state.targets.length - 1) await sleep(betweenPlansMs);
  }

  const summary = summarizeBatch(state);
  console.log(`\nResumen: ${summary.succeeded}/${summary.total} completos; ${summary.failed} fallidos; ${summary.interrupted} interrumpidos.`);
  console.log(`Estado reanudable: ${batchPath}`);
  if (interrupted) process.exitCode = 130;
  else if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
