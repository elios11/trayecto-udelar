#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "data", "fing", "computacion-1997-trayectorias.json");
const initialCatalogPath = path.join(projectRoot, "app", "data", "computacion-1997-bedelias.json");
const deferredCatalogPath = path.join(projectRoot, "app", "data", "computacion-1997-electivas.json");
const projectionPath = path.join(projectRoot, "app", "data", "computacion-1997-trayectorias.json");

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));

export async function buildComputacion1997Projection({ write = true, refreshInventory = true } = {}) {
  const [source, initialCatalog, deferredCatalog] = await Promise.all([
    readJson(sourcePath),
    readJson(initialCatalogPath),
    readJson(deferredCatalogPath),
  ]);
  const availableById = new Map([
    ...initialCatalog.courses.map((course) => [course.code, { ...course, id: course.code, bedeliasCode: course.code, sourceCatalog: "initial" }]),
    ...deferredCatalog.courses.map((course) => [course.id, { ...course, bedeliasCode: course.code, sourceCatalog: "deferred" }]),
  ]);
  for (const [id, alias] of Object.entries(source.courseAliases)) {
    const official = alias.bedeliasCode ? availableById.get(alias.bedeliasCode) : availableById.get(id);
    availableById.set(id, {
      id,
      bedeliasCode: alias.bedeliasCode ?? official?.bedeliasCode ?? id,
      name: alias.name,
      credits: alias.credits,
      sourceCatalog: official?.sourceCatalog ?? "trajectory-source",
    });
  }

  const referencedIds = [...new Set(source.trajectories.flatMap(({ periods }) => periods.flatMap(({ courseIds }) => courseIds)))];
  const missingIds = referencedIds.filter((id) => !availableById.has(id));
  if (missingIds.length) throw new Error(`Materias sin identidad verificable: ${missingIds.join(", ")}.`);

  for (const trajectory of source.trajectories) {
    const seen = new Set();
    for (const period of trajectory.periods) {
      for (const courseId of period.courseIds) {
        if (seen.has(courseId)) throw new Error(`${trajectory.id} repite ${courseId}.`);
        seen.add(courseId);
      }
      for (const courseId of period.recommendedCourseIds ?? []) {
        if (!period.courseIds.includes(courseId)) throw new Error(`${trajectory.id}/${period.label} recomienda ${courseId} fuera del período.`);
      }
      for (const choice of period.choiceGroups ?? []) {
        if (!period.courseIds.includes(choice.selectedCourseId)) throw new Error(`${trajectory.id}/${period.label} no coloca ${choice.selectedCourseId}.`);
        for (const alternativeId of choice.alternativeCourseIds) {
          if (!availableById.has(alternativeId)) throw new Error(`Alternativa sin catálogo: ${alternativeId}.`);
        }
      }
      if (period.publishedCredits !== null) {
        const calculated = period.courseIds.reduce((sum, id) => sum + availableById.get(id).credits, 0);
        if (calculated !== period.publishedCredits) throw new Error(`${trajectory.id}/${period.label}: ${calculated} créditos calculados, ${period.publishedCredits} publicados.`);
      }
    }
    if (trajectory.publishedTotalCredits !== undefined) {
      const total = trajectory.periods.reduce((sum, period) => sum + period.publishedCredits, 0);
      if (total !== trajectory.publishedTotalCredits) throw new Error(`${trajectory.id}: ${total} créditos, se publicaron ${trajectory.publishedTotalCredits}.`);
    }
  }

  const projection = {
    schemaVersion: source.schemaVersion,
    reviewedAt: source.reviewedAt,
    source: source.source,
    plan: source.plan,
    courses: referencedIds.map((id) => {
      const course = availableById.get(id);
      return { id, bedeliasCode: course.bedeliasCode, name: course.name, credits: course.credits, sourceCatalog: course.sourceCatalog };
    }),
    trajectories: Object.fromEntries(source.trajectories.map((trajectory) => [trajectory.id, {
      label: trajectory.label,
      description: trajectory.description,
      coverage: trajectory.coverage,
      ...(trajectory.continuation ? { continuation: trajectory.continuation } : {}),
      ...(trajectory.publishedTotalCredits ? { publishedTotalCredits: trajectory.publishedTotalCredits } : {}),
      periods: trajectory.periods,
    }])),
    documentedGaps: source.documentedGaps,
  };
  if (write) await writeFile(projectionPath, `${JSON.stringify(projection, null, 2)}\n`, "utf8");
  if (write && refreshInventory) await buildOfficialTrajectoryInventory();
  return projection;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  const projection = await buildComputacion1997Projection();
  const placements = Object.values(projection.trajectories).reduce((sum, trajectory) => sum + trajectory.periods.reduce((periodSum, period) => periodSum + period.courseIds.length, 0), 0);
  console.log(`Computación 1997: ${Object.keys(projection.trajectories).length} variantes, ${placements} colocaciones verificadas.`);
}
