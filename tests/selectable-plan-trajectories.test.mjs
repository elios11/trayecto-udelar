import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GENERATED_PATHWAY_LABEL,
  buildRegisteredPlanPresentation,
  isRealCurricularCourse,
} from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const report = await readJson("data/bedelias/inventory/ui-extracted-plans.json");
const curatedCatalog = await readJson("app/data/curated-academic-catalog.json");
const extractedCatalog = await readJson("app/data/extracted-academic-catalog.json");
const pageSource = await readFile(new URL("app/page.tsx", root), "utf8");

const registeredProjectionPaths = new Map(report.plans.map(({ planId }) => [
  planId,
  `app/data/bedelias-generated/${planId}.json`,
]));
for (const planId of ["fadu-arquitectura-2015", "fadu-ldcv-2007", "fadu-ldind-2013"]) {
  registeredProjectionPaths.set(planId, `app/data/${planId}.json`);
}

const catalogPlanIds = new Set([...curatedCatalog, ...extractedCatalog]
  .flatMap((faculty) => faculty.careers)
  .flatMap((career) => career.plans)
  .map(({ id }) => id));
const specializedPlanIds = new Set(["1997", "2025", "electrica-2023", "civil-2021", "qf-2015"]);
const specializedPlanFiles = new Map([
  ["1997", "app/data/computacion-1997-bedelias.json"],
  ["2025", "app/data/computacion-2025-fing.json"],
  ["electrica-2023", "app/data/electrica-2023-fing.json"],
  ["civil-2021", "app/data/civil-2021-fing.json"],
  ["qf-2015", "app/data/quimico-farmaceutico-2015-fq.json"],
]);

test("cada plan seleccionable tiene una presentación de Currícula con materias reales", async () => {
  assert.equal(catalogPlanIds.size, registeredProjectionPaths.size + specializedPlanIds.size);
  for (const [id, relativePath] of specializedPlanFiles) {
    assert.ok(catalogPlanIds.has(id), `${id}: plan especializado ausente`);
    const projection = await readJson(relativePath);
    const realCourseRefs = new Set(projection.courses
      .filter((course) => isRealCurricularCourse(course))
      .flatMap((course) => [course.id, course.bedeliasCode].filter(Boolean)));
    if (id === "1997") {
      assert.ok(projection.courses.some(isRealCurricularCourse), `${id}: composición sin materias reales`);
      assert.match(pageSource, /const plan1997BaseCourses:[\s\S]*?semester: 1/, `${id}: Currícula sin períodos reales`);
      continue;
    }
    for (const [pathwayId, pathway] of Object.entries(projection.trajectories ?? projection.profiles)) {
      const presentedIds = [...(pathway.preSemester ?? []), ...pathway.semesters.flat()];
      assert.ok(presentedIds.some((courseId) => realCourseRefs.has(courseId)), `${id}/${pathwayId}: Currícula sin materias reales`);
    }
  }

  for (const [planId, relativePath] of registeredProjectionPaths) {
    assert.ok(catalogPlanIds.has(planId), `${planId}: proyección fuera del selector`);
    const projection = await readJson(relativePath);
    for (const pathwayId of Object.keys(projection.pathways)) {
      const presentation = buildRegisteredPlanPresentation(pathwayId, projection);
      const courseById = new Map(presentation.courses.map((course) => [course.id, course]));
      const presentedIds = presentation.periods.flatMap((period) => period.courseIds)
        .filter((courseId) => isRealCurricularCourse(courseById.get(courseId)));
      assert.ok(presentedIds.length > 0, `${planId}/${pathwayId}: Currícula sin materias reales`);
      assert.equal(new Set(presentedIds).size, presentedIds.length, `${planId}/${pathwayId}: Currícula con materias duplicadas`);
      assert.equal(new Set(presentation.courses.map(({ id }) => id)).size, presentation.courses.length, `${planId}/${pathwayId}: catálogo duplicado`);

      if (!presentation.generated) continue;
      assert.equal(presentation.label, GENERATED_PATHWAY_LABEL, `${planId}/${pathwayId}: procedencia ambigua`);
      assert.match(presentation.description, /provisorio|provisional/i, `${planId}/${pathwayId}: falta advertencia`);
      assert.ok(presentation.periods.every(({ label }) => /Bedelías|orientativo/i.test(label)), `${planId}/${pathwayId}: período presentado como oficial`);
      assert.ok(presentation.periods.every(({ courseIds }) => courseIds.length <= 6), `${planId}/${pathwayId}: tramo orientativo ilegible`);
      const coreCourses = presentedIds.map((id) => courseById.get(id));
      if (coreCourses.some((course) => (course?.authorityStatus ?? "verified") === "verified")) {
        assert.ok(coreCourses.every((course) => (course?.authorityStatus ?? "verified") === "verified"), `${planId}/${pathwayId}: candidatas mezcladas con el núcleo verificado`);
      }
      const expectedIds = projection.courses.filter(isRealCurricularCourse).map(({ id }) => id).sort();
      assert.deepEqual(presentation.courses.map(({ id }) => id).sort(), expectedIds, `${planId}/${pathwayId}: composición incompleta en planificador`);
    }
  }
});

test("Ingeniería Química 2021 usa por defecto la currícula oficial FING y conserva todas las opciones verificadas", async () => {
  const projection = await readJson("app/data/bedelias-generated/bedelias-fing-ingenieria-quimica-2021.json");
  const presentation = buildRegisteredPlanPresentation("ingreso-fing", projection);
  const idsInCurriculum = presentation.periods.flatMap(({ courseIds }) => courseIds);
  const provisional = presentation.courses.filter((course) => course.provisional);
  const verifiedRealIds = projection.courses
    .filter((course) => course.authorityStatus === "verified" && isRealCurricularCourse(course))
    .map(({ id }) => id)
    .sort();

  assert.equal(presentation.generated, false);
  assert.equal(presentation.label, "Trayectoria oficial");
  assert.equal(presentation.periods.length, 10);
  assert.equal(idsInCurriculum.length, 46);
  assert.equal(new Set(idsInCurriculum).size, idsInCurriculum.length);
  assert.deepEqual(presentation.courses.filter(isRealCurricularCourse).map(({ id }) => id).sort(), verifiedRealIds);
  assert.equal(provisional.length, 0);
  assert.ok(idsInCurriculum.every((id) => presentation.courses.find((course) => course.id === id)?.authorityStatus === "verified"));
  assert.ok(presentation.courses.some(({ bedeliasCode }) => bedeliasCode === "Q80"));
  assert.ok(!idsInCurriculum.includes("fing-validacion-final-plan"));
});

test("las candidatas del fallback siguen siendo provisionales y no aportan requisitos oficiales", async () => {
  const projection = await readJson("app/data/bedelias-generated/bedelias-fing-ingenieria-quimica-2021.json");
  const presentation = buildRegisteredPlanPresentation("curricula-personalizada", projection);
  const candidate = presentation.courses.find((course) => course.provisional);
  const original = projection.courses.find((course) => course.id === candidate.id);

  assert.equal(candidate.authorityStatus, "candidate");
  assert.equal(original.authorityStatus, "candidate");
  assert.deepEqual(candidate.creditAllocations, []);
  assert.deepEqual(candidate.eligibleRequirementIds, []);
  assert.ok((original.creditAllocations?.length ?? 0) > 0);
});
