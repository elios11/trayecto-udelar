import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const migration = await readFile(new URL("../app/personal-data-migration.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("la sede es un selector accesible e independiente de plan y trayectoria", () => {
  assert.match(page, /className="campus-selector"[\s\S]*?<span>Sede<\/span>[\s\S]*?<select value=\{activeCampus\?\.id \?\? ""\}/);
  assert.match(page, /setCampusId\(nextCampus\.id\)/);
  assert.match(page, /resolveCampusPathway\(activeRegisteredPlan\?\.pathways \?\? \{\}, nextCampus, ""\)/);
  assert.match(page, /JSON\.stringify\(\{ facultyId: activeFaculty\.id, planId: planYear, trajectoryId, campusId \}\)/);
  assert.match(migration, /validateOptionalReference\(value\.campusId, descriptor\.campusIds/);
});

test("la UI no presenta la extracción pendiente como auditoría oficial", () => {
  assert.match(page, /Catálogo parcial · sólo materias verificadas/);
  assert.match(page, /Catálogo en validación · sin materias publicadas/);
  assert.match(page, /\(course\.authorityStatus \?\? "verified"\) === "verified"/);
  assert.match(page, /activeRegisteredPlan\?\.publishedRules \?\? activeRegisteredPlan\?\.rules \?\? \[\]/);
  assert.match(page, /new Map<string, unknown>\(activeRegisteredPlan\.courses\.map/);
  assert.match(page, /activeRegisteredPlan\.plan\.courseCatalogAuditStatus === "structure-only"/);
  assert.match(page, /El plan está disponible, pero sus materias aún no tienen respaldo suficiente/);
  assert.match(page, /Este plan todavía no tiene materias verificadas para agregar\. La composición extraída se conserva en revisión\./);
});

test("el planificador distingue la organización personal de la currícula oficial", () => {
  assert.match(page, /Organizá cómo pensás cursar las materias de este plan/);
  assert.match(page, /Esto no modifica sus requisitos,[\s\S]*ni áreas oficiales/);
  assert.doesNotMatch(page, /Armá una currícula propia/);
});

test("los planes sin carga publicada se miden por materias y requisitos", () => {
  assert.match(page, /Materias planificadas/);
  assert.match(page, /carga no publicada/);
  assert.match(page, /el balance se compara por cantidad/);
  assert.match(page, /materias completadas/);
});

test("los perfiles oficiales seleccionan sus propias metas y no simulan títulos intermedios", () => {
  assert.match(page, /pathwayCredentialId = isRegisteredPlan \? activeRegisteredPathway\?\.credentialId : undefined/);
  assert.match(page, /item\.id === \(pathwayCredentialId \?\? credentialId\)/);
  assert.match(page, /hasPathwayCredentials \? undefined : creditStructure\.credentials\.find/);
  assert.match(page, /activeRegisteredPlan\?\.pathways\[next\]\?\.credentialId/);
  assert.match(page, /activeRegisteredPlan\?\.plan\.credentialLabel \?\? "Título de grado"/);
});

test("sede y estados pendientes usan tokens compatibles con todos los temas", () => {
  assert.match(css, /\.selector-row \.campus-selector select \{ min-width: 180px; \}/);
  assert.match(css, /\.pending-audit-note \.pilot-note-mark, \.pending-audit-status[\s\S]*var\(--warning-soft\)[\s\S]*var\(--warning-ink\)/);
  assert.match(css, /\.curriculum-unavailable[\s\S]*var\(--surface-subtle\)[\s\S]*var\(--paper\)/);
});

test("el selector no desborda en tablet y baja a una columna en móvil angosto", () => {
  const tablet = css.match(/@media \(min-width: 721px\) and \(max-width: 1100px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const mobile = css.match(/@media \(max-width: 430px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(tablet, /\.selector-row \.campus-selector select \{ width: 100%; min-width: 0; \}/);
  assert.match(tablet, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(mobile, /\.selector-row \{ grid-template-columns: 1fr; \}/);
});
