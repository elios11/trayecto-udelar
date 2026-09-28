import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildRegisteredPlanCourses } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const plans = await Promise.all([
  "bioquimico-clinico-2015",
  "licenciatura-en-quimica-2016",
  "quimico-2015",
].map(async (slug) => ({
  slug,
  projection: await readJson(`app/data/bedelias-generated/bedelias-fq-${slug}.json`),
})));

const publishedUnion = (projection) => {
  const ids = new Set();
  for (const pathway of Object.values(projection.publishedPathways ?? projection.pathways)) {
    for (const period of pathway.periods) {
      for (const id of period.courseIds) ids.add(id);
    }
    for (const id of pathway.catalogCourseIds ?? []) ids.add(id);
  }
  return ids;
};

test("el planificador ofrece la unión publicada y verificada de los tres planes FQ sin duplicados", () => {
  for (const { slug, projection } of plans) {
    const pathways = projection.publishedPathways ?? projection.pathways;
    const availableIds = publishedUnion(projection);
    const expectedIds = projection.courses
      .filter((course) => (course.authorityStatus ?? "verified") === "verified" && availableIds.has(course.id))
      .map(({ id }) => id)
      .sort();

    for (const [pathwayId, pathway] of Object.entries(pathways)) {
      const courses = buildRegisteredPlanCourses(pathwayId, projection);
      const ids = courses.map(({ id }) => id);
      assert.equal(new Set(ids).size, ids.length, `${slug}/${pathwayId}: identidades duplicadas`);
      assert.deepEqual([...ids].sort(), expectedIds, `${slug}/${pathwayId}: catálogo incompleto`);

      const activeSemesters = new Map();
      pathway.periods.forEach(({ courseIds }, index) => {
        courseIds.forEach((id) => activeSemesters.set(id, index + 1));
      });
      for (const course of courses) {
        assert.equal(course.semester, activeSemesters.get(course.id) ?? "opt", `${slug}/${pathwayId}/${course.id}`);
        assert.equal(course.authorityStatus ?? "verified", "verified");
      }
    }
  }
});

test("la unión no se reduce al recorrido activo ni incorpora registros fuera de publicación", () => {
  const bioquimica = plans.find(({ slug }) => slug === "bioquimico-clinico-2015").projection;
  const desdeSalto = buildRegisteredPlanCourses("salto-primer-ano", bioquimica);
  const practicantado = desdeSalto.find(({ bedeliasCode }) => bedeliasCode === "966X");
  assert.ok(practicantado);
  assert.equal(practicantado.semester, "opt");

  const quimico = plans.find(({ slug }) => slug === "quimico-2015").projection;
  const desdeCalidad = buildRegisteredPlanCourses("calidad", quimico);
  const agricolaExclusiva = quimico.pathways["agricola-medio-ambiente"].periods
    .flatMap(({ courseIds }) => courseIds)
    .find((id) => !quimico.pathways.calidad.periods.flatMap(({ courseIds }) => courseIds).includes(id));
  assert.ok(agricolaExclusiva);
  assert.equal(desdeCalidad.find(({ id }) => id === agricolaExclusiva)?.semester, "opt");
  assert.ok(!desdeCalidad.some(({ id }) => id === "fq-validacion-final-plan"));
  assert.ok(!desdeCalidad.some(({ id }) => id === "fq-733-3"));
  assert.ok(!desdeCalidad.some(({ authorityStatus }) => authorityStatus && authorityStatus !== "verified"));
});
