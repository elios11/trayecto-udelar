#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renameWithRetry } from "./bedelias-atomic-write.mjs";
import { normalizeLookup } from "./bedelias-service-batch.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const REGIONAL_SERVICE_CODES = Object.freeze([
  "CENURLN",
  "CENURSO",
  "CUCEL",
  "CUR",
  "CURE",
  "CUT",
]);

// Preferimos los servicios de menor volumen para obtener checkpoints tempranos.
// El orden sólo selecciona qué oferta extraer; no establece precedencia académica.
export const REPRESENTATIVE_PRIORITY = Object.freeze([
  "CENURSO",
  "CUCEL",
  "CUR",
  "CURE",
  "CUT",
  "CENURLN",
]);

const STATE_PRIORITY = Object.freeze({
  audited: 0,
  "structurally-valid": 1,
  extracted: 2,
  "official-sources-pending": 3,
  discovered: 4,
  blocked: 5,
});

export function canonicalPlanIdentity(careerName, planYear) {
  return `${normalizeLookup(careerName)}:${String(planYear).trim()}`;
}

function flattenPlans(manifest) {
  return (manifest.services ?? []).flatMap((service) =>
    (service.plans ?? []).map((plan) => ({
      identity: canonicalPlanIdentity(plan.career.name, plan.plan.year),
      serviceCode: service.code,
      serviceName: service.name,
      careerName: plan.career.name,
      careerType: plan.career.type,
      planYear: String(plan.plan.year),
      planKey: plan.key,
      state: plan.state,
      site: plan.site ?? null,
    })),
  );
}

function compareOfferings(left, right) {
  const priorityDifference = REPRESENTATIVE_PRIORITY.indexOf(left.serviceCode)
    - REPRESENTATIVE_PRIORITY.indexOf(right.serviceCode);
  if (priorityDifference !== 0) return priorityDifference;
  return left.serviceCode.localeCompare(right.serviceCode, "es")
    || left.careerName.localeCompare(right.careerName, "es");
}

function compareCentralSources(left, right) {
  return (STATE_PRIORITY[left.state] ?? 99) - (STATE_PRIORITY[right.state] ?? 99)
    || left.serviceCode.localeCompare(right.serviceCode, "es")
    || left.careerName.localeCompare(right.careerName, "es");
}

