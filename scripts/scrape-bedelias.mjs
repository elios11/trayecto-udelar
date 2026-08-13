#!/usr/bin/env node

import { chromium } from "playwright-core";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergePrerequisiteCheckpoint } from "./bedelias-checkpoint.mjs";
import { incompleteLogicalNodes, removeIncompletePrerequisiteRules } from "../lib/requirement-expression.mjs";
import { openServicePrograms } from "./bedelias-browser-navigation.mjs";

const BASE_URL = "https://bedelias.udelar.edu.uy/";
const DEFAULT_BROWSER_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function parseArgs(argv) {
  const [command = "help", ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith("--")) continue;
    const [rawKey, inlineValue] = item.slice(2).split("=", 2);
    const next = rest[index + 1];
    if (inlineValue !== undefined) options[rawKey] = inlineValue;
    else if (next && !next.startsWith("--")) {
      options[rawKey] = next;
      index += 1;
    } else options[rawKey] = true;
  }
  return { command, options };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const normalizeLookup = (value) => normalizeSpace(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const slug = (value) => normalizeSpace(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function samePrerequisiteTarget(candidate, target) {
  return normalizeLookup(candidate?.code) === normalizeLookup(target?.code)
    && candidate?.assessment === target?.assessment
    && (!target?.name || normalizeLookup(candidate?.name) === normalizeLookup(target.name));
}

export function buildPrerequisiteRequests({ requestedCodes, requestedNames, planCourses, serviceCode }) {
  const courseCodes = requestedCodes.length || requestedNames.length
    ? requestedCodes
    : planCourses.filter((course) => !course.serviceCode || course.serviceCode === serviceCode).map((course) => course.code);
  return {
    courseCodes: [...new Set(courseCodes)],
    requests: [
      ...[...new Set(courseCodes)].map((value) => ({ kind: "code", value })),
      ...[...new Set(requestedNames)].map((value) => ({ kind: "name", value })),
    ],
  };
}

function stableHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function pickBrowserPath(explicitPath) {
  if (explicitPath && existsSync(explicitPath)) return explicitPath;
  const detected = DEFAULT_BROWSER_PATHS.find(existsSync);
  if (!detected) throw new Error("No se encontró Chrome ni Edge. Use --browser con la ruta al ejecutable.");
  return detected;
}

async function atomicJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temp, filePath);
}

async function loadJson(filePath, fallback) {
  try { return JSON.parse(await readFile(filePath, "utf8")); }
  catch { return fallback; }
}

class BedeliasBrowser {
  constructor(options) {
    this.delayMs = Math.max(500, Number(options.delay ?? 900));
    this.browserPath = pickBrowserPath(options.browser);
    this.headless = options.headed !== true;
    this.browser = null;
    this.page = null;
    this.requestCount = 0;
    this.requestTypes = {};
  }

  async open() {
    this.browser = await chromium.launch({
      executablePath: this.browserPath,
      headless: this.headless,
      args: ["--disable-background-networking", "--disable-component-update"],
    });
    const context = await this.browser.newContext({ locale: "es-UY" });
    await context.route("**/*", async (route) => {
      const resourceType = route.request().resourceType();
      if (["image", "font", "media"].includes(resourceType)) await route.abort();
      else await route.continue();
    });
    this.page = await context.newPage();
    this.page.setDefaultTimeout(15_000);
    this.page.on("request", (request) => {
      if (new URL(request.url()).hostname === "bedelias.udelar.edu.uy") this.requestCount += 1;
      const type = request.resourceType();
      this.requestTypes[type] = (this.requestTypes[type] ?? 0) + 1;
    });
    return this;
  }

  async close() { await this.browser?.close(); }

  async settle(extraMs = 0) {
    await this.page.waitForLoadState("domcontentloaded");
    await sleep(this.delayMs + extraMs);
  }

  async gotoHome() {
    await this.page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await this.settle();
    const accept = this.page.getByRole("link", { name: "Aceptar", exact: true });
    if (await accept.count()) {
      await accept.click();
      await this.settle();
    }
  }

  async openAcademicOffer() {
    await this.gotoHome();
    await this.page.getByRole("link", { name: "PLANES DE ESTUDIO", exact: true }).click();
    await this.page.getByRole("link", { name: "Planes de estudio / Previas", exact: true }).click();
    await this.settle();
    await this.page.getByRole("tab", { name: /TECNOLOGÍA Y CIENCIAS DE LA NATURALEZA/ }).waitFor();
  }

