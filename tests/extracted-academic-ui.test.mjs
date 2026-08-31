import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("la sede es un selector accesible e independiente de plan y trayectoria", () => {
  assert.match(page, /className="campus-selector"[\s\S]*?<span>Sede<\/span>[\s\S]*?<select value=\{activeCampus\?\.id \?\? ""\}/);
  assert.match(page, /setCampusId\(nextCampus\.id\)/);
  assert.match(page, /resolveCampusPathway\(activeRegisteredPlan\?\.pathways \?\? \{\}, nextCampus, ""\)/);
  assert.match(page, /JSON\.stringify\(\{ facultyId: activeFaculty\.id, planId: planYear, trajectoryId, campusId \}\)/);
  assert.match(page, /typeof selection\.campusId === "string"/);
});

test("la UI no presenta la extracción pendiente como auditoría oficial", () => {
  assert.match(page, /Composición Bedelías · auditoría oficial pendiente/);
  assert.match(page, /Extracción de Bedelías · auditoría oficial pendiente/);
  assert.match(page, /activeRegisteredPlan\.plan\.compositionAvailable === false/);
  assert.match(page, /La carrera está identificada, pero su malla todavía no está disponible/);
});

test("los perfiles oficiales seleccionan sus propias metas y no simulan títulos intermedios", () => {
  assert.match(page, /pathwayCredentialId = isRegisteredPlan \? activeRegisteredPathway\?\.credentialId : undefined/);
  assert.match(page, /item\.id === \(pathwayCredentialId \?\? credentialId\)/);
  assert.match(page, /hasPathwayCredentials \? undefined : creditStructure\.credentials\.find/);
  assert.match(page, /activeRegisteredPlan\?\.pathways\[next\]\?\.credentialId/);
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
