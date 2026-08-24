#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renameWithRetry } from "./bedelias-atomic-write.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PRIORITY_ORDER = [
  "audited-curriculum-normalization-pending",
  "official-curriculum-sources-pending",
];

const ACTIONS = {
  "audited-curriculum-normalization-pending": "Completar la malla oficial: la identidad ya fue auditada, pero la proyección de UI todavía no contiene unidades curriculares.",
  "official-curriculum-sources-pending": "Auditar vigencia e identidad y localizar la composición curricular oficial antes de habilitar una malla utilizable.",
};

const hash = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

const countBy = (items, keyForItem) => items.reduce((counts, item) => {
  const key = keyForItem(item);
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {});

export function buildUiCurriculumQueue({
  uiReport,
  auditRegistry,
  globalManifest,
  generatedAt = new Date().toISOString(),
}) {
  const audits = new Map(auditRegistry.audits.map((audit) => [audit.identity, audit]));
  const queue = uiReport.plans
    .filter((plan) => !plan.compositionAvailable)
    .map((plan) => {
      const audit = audits.get(plan.identity);
      const priority = audit?.status === "official-evidence-complete"
        ? "audited-curriculum-normalization-pending"
        : "official-curriculum-sources-pending";
      return {
        identity: plan.identity,
        planId: plan.planId,
        facultyCode: plan.facultyCode,
        snapshotPath: plan.snapshotPath,
        auditStatus: plan.auditStatus,
        priority,
        action: ACTIONS[priority],
        ...(audit ? {
          officialAudit: {
            reviewedAt: audit.reviewedAt,
            scope: audit.scope,
            canonicalModel: audit.conclusion?.canonicalModel ?? null,
          },
        } : {}),
      };
    })
    .sort((left, right) => PRIORITY_ORDER.indexOf(left.priority) - PRIORITY_ORDER.indexOf(right.priority)
      || left.facultyCode.localeCompare(right.facultyCode, "es")
      || left.identity.localeCompare(right.identity, "es"));

  const stableContent = {
    source: {
      uiExtractedPlansHash: uiReport.contentHash,
      officialAuditRegistryHash: auditRegistry.contentHash,
      globalManifestHash: globalManifest.contentHash,
    },
    counts: {
      currentUiPlans: uiReport.counts.generatedPlans,
      curriculumReady: uiReport.counts.compositionAvailable,
      curriculumPending: queue.length,
      byPriority: countBy(queue, (entry) => entry.priority),
      byFaculty: countBy(queue, (entry) => entry.facultyCode),
    },
    queue,
  };

  return {
    schemaVersion: 1,
    generatedAt,
    ...stableContent,
    contentHash: hash(stableContent),
  };
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.resolve(PROJECT_ROOT, relativePath), "utf8"));
}

async function writeJson(relativePath, value) {
  const output = path.resolve(PROJECT_ROOT, relativePath);
  const temporary = `${output}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await renameWithRetry(temporary, output);
  return output;
}

async function main() {
  const queue = buildUiCurriculumQueue({
    uiReport: await readJson("data/bedelias/inventory/ui-extracted-plans.json"),
    auditRegistry: await readJson("data/bedelias/audits/official-source-audits.json"),
    globalManifest: await readJson("data/bedelias/inventory/global-current.json"),
  });
  const output = await writeJson("data/bedelias/inventory/ui-curriculum-queue.json", queue);
  console.log(`Planes de UI con malla: ${queue.counts.curriculumReady}.`);
  console.log(`Planes de UI pendientes de composición: ${queue.counts.curriculumPending}.`);
  console.log(`Salida: ${output}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack ?? error);
    process.exitCode = 1;
  });
}
