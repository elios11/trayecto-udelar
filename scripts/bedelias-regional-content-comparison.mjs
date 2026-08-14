#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renameWithRetry } from "./bedelias-atomic-write.mjs";
import { normalizeLookup, slug } from "./bedelias-service-batch.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function hash(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function normalizeValue(value) {
  if (typeof value === "string") return normalizeLookup(value);
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !["sourceUrl", "raw", "extractedAt"].includes(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, normalizeValue(nested)]));
  }
  return value;
}

function compareStable(left, right) {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

export function curriculumFingerprint(snapshot) {
  const courses = (snapshot.plan?.courses ?? []).map((course) => normalizeValue({
    code: course.code,
    name: course.name,
    credits: course.credits,
    curriculumPaths: course.curriculumPaths,
  })).sort(compareStable);
  const prerequisites = (snapshot.prerequisites ?? []).map((rule) => normalizeValue({
    target: rule.target,
    noPublishedRule: rule.noPublishedRule ?? false,
    expression: rule.expression ?? null,
  })).sort(compareStable);
  const content = normalizeValue({
    metadata: {
      type: snapshot.plan?.metadata?.type ?? null,
      duration: snapshot.plan?.metadata?.duration ?? null,
      minCredits: snapshot.plan?.metadata?.minCredits ?? null,
    },
    compositionAvailable: snapshot.plan?.compositionAvailability?.available ?? true,
    titleLabels: [...(snapshot.plan?.titleLabels ?? [])].sort(),
    courses,
    prerequisites,
  });
  return {
    hash: hash(content),
    counts: {
      courses: courses.length,
      prerequisites: prerequisites.length,
      publishedRules: prerequisites.filter((rule) => rule.expression).length,
    },
  };
}

function snapshotRelativePath(offering, careerName, planYear) {
  return `data/bedelias/${slug(offering.serviceCode)}-${slug(careerName)}-${planYear}.json`;
}

async function inspectOffering(offering, careerName, planYear) {
  const relativePath = snapshotRelativePath(offering, careerName, planYear);
  const absolutePath = path.join(PROJECT_ROOT, relativePath);
  if (!existsSync(absolutePath)) return { ...offering, snapshot: relativePath, available: false, fingerprint: null };
  const snapshot = JSON.parse(await readFile(absolutePath, "utf8"));
  return {
    ...offering,
    snapshot: relativePath,
    available: true,
    fingerprint: curriculumFingerprint(snapshot),
  };
}

export async function buildRegionalContentComparison(regionalManifest, options = {}) {
  const candidates = regionalManifest.canonicalPlans
    .filter((plan) => plan.classification === "central-match-candidate");
  const plans = [];

  for (const plan of candidates) {
    const canonical = await inspectOffering(plan.canonicalSource, plan.career.name, plan.plan.year);
    const regionalOfferings = [];
    for (const offering of plan.offerings) {
      regionalOfferings.push(await inspectOffering(offering, plan.career.name, plan.plan.year));
    }
    const comparisons = regionalOfferings.map((regional) => {
      if (!canonical.available || !regional.available) {
        return {
          serviceCode: regional.serviceCode,
          status: "not-comparable",
          reason: !canonical.available ? "missing-canonical-snapshot" : "missing-regional-snapshot",
        };
      }
      return {
        serviceCode: regional.serviceCode,
        status: canonical.fingerprint.hash === regional.fingerprint.hash
          ? "content-match-candidate"
          : "content-difference-detected",
        reason: "curriculum-fingerprint",
      };
    });
    const comparable = comparisons.filter((comparison) => comparison.status !== "not-comparable");
    plans.push({
      identity: plan.identity,
      career: plan.career,
      plan: plan.plan,
      canonical,
      regionalOfferings,
      comparisons,
      conclusion: comparable.length === 0
        ? "pending-snapshots"
        : comparable.every((comparison) => comparison.status === "content-match-candidate")
          ? "content-match-candidate"
          : "content-difference-detected",
    });
  }

  const comparisons = plans.flatMap((plan) => plan.comparisons);
  const stableContent = { sourceManifestHash: regionalManifest.contentHash, plans };
  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    source: {
      regionalManifestHash: regionalManifest.contentHash,
      method: "local-curriculum-fingerprint",
    },
    policy: {
      contentMatchIsNotOfficialEquivalence: true,
      missingSnapshotsRemainPending: true,
      siteVariantRequiresDetectedAndAuditedDifference: true,
    },
    counts: {
      candidateIdentities: plans.length,
      regionalOffers: comparisons.length,
      comparablePairs: comparisons.filter((comparison) => comparison.status !== "not-comparable").length,
      contentMatchCandidates: comparisons.filter((comparison) => comparison.status === "content-match-candidate").length,
      contentDifferences: comparisons.filter((comparison) => comparison.status === "content-difference-detected").length,
      missingCanonicalSnapshots: plans.reduce((count, plan) =>
        count + (plan.canonical.available ? 0 : plan.regionalOfferings.length), 0),
      missingRegionalSnapshots: plans.reduce((count, plan) =>
        count + plan.regionalOfferings.filter((offering) => !offering.available).length, 0),
      pendingIdentities: plans.filter((plan) => plan.conclusion === "pending-snapshots").length,
    },
    plans,
    contentHash: hash(stableContent),
  };
}

async function atomicJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await renameWithRetry(temporaryPath, filePath);
}

async function main() {
  const manifestPath = path.join(PROJECT_ROOT, "data", "bedelias", "inventory", "regional-offerings.json");
  const outputPath = path.join(PROJECT_ROOT, "data", "bedelias", "inventory", "regional-content-comparison.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const comparison = await buildRegionalContentComparison(manifest);
  await atomicJson(outputPath, comparison);
  console.log(`Identidades candidatas: ${comparison.counts.candidateIdentities}.`);
  console.log(`Pares comparables: ${comparison.counts.comparablePairs}/${comparison.counts.regionalOffers}.`);
  console.log(`Pendientes: ${comparison.counts.pendingIdentities}.`);
  console.log(`Salida: ${outputPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
