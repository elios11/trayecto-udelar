#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renameWithRetry } from "./bedelias-atomic-write.mjs";
import { normalizeLookup } from "./bedelias-service-batch.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRIORITY_ORDER = [
  "regional-content-difference",
  "insufficient-regional-content",
  "composition-unavailable",
  "official-sources-pending",
];
const STATE_ORDER = ["discovered", "extracted", "structurally-valid", "official-sources-pending", "audited"];

const actionForPriority = {
  "regional-content-difference": "Contrastar plan y resoluciones oficiales; separar núcleo curricular de oferta ampliada por sede.",
  "insufficient-regional-content": "Localizar composición oficial y documentar si la oferta comparte el plan canónico.",
  "composition-unavailable": "Completar materias, mínimos y títulos desde fuentes oficiales del servicio.",
  "official-sources-pending": "Auditar vigencia, sede, títulos, créditos, mínimos y trayectorias oficiales.",
};

const countBy = (items, keyForItem) => items.reduce((counts, item) => {
  const key = keyForItem(item);
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {});

const hash = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

function identityForPlan(plan) {
  return `${normalizeLookup(plan.career.name)}:${plan.plan.year}`;
}

export function buildAuditQueue({ globalManifest, regionalManifest, comparisonManifest, generatedAt = new Date().toISOString() }) {
  const centralPlans = globalManifest.services
    .filter((service) => service.area !== "CENTROS REGIONALES")
    .flatMap((service) => service.plans.map((plan) => ({
      identity: identityForPlan(plan),
      career: plan.career,
      plan: plan.plan,
      canonicalSource: {
        serviceCode: service.code,
        serviceName: service.name,
        planKey: plan.key,
        state: plan.state,
      },
    })));
  const regionalOnlyPlans = regionalManifest.canonicalPlans
    .filter((plan) => plan.classification === "regional-only")
    .map((plan) => ({
      identity: plan.identity,
      career: plan.career,
      plan: plan.plan,
      canonicalSource: plan.canonicalSource,
    }));
  const canonicalPlansByIdentity = new Map();
  for (const plan of [...centralPlans, ...regionalOnlyPlans]) {
    const existing = canonicalPlansByIdentity.get(plan.identity);
    if (!existing) {
      canonicalPlansByIdentity.set(plan.identity, { ...plan, sourceOffers: [plan.canonicalSource] });
      continue;
    }
    const preferredSource = STATE_ORDER.indexOf(plan.canonicalSource.state) > STATE_ORDER.indexOf(existing.canonicalSource.state)
      ? plan.canonicalSource
      : existing.canonicalSource;
    canonicalPlansByIdentity.set(plan.identity, {
      ...existing,
      canonicalSource: preferredSource,
      sourceOffers: [...existing.sourceOffers, plan.canonicalSource],
    });
  }
  const canonicalPlans = [...canonicalPlansByIdentity.values()];
  const comparisonsByIdentity = new Map(comparisonManifest.plans.map((plan) => [plan.identity, plan.comparisons]));

  const queue = canonicalPlans
    .filter((plan) => plan.canonicalSource.state !== "audited")
    .map((plan) => {
      const comparisons = comparisonsByIdentity.get(plan.identity) ?? [];
      const priority = comparisons.some((entry) => entry.status === "content-difference-detected")
        ? "regional-content-difference"
        : comparisons.some((entry) => entry.status === "insufficient-content")
          ? "insufficient-regional-content"
          : plan.canonicalSource.state === "extracted"
            ? "composition-unavailable"
            : "official-sources-pending";
      return {
        ...plan,
        priority,
        action: actionForPriority[priority],
        regionalComparisons: comparisons,
      };
    })
    .sort((left, right) => PRIORITY_ORDER.indexOf(left.priority) - PRIORITY_ORDER.indexOf(right.priority)
      || left.canonicalSource.serviceCode.localeCompare(right.canonicalSource.serviceCode, "es")
      || left.career.name.localeCompare(right.career.name, "es")
      || String(left.plan.year).localeCompare(String(right.plan.year), "es"));

  const regionalComparisons = comparisonManifest.plans.flatMap((plan) => plan.comparisons.map((comparison) => ({
    identity: plan.identity,
    career: plan.career.name,
    planYear: plan.plan.year,
    ...comparison,
  })));
  const stableContent = {
    source: {
      globalManifestHash: globalManifest.contentHash,
      regionalManifestHash: regionalManifest.contentHash,
      comparisonManifestHash: comparisonManifest.contentHash,
    },
    counts: {
      canonicalIdentities: canonicalPlans.length,
      auditedCanonicalIdentities: canonicalPlans.filter((plan) => plan.canonicalSource.state === "audited").length,
      pendingCanonicalIdentities: queue.length,
      byPriority: countBy(queue, (entry) => entry.priority),
      regionalComparisons: countBy(regionalComparisons, (entry) => entry.status),
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
  const { writeFile, mkdir } = await import("node:fs/promises");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await renameWithRetry(temporary, output);
  return output;
}

async function main() {
  const queue = buildAuditQueue({
    globalManifest: await readJson("data/bedelias/inventory/global-current.json"),
    regionalManifest: await readJson("data/bedelias/inventory/regional-offerings.json"),
    comparisonManifest: await readJson("data/bedelias/inventory/regional-content-comparison.json"),
  });
  const output = await writeJson("data/bedelias/inventory/audit-queue.json", queue);
  console.log(`Identidades canónicas: ${queue.counts.canonicalIdentities}.`);
  console.log(`Pendientes de auditoría: ${queue.counts.pendingCanonicalIdentities}.`);
  console.log(`Salida: ${output}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack ?? error);
    process.exitCode = 1;
  });
}