function contentHash(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function countBy(items, keyForItem) {
  return items.reduce((counts, item) => {
    const key = keyForItem(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function publicOffering(offering) {
  return {
    serviceCode: offering.serviceCode,
    serviceName: offering.serviceName,
    planKey: offering.planKey,
    site: offering.site,
    state: offering.state,
  };
}

export function buildRegionalOfferingsManifest(globalManifest, options = {}) {
  const regionalCodes = new Set(options.regionalServiceCodes ?? REGIONAL_SERVICE_CODES);
  const allPlans = flattenPlans(globalManifest);
  const regionalPlans = allPlans.filter((plan) => regionalCodes.has(plan.serviceCode));
  const centralPlans = allPlans.filter((plan) => !regionalCodes.has(plan.serviceCode));
  const centralByIdentity = Map.groupBy(centralPlans, (plan) => plan.identity);
  const regionalByIdentity = Map.groupBy(regionalPlans, (plan) => plan.identity);

  const canonicalPlans = [...regionalByIdentity.entries()]
    .map(([identity, rawOfferings]) => {
      const offerings = [...rawOfferings].sort(compareOfferings);
      const centralMatches = [...(centralByIdentity.get(identity) ?? [])].sort(compareCentralSources);
      const representative = centralMatches[0] ?? offerings[0];
      const needsRegionalExtraction = centralMatches.length === 0;
      return {
        identity,
        career: {
          name: representative.careerName,
          normalizedName: normalizeLookup(representative.careerName),
          type: representative.careerType,
        },
        plan: { year: representative.planYear },
        canonicalSource: publicOffering(representative),
        classification: needsRegionalExtraction ? "regional-only" : "central-match-candidate",
        equivalence: centralMatches.length > 0
          ? { status: "pending-content-comparison", basis: "normalized-career-name-and-plan-year" }
          : { status: "not-applicable", basis: "no-central-identity-match" },
        offerings: offerings.map(publicOffering),
        centralMatches: centralMatches.map(publicOffering),
        extractionTarget: needsRegionalExtraction ? publicOffering(offerings[0]) : null,
        presentation: {
          dimension: "site",
          siteSelector: "only-when-curricular-differences-are-verified",
          sharesProgressUntilDifferenceVerified: true,
        },
      };
    })
    .sort((left, right) => left.identity.localeCompare(right.identity, "es"));

  const extractionTargets = canonicalPlans
    .filter((plan) => plan.extractionTarget)
    .map((plan) => ({
      identity: plan.identity,
      serviceCode: plan.extractionTarget.serviceCode,
      careerName: plan.career.name,
      planYear: plan.plan.year,
      planKey: plan.extractionTarget.planKey,
      state: plan.extractionTarget.state,
    }))
    .sort((left, right) => compareOfferings(left, right));

  const centralMatchedPlans = canonicalPlans.filter((plan) => plan.classification === "central-match-candidate");
  const repeatedRegionalPlans = canonicalPlans.filter((plan) => plan.offerings.length > 1);
  const stableContent = {
    sourceManifestHash: globalManifest.contentHash,
    regionalServiceCodes: [...regionalCodes].sort(),
    canonicalPlans,
    extractionTargets,
  };

  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    source: {
      system: globalManifest.source?.system ?? "SGAE Bedelías",
      globalManifestHash: globalManifest.contentHash ?? null,
      globalManifestGeneratedAt: globalManifest.generatedAt ?? null,
      method: "exact-normalized-career-name-and-plan-year",
    },
    policy: {
      canonicalPlan: "one-per-normalized-career-name-and-plan-year",
      offerings: "preserved-by-service-without-duplicating-curriculum",
      centralMatch: "candidate-only-until-content-comparison",
      curricularVariants: "site-selector-only-after-verified-course-differences",
      representativePriority: REPRESENTATIVE_PRIORITY,
    },
    counts: {
      regionalOffers: regionalPlans.length,
      canonicalRegionalIdentities: canonicalPlans.length,
      centralMatchedOffers: centralMatchedPlans.reduce((sum, plan) => sum + plan.offerings.length, 0),
      centralMatchedIdentities: centralMatchedPlans.length,
      regionalOnlyOffers: canonicalPlans
        .filter((plan) => plan.classification === "regional-only")
        .reduce((sum, plan) => sum + plan.offerings.length, 0),
      regionalOnlyIdentities: extractionTargets.length,
      repeatedRegionalIdentities: repeatedRegionalPlans.length,
      offersInRegionalRepeats: repeatedRegionalPlans.reduce((sum, plan) => sum + plan.offerings.length, 0),
      extractionTargetsByService: countBy(extractionTargets, (target) => target.serviceCode),
    },
    canonicalPlans,
    extractionTargets,
    contentHash: contentHash(stableContent),
  };
}

async function atomicJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await renameWithRetry(temporaryPath, filePath);
}

async function main() {
  const inputArgument = process.argv.indexOf("--input");
  const outputArgument = process.argv.indexOf("--output");
  const inputPath = path.resolve(
    PROJECT_ROOT,
    inputArgument >= 0 ? process.argv[inputArgument + 1] : "data/bedelias/inventory/global-current.json",
  );
  const outputPath = path.resolve(
    PROJECT_ROOT,
    outputArgument >= 0 ? process.argv[outputArgument + 1] : "data/bedelias/inventory/regional-offerings.json",
  );
  const globalManifest = JSON.parse(await readFile(inputPath, "utf8"));
  const manifest = buildRegionalOfferingsManifest(globalManifest);
  await atomicJson(outputPath, manifest);
  console.log(`Ofertas regionales: ${manifest.counts.regionalOffers}.`);
  console.log(`Identidades canónicas regionales: ${manifest.counts.canonicalRegionalIdentities}.`);
  console.log(`Extracciones nuevas: ${manifest.counts.regionalOnlyIdentities}.`);
  console.log(`Salida: ${outputPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
