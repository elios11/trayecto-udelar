import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const curatedCatalog = JSON.parse(readFileSync(new URL("../app/data/curated-academic-catalog.json", import.meta.url), "utf8"));
const registrySource = readFileSync(new URL("../app/academic-plan-registry.ts", import.meta.url), "utf8");

test("registra las tres carreras FADU auditadas en la jerarquía académica", () => {
  const faculty = curatedCatalog.find(({ id }) => id === "fadu");
  const plans = faculty.careers.flatMap((career) => career.plans);
  assert.equal(faculty.label, "Facultad de Arquitectura, Diseño y Urbanismo");
  assert.deepEqual(plans.map(({ id }) => id), ["fadu-arquitectura-2015", "fadu-ldcv-2007", "fadu-ldind-2013"]);
  assert.deepEqual(plans.map(({ defaultCredentialId }) => defaultCredentialId), ["architect", "visual-designer", "industrial-designer"]);
});

test("carga FADU por un registro diferido sin condicionales específicos en la interfaz", () => {
  assert.match(registrySource, /load: \(\) => import\("\.\/data\/fadu-arquitectura-2015\.json"\)/);
  assert.match(registrySource, /load: \(\) => import\("\.\/data\/fadu-ldcv-2007\.json"\)/);
  assert.match(registrySource, /load: \(\) => import\("\.\/data\/fadu-ldind-2013\.json"\)/);
  assert.match(pageSource, /loadRegisteredPlan\(nextPlan\.id\)/);
  assert.match(pageSource, /buildRegisteredPlanCourses\(effectivePathwayId, activeRegisteredPlan\)/);
  assert.doesNotMatch(pageSource, /planYear === "fadu-/);
  assert.doesNotMatch(pageSource, /nextPlan\.id === "fadu-/);
});

test("la UI distingue proyecciones auditadas de composiciones extraídas", () => {
  assert.match(pageSource, /activeRegisteredPathway\?\.periods/);
  assert.match(pageSource, /selected\.curricularBlock \? "Este bloque se acredita manualmente/);
  assert.match(pageSource, /course\.dataStatus === "fadu-official" \? "FADU"/);
  assert.match(pageSource, /Proyección auditada/);
  assert.match(pageSource, /Composición Bedelías · auditoría oficial pendiente/);
});