  async listServices() {
    return this.page.evaluate(() => {
      const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
      return [...document.querySelectorAll('[role="tabpanel"] tr[data-rk]')].map((row) => {
        const text = clean(row.textContent);
        const [code, ...name] = text.split(" - ");
        const panel = row.closest('[role="tabpanel"]');
        const header = panel?.previousElementSibling;
        return { area: clean(header?.textContent), serviceCode: code, serviceName: name.join(" - "), dataKey: row.getAttribute("data-rk") };
      });
    });
  }

  async selectService(serviceCode) {
    const services = await this.listServices();
    const service = services.find((item) => item.serviceCode.toUpperCase() === serviceCode.toUpperCase());
    if (!service) throw new Error(`No se encontró el servicio ${serviceCode}.`);
    const escapedArea = service.area.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tab = this.page.locator('[role="tab"]:visible').filter({ hasText: new RegExp(escapedArea) }).first();
    if (await tab.getAttribute("aria-selected") !== "true") await tab.click();
    const serviceRow = this.page.locator('[role="tabpanel"]:visible')
      .getByRole("row", { name: new RegExp(`^${service.serviceCode} - `) })
      .first();
    await serviceRow.waitFor({ state: "visible" });
    const programFilter = await openServicePrograms(this.page, serviceRow);
    await this.settle();
    await programFilter.waitFor();
    return service;
  }

  async listPrograms() {
    return this.page.evaluate(() => {
      const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
      const table = [...document.querySelectorAll('[role="grid"]')].find((node) => clean(node.textContent).includes("Nombre") && clean(node.textContent).includes("Tipo"));
      if (!table) return [];
      return [...table.querySelectorAll("tbody > tr[data-rk]")].map((row) => {
        const cells = [...row.querySelectorAll(":scope > td")].map((cell) => clean(cell.textContent));
        return { dataKey: row.getAttribute("data-rk"), name: cells.at(-2), type: cells.at(-1) };
      }).filter((item) => item.name);
    });
  }

  async findProgram(programName) {
    const input = this.page.getByRole("textbox", { name: "Filtrar por Nombre" });
    await input.fill("");
    await input.type(programName);
    await input.press("Enter");
    await this.settle(250);
    const programs = await this.listPrograms();
    const exact = programs.find((item) => normalizeSpace(item.name).toUpperCase() === normalizeSpace(programName).toUpperCase());
    if (!exact) throw new Error(`No se encontró la carrera «${programName}». Coincidencias: ${programs.map((item) => item.name).join(", ")}`);
    return exact;
  }

  async expandProgram(program) {
    const row = this.page.locator(`tr[data-rk="${program.dataKey}"]`).first();
    await row.getByRole("button", { name: "Alternar fila" }).click();
    await this.settle();
    return row.evaluate((element) => {
      const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
      const expansion = element.nextElementSibling;
      return [...(expansion?.querySelectorAll("tbody > tr") ?? [])].map((planRow) => {
        const cells = [...planRow.querySelectorAll(":scope > td")];
        if (cells.length < 3) return null;
        return {
          year: clean(cells[0].textContent),
          name: clean(cells[1].textContent),
          current: /^s[ií]$/i.test(clean(cells[2].textContent)),
          rowKey: planRow.getAttribute("data-rk"),
        };
      }).filter(Boolean);
    });
  }

  async openPlan(year) {
    const planRow = this.page.getByRole("row", { name: new RegExp(`^${year}\\s`) }).first();
    await planRow.getByRole("link").click();
    await this.settle();
    await this.page.getByRole("button", { name: "Sistema de previaturas", exact: true }).waitFor();
  }

