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
  const metadata = normalizeValue({
    type: snapshot.plan?.metadata?.type ?? null,
    duration: snapshot.plan?.metadata?.duration ?? null,
    minCredits: snapshot.plan?.metadata?.minCredits ?? null,
  });
  const courseCatalog = (snapshot.plan?.courses ?? []).map((course) => normalizeValue({
    code: course.code,
    name: course.name,
    credits: course.credits,
  })).sort(compareStable);
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
  const curriculumContent = normalizeValue({
    metadata,
    compositionAvailable: snapshot.plan?.compositionAvailability?.available ?? true,
    titleLabels: [...(snapshot.plan?.titleLabels ?? [])].sort(),
    courses,
  });
  return {
    hash: hash({ curriculumContent, prerequisites }),
    curriculumHash: hash(curriculumContent),
    prerequisiteHash: hash(prerequisites),
    metadata,
    courseCatalog,
    counts: {
      courses: courses.length,
      prerequisites: prerequisites.length,
      publishedRules: prerequisites.filter((rule) => rule.expression).length,
    },
  };
}

function summarizeDifference(canonical, regional) {
  const keyForCourse = (course) => course.code || course.name;
  const canonicalByKey = new Map(canonical.courseCatalog.map((course) => [keyForCourse(course), course]));
  const regionalByKey = new Map(regional.courseCatalog.map((course) => [keyForCourse(course), course]));
  const onlyCanonical = [...canonicalByKey.entries()]
    .filter(([key]) => !regionalByKey.has(key))
    .map(([, course]) => course);
  const onlyRegional = [...regionalByKey.entries()]
    .filter(([key]) => !canonicalByKey.has(key))
    .map(([, course]) => course);
  const changedCredits = [...canonicalByKey.entries()]
    .filter(([key, course]) => regionalByKey.has(key) && regionalByKey.get(key).credits !== course.credits)
    .map(([key, course]) => ({
      key,
      canonical: course.credits,
      regional: regionalByKey.get(key).credits,
    }));
  return {
    metadataChanged: JSON.stringify(canonical.metadata) !== JSON.stringify(regional.metadata),
    onlyCanonical,
    onlyRegional,
    changedCredits,
    prerequisiteCountDelta: regional.counts.prerequisites - canonical.counts.prerequisites,
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
      if (canonical.fingerprint.counts.courses === 0 || regional.fingerprint.counts.courses === 0) {
        return {
          serviceCode: regional.serviceCode,
          status: "insufficient-content",
          reason: "empty-course-composition",
        };
      }
      const sameCurriculum = canonical.fingerprint.curriculumHash === regional.fingerprint.curriculumHash;
      const samePrerequisites = canonical.fingerprint.prerequisiteHash === regional.fingerprint.prerequisiteHash;
      const status = !sameCurriculum
        ? "content-difference-detected"
        : samePrerequisites
          ? "content-match-candidate"
          : "curriculum-match-prerequisite-coverage-difference";
      return {
        serviceCode: regional.serviceCode,
        status,
        reason: "curriculum-fingerprint",
        difference: status === "content-match-candidate"
          ? null
          : summarizeDifference(canonical.fingerprint, regional.fingerprint),
      };
    });
    const determinateStatuses = [
      "content-match-candidate",
      "curriculum-match-prerequisite-coverage-difference",
      "content-difference-detected",
    ];
    const determinate = comparisons.filter((comparison) => determinateStatuses.includes(comparison.status));
    const hasDifference = determinate.some((comparison) => comparison.status === "content-difference-detected");
    const allMatched = comparisons.length > 0
      && comparisons.every((comparison) => comparison.status === "content-match-candidate");
    const allCurriculaMatched = comparisons.length > 0
      && comparisons.every((comparison) => [
        "content-match-candidate",
        "curriculum-match-prerequisite-coverage-difference",
      ].includes(comparison.status));
    plans.push({
      identity: plan.identity,
      career: plan.career,
      plan: plan.plan,
      canonical,
      regionalOfferings,
      comparisons,
      conclusion: hasDifference
        ? "content-difference-detected"
        : allMatched
          ? "content-match-candidate"
          : allCurriculaMatched
            ? "curriculum-match-candidate"
          : comparisons.some((comparison) => comparison.status === "insufficient-content")
            ? "insufficient-content"
            : "pending-snapshots",
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
      availablePairs: comparisons.filter((comparison) => comparison.status !== "not-comparable").length,
      comparablePairs: comparisons.filter((comparison) =>
        [
          "content-match-candidate",
          "curriculum-match-prerequisite-coverage-difference",
          "content-difference-detected",
        ].includes(comparison.status)).length,
      contentMatchCandidates: comparisons.filter((comparison) => comparison.status === "content-match-candidate").length,
      curriculumMatchesWithPrerequisiteCoverageDifferences: comparisons.filter((comparison) =>
        comparison.status === "curriculum-match-prerequisite-coverage-difference").length,
      contentDifferences: comparisons.filter((comparison) => comparison.status === "content-difference-detected").length,
      insufficientContentPairs: comparisons.filter((comparison) => comparison.status === "insufficient-content").length,
      missingCanonicalSnapshots: plans.reduce((count, plan) =>
        count + (plan.canonical.available ? 0 : plan.regionalOfferings.length), 0),
      missingRegionalSnapshots: plans.reduce((count, plan) =>
        count + plan.regionalOfferings.filter((offering) => !offering.available).length, 0),
      pendingIdentities: plans.filter((plan) =>
        ["pending-snapshots", "insufficient-content"].includes(plan.conclusion)).length,
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
