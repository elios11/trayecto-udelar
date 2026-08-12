#!/usr/bin/env node

import { stat } from "node:fs/promises";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectServicePlans, slug } from "./bedelias-service-batch.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const [key, inlineValue] = item.slice(2).split("=", 2);
    const next = argv[index + 1];
    if (inlineValue !== undefined) options[key] = inlineValue;
    else if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
    } else options[key] = true;
  }
  return options;
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function atomicJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

export function buildServiceReport(index, planEntries, now = new Date().toISOString()) {
  const plans = planEntries.map(({ target, snapshot, bytes }) => {
    const validationIssues = snapshot.validation?.issues ?? [];
    const prerequisites = snapshot.prerequisites ?? [];
    return {
      key: `${target.serviceCode}:${slug(target.programName)}:${target.year}`,
      career: target.programName,
      type: target.programType,
      planYear: target.year,
      current: target.current,
      state: validationIssues.length === 0 ? "structurally-valid" : "extracted",
      coverage: {
        courses: snapshot.plan?.courses?.length ?? 0,
        prerequisiteEntries: prerequisites.length,
        publishedRules: prerequisites.filter((rule) => rule.expression).length,
        noPublishedRuleQueries: prerequisites.filter((rule) => rule.noPublishedRule).length,
        validationIssues: validationIssues.length,
        requests: snapshot.extraction?.requestCount ?? null,
        bytes,
      },
      source: {
        system: snapshot.source?.system ?? null,
        extractedAt: snapshot.source?.extractedAt ?? null,
        rateLimitMs: snapshot.source?.rateLimitMs ?? null,
        contentHash: snapshot.contentHash ?? null,
      },
      officialSources: "pending",
      site: "not-published-by-service-index",
      anomalies: validationIssues.map((issue) => ({ level: issue.level, code: issue.code })),
    };
  });

  const sum = (field) => plans.reduce((total, plan) => total + (plan.coverage[field] ?? 0), 0);
  return {
    schemaVersion: 1,
    generatedAt: now,
    service: index.service,
    scope: { currentOnly: true, types: "GRADO|TECNICATURA|CIO" },
    status: plans.every((plan) => plan.state === "structurally-valid") ? "official-sources-pending" : "extracted",
    totals: {
      plans: plans.length,
      courses: sum("courses"),
      prerequisiteEntries: sum("prerequisiteEntries"),
      publishedRules: sum("publishedRules"),
      noPublishedRuleQueries: sum("noPublishedRuleQueries"),
      validationIssues: sum("validationIssues"),
      requests: sum("requests"),
      bytes: sum("bytes"),
    },
    plans,
    nextStep: "Contrastar vigencia, sedes, títulos, áreas y trayectorias con fuentes oficiales de FADU antes de auditar o publicar.",
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const serviceCode = String(options.service ?? "").toUpperCase();
  if (!serviceCode) throw new Error("Falta --service.");
  const indexPath = path.resolve(PROJECT_ROOT, options.index ?? `data/bedelias/services/${slug(serviceCode)}-index.json`);
  const outputPath = path.resolve(PROJECT_ROOT, options.output ?? `data/bedelias/reports/${slug(serviceCode)}-pilot.json`);
  const index = await loadJson(indexPath);
  const targets = selectServicePlans(index, { currentOnly: true, types: options.types ?? "GRADO|TECNICATURA|CIO" });
  const planEntries = [];
  for (const target of targets) {
    const snapshotPath = path.join(PROJECT_ROOT, "data", "bedelias", `${slug(serviceCode)}-${slug(target.programName)}-${target.year}.json`);
    const snapshot = await loadJson(snapshotPath);
    planEntries.push({ target, snapshot, bytes: (await stat(snapshotPath)).size });
  }
  const report = buildServiceReport(index, planEntries);
  await atomicJson(outputPath, report);
  console.log(`Reporte ${serviceCode}: ${report.totals.plans} planes; ${report.totals.validationIssues} incidencias; estado ${report.status}.`);
  console.log(`Guardado: ${outputPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