  async extractPlan() {
    return this.page.evaluate(() => {
      const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
      const heading = [...document.querySelectorAll("tr")].map((row) => clean(row.textContent)).find((text) => /^Plan \d{4} - /.test(text));
      const basicGrid = [...document.querySelectorAll('[role="grid"]')].find((grid) => clean(grid.textContent).includes("Créditos mínimos"));
      const basicCells = basicGrid ? [...basicGrid.querySelectorAll("tbody tr:last-child > td")].map((cell) => clean(cell.textContent)) : [];
      const colibri = basicGrid?.querySelector('a[href*="hdl.handle.net"]')?.href ?? null;

      function parseCourseLabel(text) {
        const match = clean(text).match(/^(.*?)\s+-\s+(.*?)\s+-\s+cr[eé]ditos:\s*(\d+)$/i);
        if (!match) return { raw: clean(text) };
        const left = match[1];
        const middle = match[2];
        const credits = Number(match[3]);
        const [code, ...name] = middle.split(/\s+-\s+/);
        if (/^[A-Z][A-Z0-9]{1,9}$/.test(left) && /^[A-Z]{2,}[0-9]/.test(middle) && name.length > 0) {
          return { serviceCode: left, code, name: name.join(" - "), credits, raw: clean(text) };
        }
        return { serviceCode: null, code: left, name: middle, credits, raw: clean(text) };
      }

      function parseCompositionNode(li, path = []) {
        const content = li.querySelector(":scope > .ui-treenode-content");
        const label = clean(content?.querySelector(":scope > .ui-treenode-label")?.textContent);
        const nodeType = li.getAttribute("data-nodetype") ?? "unknown";
        const groupMatch = label.match(/^([A-Z0-9]+(?:\.[A-Z0-9]+)*)\s+-\s+(.*?)\s+-\s+min:\s*(\d+)\s+cr[eé]ditos$/i);
        const courseSpan = content?.querySelector('span[title*="Cr"]');
        const node = {
          sourceKey: li.getAttribute("data-rowkey"),
          nodeType,
          label,
          path,
          children: [],
        };
        if (groupMatch) Object.assign(node, { groupCode: groupMatch[1], name: groupMatch[2], minCredits: Number(groupMatch[3]) });
        if (courseSpan) node.course = parseCourseLabel(courseSpan.textContent);
        const children = li.querySelectorAll(":scope > ul.ui-treenode-children > li");
        node.children = [...children].map((child) => parseCompositionNode(child, [...path, label].filter(Boolean)));
        return node;
      }

      const compositionRoot = [...document.querySelectorAll('li[data-nodetype="Composicion"]')].map((li) => parseCompositionNode(li))[0] ?? null;
      const compositionUnavailableReason = [...document.querySelectorAll("body *")]
        .map((node) => clean(node.textContent))
        .find((text) => text === "No se puede mostrar la composición de este plan.") ?? null;
      const titleTree = [...document.querySelectorAll(".ui-tree")].find((tree) => clean(tree.textContent).includes("Títulos/Certificados"));
      const titleNodes = [...(titleTree?.querySelectorAll(".ui-treenode-leaf table") ?? [])].map((table) => clean(table.textContent)).filter(Boolean);
      const allCourses = [...document.querySelectorAll('li[data-nodetype="Materia"] span[title*="Cr"]')].map((span) => parseCourseLabel(span.textContent));
      const uniqueCourses = [...new Map(allCourses.map((course) => [`${course.serviceCode ?? "local"}:${course.code}`, course])).values()];
      const sourceUrl = location.href;
      return {
        heading,
        metadata: {
          type: basicCells[0] ?? null,
          current: /^s[ií]$/i.test(basicCells[1] ?? ""),
          duration: basicCells[2] ?? null,
          minCredits: Number.parseInt(basicCells[3] ?? "", 10) || null,
          colibriUrl: colibri,
        },
        composition: compositionRoot,
        compositionAvailability: {
          available: Boolean(compositionRoot),
          reason: compositionRoot ? null : compositionUnavailableReason ?? "La interfaz pública no publicó una composición.",
        },
        courses: uniqueCourses,
        titleLabels: titleNodes,
        sourceUrl,
      };
    });
  }

  async openPrerequisites() {
    await this.page.getByRole("button", { name: "Sistema de previaturas", exact: true }).click();
    await this.settle();
    if (await this.waitForPrerequisiteList()) return;

    await this.page.reload({ waitUntil: "domcontentloaded" });
    await this.settle(500);
    if (!await this.waitForPrerequisiteList(30_000)) {
      throw new Error(`Bedelías no mostró la lista de previaturas después de reintentar (${this.page.url()}).`);
    }
  }

