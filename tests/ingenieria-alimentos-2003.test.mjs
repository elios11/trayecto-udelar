import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { verifySource } from "../scripts/build-ingenieria-alimentos-2003.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const sourcePath = "data/fq/ingenieria-alimentos-2003-curriculas.json";
const projectionPath = "app/data/bedelias-generated/bedelias-fq-ingenieria-de-alimentos-2003.json";

test("Alimentos 2003 conserva dos guías de diez semestres y sus alternativas sin duplicar carrera", async () => {
  const [source, projection, catalog] = await Promise.all([
    readJson(sourcePath), readJson(projectionPath), readJson("app/data/extracted-academic-catalog.json"),
  ]);
  const { rows, technical } = verifySource(source, projection);
  assert.deepEqual(Object.keys(projection.publishedPathways), source.pathways.map(({ id }) => id));
  assert.deepEqual(source.auditedPathways.map(({ id }) => id), source.pathways.map(({ id }) => id));
  const byIdentity = new Map(projection.courses.map((course) => [course.bedeliasCode ?? course.sourceCourseId, course]));
  for (const pathway of source.auditedPathways) {
    const published = projection.publishedPathways[pathway.id];
    assert.deepEqual(published.periods.map(({ label }) => label), pathway.periods.map(({ label }) => label));
    assert.deepEqual(published.campusIds, ["montevideo"]);
    for (const [index, period] of pathway.periods.entries()) {
      assert.equal(published.periods[index].courseIds.length, period.courseIds.length);
      for (const identity of period.courseIds) {
        const course = byIdentity.get(identity);
        assert.ok(course, `Falta ${identity}`);
        assert.equal(course.authorityStatus, "verified");
        assert.ok(published.periods[index].courseIds.includes(course.id));
      }
    }
  }
  for (const [group, text] of Object.entries(source.alternativeGroups)) {
    assert.ok(text.length > 10);
    const alternatives = [...rows.values()].filter((row) => row[5] === group);
    assert.ok(alternatives.length >= 2);
    for (const [identity] of alternatives) {
      const code = technical.get(identity)?.code ?? `ia2003-${identity}`;
      assert.equal(byIdentity.get(code).elective, true);
    }
  }
  const plannerUnion = new Set(Object.values(projection.publishedPathways).flatMap((pathway) => [
    ...pathway.periods.flatMap(({ courseIds }) => courseIds), ...(pathway.catalogCourseIds ?? []),
  ]));
  for (const [identity] of rows.values()) {
    const code = technical.get(identity)?.code ?? `ia2003-${identity}`;
    assert.ok(plannerUnion.has(byIdentity.get(code).id), `Planificador omite ${identity}`);
  }
  const plans = catalog.flatMap((faculty) => faculty.careers.flatMap((career) => career.plans));
  assert.equal(plans.filter(({ id }) => id === source.planId).length, 1);
  assert.equal(projection.campuses.length, 1);
  assert.equal(projection.campuses[0].defaultPathwayId, "trayectoria-flexible");
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified").length, 65);
});
