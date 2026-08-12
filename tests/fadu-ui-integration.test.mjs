import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const catalogSource = readFileSync(new URL("../app/academic-catalog.ts", import.meta.url), "utf8");
const registrySource = readFileSync(new URL("../app/academic-plan-registry.ts", import.meta.url), "utf8");

test("registra las tres carreras FADU auditadas en la jerarquía académica", () => {
  assert.match(catalogSource, /label: "Facultad de Arquitectura, Diseño y Urbanismo"/);
  assert.match(catalogSource, /id: "fadu-arquitectura-2015"/);
  assert.match(catalogSource, /id: "fadu-ldcv-2007"/);
  assert.match(catalogSource, /id: "fadu-ldind-2013"/);
  assert.match(catalogSource, /defaultCredentialId: "architect"/);
  assert.match(catalogSource, /defaultCredentialId: "visual-designer"/);
  assert.match(catalogSource, /defaultCredentialId: "industrial-designer"/);
});

test("carga FADU por un registro diferido sin condicionales específicos en la interfaz", () => {
  assert.match(registrySource, /load: \(\) => import\("\.\/data\/fadu-arquitectura-2015\.json"\)/);
  assert.match(registrySource, /load: \(\) => import\("\.\/data\/fadu-ldcv-2007\.json"\)/);
  assert.match(registrySource, /load: \(\) => import\("\.\/data\/fadu-ldind-2013\.json"\)/);
  assert.match(pageSource, /loadRegisteredPlan\(nextPlan\.id\)/);
  assert.match(pageSource, /buildRegisteredPlanCourses\(trajectoryId, activeRegisteredPlan\)/);
  assert.doesNotMatch(pageSource, /planYear === "fadu-/);
  assert.doesNotMatch(pageSource, /nextPlan\.id === "fadu-/);
});

test("la UI distingue períodos oficiales y bloques curriculares de materias", () => {
  assert.match(pageSource, /activeRegisteredPathway\?\.periods/);
  assert.match(pageSource, /selected\.curricularBlock \? "Este bloque se acredita manualmente/);
  assert.match(pageSource, /course\.dataStatus === "fadu-official" \? "FADU"/);
  assert.match(pageSource, /Proyección FADU auditada/);
});