  async waitForPrerequisiteList(timeout = 15_000) {
    try {
      await this.page.getByRole("textbox", { name: "Filtrar por Materia" }).waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  async listPrerequisiteTargets() {
    return this.page.evaluate(() => {
      const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
      const grid = [...document.querySelectorAll('[role="grid"]')].find((node) => clean(node.textContent).includes("Materia") && clean(node.textContent).includes("Tipo"));
      if (!grid) return [];
      return [...grid.querySelectorAll("tbody > tr")].map((row) => {
        const cells = [...row.querySelectorAll(":scope > td")];
        if (cells.length < 2) return null;
        const subject = clean(cells[0]?.textContent);
        const separator = subject.indexOf(" - ");
        return {
          rowIndex: row.getAttribute("data-ri"),
          code: separator >= 0 ? subject.slice(0, separator) : subject,
          name: separator >= 0 ? subject.slice(separator + 3) : "",
          assessment: clean(cells[1]?.textContent).toLowerCase() === "examen" ? "exam" : "course",
          hasDetails: Boolean(row.querySelector("a")),
        };
      }).filter(Boolean);
    });
  }

  async searchPrerequisiteTargets(query) {
    const input = this.page.getByRole("textbox", { name: "Filtrar por Materia" });
    await input.fill("");
    await input.type(query);
    await input.press("Enter");
    await this.settle(200);
    return this.listPrerequisiteTargets();
  }

  async filterPrerequisiteTargets(courseCode) {
    return (await this.searchPrerequisiteTargets(courseCode)).filter((item) => item.code.toUpperCase() === courseCode.toUpperCase());
  }

  async filterPrerequisiteTargetsByName(courseName) {
    const expected = normalizeLookup(courseName);
    return (await this.searchPrerequisiteTargets(courseName)).filter((item) => normalizeLookup(item.name) === expected);
  }

  async openPrerequisiteTarget(target) {
    const visibleTargets = await this.filterPrerequisiteTargets(target.code);
    const current = visibleTargets.find((candidate) => samePrerequisiteTarget(candidate, target));
    if (!current?.hasDetails) return { hasRule: false, navigated: false, reason: "detail-link-unavailable" };

    const clicked = await this.page.evaluate(({ rowIndex, targetValue }) => {
      const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
      const grid = [...document.querySelectorAll('[role="grid"]')]
        .find((node) => clean(node.textContent).includes("Materia") && clean(node.textContent).includes("Tipo"));
      const rows = [...(grid?.querySelectorAll("tbody > tr") ?? [])];
      const row = rows.find((candidate) => candidate.getAttribute("data-ri") === rowIndex)
        ?? rows.find((candidate) => {
          const cells = [...candidate.querySelectorAll(":scope > td")];
          const subject = clean(cells[0]?.textContent);
          const assessment = clean(cells[1]?.textContent).toLowerCase() === "examen" ? "exam" : "course";
          return subject === `${targetValue.code} - ${targetValue.name}` && assessment === targetValue.assessment;
        });
      const link = row?.querySelector("a");
      if (!link) return false;
      link.click();
      return true;
    }, { rowIndex: current.rowIndex, targetValue: target });
    if (!clicked) return { hasRule: false, navigated: false, reason: "detail-link-unavailable" };

    await this.settle();
    try {
      await this.page.locator("#arbol").waitFor({ state: "visible", timeout: 30_000 });
    } catch {
      throw new Error(`Bedelías abrió ${target.code} ${target.assessment}, pero no mostró el árbol de previaturas.`);
    }
    let expansions = 0;
    for (; expansions < 1000; expansions += 1) {
      const collapsed = this.page.locator("#arbol td.ui-treenode-collapsed > .ui-treenode-content > .ui-tree-toggler");
      if ((await collapsed.count()) === 0) break;
      await collapsed.first().click();
      await this.settle(100);
    }
    const remaining = await this.page.locator("#arbol td.ui-treenode-collapsed > .ui-treenode-content > .ui-tree-toggler").count();
    if (remaining > 0) throw new Error(`El árbol de previaturas conserva ${remaining} nodos colapsados después de ${expansions} expansiones.`);
    return { hasRule: true, navigated: true, reason: null };
  }

  async extractPrerequisiteRule(target) {
    return this.page.evaluate((targetValue) => {
      const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
      const splitLines = (value) => String(value ?? "").split(/\r?\n/).map(clean).filter(Boolean);

      function parseOption(line) {
        const match = line.match(/^(Curso|Examen) de la U\.C\.B:\s*(.+)$/i);
        if (!match) return null;
        const segments = match[2].split(/\s+-\s+/);
        const assessment = /^examen$/i.test(match[1]) ? "exam" : "course";
        if (segments.length >= 3 && /^[A-Z][A-Z0-9]{1,9}$/.test(segments[0])) {
          return { assessment, serviceCode: segments[0], code: segments[1], name: segments.slice(2).join(" - "), raw: line };
        }
        return { assessment, serviceCode: null, code: segments[0], name: segments.slice(1).join(" - "), raw: line };
      }

      function nodeFromCell(cell) {
        const labelElement = cell.querySelector(":scope > .ui-treenode-content > .ui-treenode-label");
        const lines = splitLines(labelElement?.textContent);
        const label = lines.join(" ");
        const type = cell.getAttribute("data-nodetype") ?? "default";
        let kind = type === "y" ? "all" : type === "o" ? "any" : type === "no" ? "none" : "requirement";
        const minimum = Number.parseInt(lines[0]?.match(/^(\d+)\s+aprobaci[oó]n/)?.[1] ?? "", 10) || null;
        const options = lines.map(parseOption).filter(Boolean);
        const childrenContainer = cell.nextElementSibling;
        const childTables = childrenContainer?.querySelectorAll(":scope > .ui-treenode-children > table") ?? [];
        const children = [...childTables].map((table) => {
          const child = table.querySelector(":scope > tbody > tr > td[data-nodetype]");
          return child ? nodeFromCell(child) : null;
        }).filter(Boolean);
        return { kind, sourceType: type, label, minimum, options, children };
      }

      const root = document.querySelector('#arbol td[data-rowkey="root"]') ?? document.querySelector("#arbol td[data-nodetype]");
      const heading = [...document.querySelectorAll("body *")].map((node) => clean(node.textContent)).find((text) => text.startsWith("Condiciones a cumplir para realizar")) ?? null;
      return {
        target: targetValue,
        expression: root ? nodeFromCell(root) : null,
        heading,
        sourceUrl: location.href,
        rawText: clean(document.querySelector("#arbol")?.textContent),
      };
    }, target);
  }

  async backToPrerequisiteList() {
    await this.page.goBack({ waitUntil: "domcontentloaded" });
    await sleep(this.delayMs);
    if (await this.waitForPrerequisiteList(5_000)) return;

    const back = this.page.getByRole("button", { name: "Volver", exact: true });
    if (await back.count()) {
      await back.click();
      await this.settle();
    }
    if (await this.waitForPrerequisiteList()) return;

    await this.page.reload({ waitUntil: "domcontentloaded" });
    await this.settle(500);
    if (!await this.waitForPrerequisiteList(30_000)) {
      throw new Error(`Bedelías no recuperó la lista de previaturas (${this.page.url()}).`);
    }
  }
}

function collectCompositionCourses(node, output = []) {
  if (!node) return output;
  if (node.course?.code) output.push({ ...node.course, curriculumPath: node.path });
  for (const child of node.children ?? []) collectCompositionCourses(child, output);
  return output;
}

export function parseRequirementOptions(label) {
  const prefixes = [
    "Curso aprobado de la U.C.B:",
    "Examen aprobado de la U.C.B:",
    "Curso de la U.C.B:",
    "Examen de la U.C.B:",
    "U.C.B Aprobada:",
    "U.C.B aprobada:",
    "Inscripción a Curso de la U.C.B:",
    "Inscripción a Examen de la U.C.B:",
    "Actividad Curso aprobada/reprobada en la U.C.B:",
    "Actividad Examen aprobada/reprobada en la U.C.B:",
  ];
  const escaped = prefixes.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const matcher = new RegExp(`(${escaped})\\s*(.*?)(?=(?:${escaped})|$)`, "gi");
  const options = [];
  for (const match of label.matchAll(matcher)) {
    const prefix = match[1];
    const subject = normalizeSpace(match[2]);
    if (!subject) continue;
    const segments = subject.split(/\s+-\s+/);
    let serviceCode = null;
    let code = segments[0];
    let name = segments.slice(1).join(" - ");
    if (segments.length >= 3 && /^[A-Z][A-Z0-9]{0,9}$/.test(segments[0])) {
      serviceCode = segments[0];
      code = segments[1];
      name = segments.slice(2).join(" - ");
    }
    const lower = prefix.toLowerCase();
    const assessment = lower.includes("actividad curso aprobada/reprobada") ? "course-activity"
      : lower.includes("actividad examen aprobada/reprobada") ? "exam-activity"
      : lower.includes("inscripción a curso") ? "course-enrollment"
      : lower.includes("inscripción a examen") ? "exam-enrollment"
        : lower.startsWith("curso") ? "course"
          : "exam";
    options.push({ assessment, serviceCode, code, name, raw: `${prefix} ${subject}` });
  }
  return options;
}

export function normalizeCourseRecord(course) {
  if (course?.code && course?.name) return course;
  const match = normalizeSpace(course?.raw).match(/^(.*?)\s+-\s+(.*?)\s+-\s+cr[eé]ditos:\s*(\d+)$/i);
  if (!match) return course;
  return {
    ...course,
    serviceCode: null,
    code: match[1],
    name: match[2],
    credits: Number(match[3]),
  };
}

function parseCreditOptions(label) {
  const match = label.match(/^(\d+)\s+cr[eé]ditos entre:\s*(.+)$/i);
  if (!match) return null;
  const options = [];
  const matcher = /(?:^|\s)([A-Z0-9][A-Z0-9.]{1,9})\s+-\s+(.+?)(?=\s+[A-Z0-9][A-Z0-9.]{1,9}\s+-\s+|$)/g;
  for (const option of match[2].matchAll(matcher)) {
    options.push({ serviceCode: null, code: option[1], name: normalizeSpace(option[2]), raw: option[0].trim() });
  }
  return options.length ? { minimum: Number(match[1]), options } : null;
}

export function normalizeExpressionNode(node) {
  if (!node) return null;
  const label = normalizeSpace(node.label);
  const options = parseRequirementOptions(label);
  const children = (node.children ?? []).map(normalizeExpressionNode);
  const approvalMinimum = Number.parseInt(label.match(/^(\d+)\s+aprobaci[oó]n/i)?.[1] ?? "", 10) || null;
  const creditMatch = label.match(/^(\d+)\s+cr[eé]ditos en el Plan:\s*(\d{4})\s+-\s+(.+)$/i);
  const groupCreditMatch = label.match(/^(\d+)\s+cr[eé]ditos en el Grupo:\s*([A-Z0-9.-]+)\s+-\s+(.+)$/i);
  const groupApprovalMatch = label.match(/^(\d+)\s+aprobaci[oó]n(?:\/es)? en el Grupo:\s*([A-Z0-9.-]+)\s+-\s+(.+)$/i);
  const profileCreditMatch = label.match(/^(\d+)\s+cr[eé]ditos en el Perfil:\s*(.+)$/i);
  const profileEnrollmentMatch = label.match(/^Inscripci[oó]n a perfil:\s*(.+)$/i);
  const creditOptionsRequirement = parseCreditOptions(label);
  return {
    ...node,
    label,
    minimum: approvalMinimum ?? (options.length ? 1 : node.minimum),
    options,
    creditRequirement: creditMatch ? { minimum: Number(creditMatch[1]), planYear: creditMatch[2], planName: creditMatch[3] } : null,
    groupCreditRequirement: groupCreditMatch ? { minimum: Number(groupCreditMatch[1]), groupCode: groupCreditMatch[2], groupName: groupCreditMatch[3] } : null,
    groupApprovalRequirement: groupApprovalMatch ? { minimum: Number(groupApprovalMatch[1]), groupCode: groupApprovalMatch[2], groupName: groupApprovalMatch[3] } : null,
    profileCreditRequirement: profileCreditMatch ? { minimum: Number(profileCreditMatch[1]), profileName: profileCreditMatch[2] } : null,
    profileEnrollmentRequirement: profileEnrollmentMatch ? { profileName: profileEnrollmentMatch[1] } : null,
    creditOptionsRequirement,
    parserStatus: ["all", "any", "none"].includes(node.kind) && options.length === 0 && children.length === 0
      ? "incomplete"
      : options.length
      || approvalMinimum
      || creditMatch
      || groupCreditMatch
      || groupApprovalMatch
      || profileCreditMatch
      || profileEnrollmentMatch
      || creditOptionsRequirement
      || ["all", "any", "none"].includes(node.kind)
      ? "parsed"
      : "raw",
    children,
  };
}

function normalizePrerequisiteRule(rule) {
  return rule.expression ? { ...rule, expression: normalizeExpressionNode(rule.expression) } : rule;
}

function collectRawNodes(node, output = []) {
  if (!node) return output;
  if (node.parserStatus === "raw" && node.kind === "requirement") output.push(node.label);
  for (const child of node.children ?? []) collectRawNodes(child, output);
  return output;
}

function dedupeCompositionCourses(courses, defaultServiceCode) {
  const unique = new Map();
  for (const course of courses) {
    const key = `${course.serviceCode ?? defaultServiceCode}:${course.code}`;
    const pathValue = course.curriculumPath ?? [];
    if (!unique.has(key)) {
      unique.set(key, { ...course, curriculumPaths: [pathValue] });
      delete unique.get(key).curriculumPath;
      continue;
    }
    const existing = unique.get(key);
    const pathKey = JSON.stringify(pathValue);
    if (!existing.curriculumPaths.some((item) => JSON.stringify(item) === pathKey)) existing.curriculumPaths.push(pathValue);
  }
  return [...unique.values()];
}

function validateDataset(dataset) {
  const issues = [];
  if (dataset.plan.compositionAvailability?.available === false) {
    issues.push({
      level: "warning",
      code: "composition-unavailable",
      message: dataset.plan.compositionAvailability.reason,
    });
  }
  const seen = new Set();
  for (const course of dataset.plan.courses) {
    const key = `${course.serviceCode ?? dataset.service.code}:${course.code}`;
    if (seen.has(key)) issues.push({ level: "warning", code: "duplicate-course", message: `Curso duplicado: ${key}` });
    seen.add(key);
    if (!course.code || !course.name) issues.push({ level: "error", code: "invalid-course-identity", message: `Identidad de curso inválida: ${course.raw ?? key}` });
    if (!Number.isFinite(course.credits)) issues.push({ level: "error", code: "invalid-credits", message: `Créditos inválidos: ${key}` });
  }
  for (const rule of dataset.prerequisites) {
    if (rule.noPublishedRule) continue;
    if (!rule.expression) issues.push({ level: "error", code: "missing-expression", message: `Regla sin expresión: ${rule.target.code} ${rule.target.assessment}` });
    if (!rule.rawText) issues.push({ level: "warning", code: "empty-rule", message: `Regla vacía: ${rule.target.code} ${rule.target.assessment}` });
    for (const node of incompleteLogicalNodes(rule.expression)) {
      issues.push({ level: "error", code: "incomplete-expression", message: `${rule.target.code} ${rule.target.assessment}: ${node.path} (${node.kind}) no tiene opciones ni descendientes` });
    }
    for (const label of collectRawNodes(rule.expression)) {
      issues.push({ level: "warning", code: "unparsed-requirement", message: `${rule.target.code} ${rule.target.assessment}: ${label}` });
    }
  }
  return issues;
}

async function scrapeCatalog(client, options) {
  await client.openAcademicOffer();
  const services = await client.listServices();
  const result = {
    schemaVersion: 1,
    source: { system: "SGAE Bedelías", baseUrl: BASE_URL, extractedAt: new Date().toISOString() },
    services,
    note: "Inventario institucional. Las carreras y planes se extraen por servicio en el modo plan para reducir solicitudes.",
  };
  const output = path.resolve(options.output ?? "data/bedelias/catalog.json");
  await atomicJson(output, result);
  return { output, summary: `${services.length} servicios`, requests: client.requestCount };
}

async function scrapePlan(client, options) {
  const serviceCode = String(options.service ?? "FING").toUpperCase();
  const programName = String(options.career ?? "INGENIERÍA EN COMPUTACIÓN");
  const year = String(options.year ?? "1997");
  const requestedCodes = String(options.courses ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const requestedNames = String(options["course-names"] ?? "").split("|").map((value) => value.trim()).filter(Boolean);
  const resume = options.resume !== "false";

  await client.openAcademicOffer();
  const service = await client.selectService(serviceCode);
  const program = await client.findProgram(programName);
  const plans = await client.expandProgram(program);
  const planSummary = plans.find((item) => item.year === year);
  if (!planSummary) throw new Error(`No se encontró el plan ${year}. Disponibles: ${plans.map((item) => item.year).join(", ")}`);
  await client.openPlan(year);
  const plan = await client.extractPlan();
  plan.courses = dedupeCompositionCourses(collectCompositionCourses(plan.composition), serviceCode);
  const output = path.resolve(options.output ?? `data/bedelias/${slug(serviceCode)}-${slug(program.name)}-${year}.json`);
  const checkpointPath = `${output}.checkpoint`;
  const storedCheckpoint = resume ? await loadJson(checkpointPath, { prerequisites: {} }) : { prerequisites: {} };
  const previousSnapshot = resume ? await loadJson(output, null) : null;
  const { checkpoint, restoredRules } = mergePrerequisiteCheckpoint(storedCheckpoint, previousSnapshot, {
    serviceCode,
    programName: program.name,
    year,
  });
  const cleanedCheckpoint = removeIncompletePrerequisiteRules(checkpoint.prerequisites);
  checkpoint.prerequisites = cleanedCheckpoint.prerequisites;
  if (cleanedCheckpoint.removedKeys.length > 0) {
    checkpoint.updatedAt = new Date().toISOString();
    await atomicJson(checkpointPath, checkpoint);
    console.log(`Reglas incompletas descartadas del checkpoint para reconsulta: ${cleanedCheckpoint.removedKeys.length}.`);
  }
  if (restoredRules > 0) {
    await atomicJson(checkpointPath, checkpoint);
    console.log(`Checkpoint reconstruido: ${Object.keys(checkpoint.prerequisites).length} entradas (${restoredRules} recuperadas del último snapshot).`);
  }
  const { courseCodes, requests } = buildPrerequisiteRequests({
    requestedCodes,
    requestedNames,
    planCourses: plan.courses,
    serviceCode,
  });
  if (requests.length > 0) await client.openPrerequisites();
  for (let index = 0; index < requests.length; index += 1) {
    const request = requests[index];
    const targets = request.kind === "code"
      ? await client.filterPrerequisiteTargets(request.value)
      : await client.filterPrerequisiteTargetsByName(request.value);
    if (!targets.length) {
      checkpoint.prerequisites[`query:${request.kind}:${request.value}:none`] = { target: { code: request.kind === "code" ? request.value : null, name: request.kind === "name" ? request.value : null }, query: request, noPublishedRule: true };
      await atomicJson(checkpointPath, checkpoint);
      continue;
    }
    delete checkpoint.prerequisites[`query:${request.kind}:${request.value}:none`];
    if (request.kind === "code") delete checkpoint.prerequisites[`${request.value}:none`];
    for (const target of targets) {
      const key = `${target.code}:${target.assessment}`;
      if (checkpoint.prerequisites[key]) continue;
      const detail = await client.openPrerequisiteTarget(target);
      if (!detail.hasRule) {
        checkpoint.prerequisites[key] = {
          target,
          query: request,
          noPublishedRule: true,
          reason: detail.reason,
        };
        checkpoint.updatedAt = new Date().toISOString();
        await atomicJson(checkpointPath, checkpoint);
        if (detail.navigated) await client.backToPrerequisiteList();
        continue;
      }
      checkpoint.prerequisites[key] = await client.extractPrerequisiteRule(target);
      checkpoint.updatedAt = new Date().toISOString();
      await atomicJson(checkpointPath, checkpoint);
      await client.backToPrerequisiteList();
    }
    process.stdout.write(`\rPrevias ${index + 1}/${requests.length} · ${request.value}   `);
  }
  process.stdout.write("\n");

  const prerequisites = Object.values(checkpoint.prerequisites).map(normalizePrerequisiteRule);
  const dataset = {
    schemaVersion: 1,
    source: {
      system: "SGAE Bedelías",
      baseUrl: BASE_URL,
      extractedAt: new Date().toISOString(),
      method: "public-ui-browser",
      rateLimitMs: client.delayMs,
      sourceUrls: [plan.sourceUrl, ...prerequisites.map((rule) => rule.sourceUrl).filter(Boolean)],
    },
    service: { code: service.serviceCode, name: service.serviceName, area: service.area },
    program: { name: program.name, type: program.type },
    plan: { ...plan, year, current: planSummary.current },
    prerequisites,
    extraction: { requestedCourseCodes: courseCodes, requestedCourseNames: [...new Set(requestedNames)], completedRules: prerequisites.filter((rule) => rule.expression).length, requestCount: client.requestCount, requestTypes: client.requestTypes },
  };
  dataset.validation = { issues: validateDataset(dataset) };
  dataset.contentHash = stableHash({ service: dataset.service, program: dataset.program, plan: dataset.plan, prerequisites: dataset.prerequisites });
  await atomicJson(output, dataset);
  return { output, summary: `${dataset.plan.courses.length} cursos en composición; ${dataset.extraction.completedRules} reglas`, requests: client.requestCount, issues: dataset.validation.issues.length };
}

async function normalizeDataset(options) {
  const filePath = path.resolve(options.input ?? options.output ?? "data/bedelias/fing-ingenieria-computacion-1997.json");
  const dataset = await loadJson(filePath, null);
  if (!dataset) throw new Error(`No se pudo leer ${filePath}.`);
  dataset.plan.compositionAvailability ??= {
    available: Boolean(dataset.plan.composition),
    reason: dataset.plan.composition ? null : "La interfaz pública no publicó una composición.",
  };
  dataset.plan.courses = (dataset.plan.courses ?? []).map(normalizeCourseRecord);
  dataset.prerequisites = (dataset.prerequisites ?? []).map(normalizePrerequisiteRule);
  dataset.validation = { issues: validateDataset(dataset) };
  dataset.contentHash = stableHash({ service: dataset.service, program: dataset.program, plan: dataset.plan, prerequisites: dataset.prerequisites });
  await atomicJson(path.resolve(options.output ?? filePath), dataset);
  return { output: path.resolve(options.output ?? filePath), summary: `${dataset.prerequisites.length} reglas normalizadas`, requests: 0, issues: dataset.validation.issues.length };
}

function printHelp() {
  console.log(`Importador público de Bedelías

Uso:
  npm run bedelias:catalog -- [--output archivo]
  npm run bedelias:plan -- --service FING --career "INGENIERÍA EN COMPUTACIÓN" --year 1997 [--courses 1466,1321]
  node scripts/scrape-bedelias.mjs normalize --input data/bedelias/archivo.json

Opciones:
  --delay 900        Pausa mínima entre interacciones (mínimo 500 ms)
  --courses A,B      Limita la extracción de previas a códigos concretos
  --course-names A|B Busca materias por nombre exacto, separadas por |, para planes todavía incompletos
  --output archivo   Ruta JSON de salida
  --resume false     Ignora el checkpoint anterior
  --browser ruta     Ejecutable de Chrome/Edge
  --headed           Muestra el navegador durante la extracción
`);
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!['catalog', 'plan', 'normalize'].includes(command)) { printHelp(); return; }
  if (command === "normalize") {
    const result = await normalizeDataset(options);
    console.log(`Guardado: ${result.output}`);
    console.log(`Resultado: ${result.summary}. Incidencias: ${result.issues}.`);
    return;
  }
  const client = await new BedeliasBrowser(options).open();
  try {
    const result = command === "catalog" ? await scrapeCatalog(client, options) : await scrapePlan(client, options);
    console.log(`Guardado: ${result.output}`);
    console.log(`Resultado: ${result.summary}. Solicitudes al dominio: ${result.requests}.${result.issues !== undefined ? ` Incidencias: ${result.issues}.` : ""}`);
  } finally {
    await client.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
