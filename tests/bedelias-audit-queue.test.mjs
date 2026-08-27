import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildAuditQueue, officialAuditRegistryHash } from "../scripts/bedelias-audit-queue.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const globalManifest = readJson("data/bedelias/inventory/global-current.json");
const regionalManifest = readJson("data/bedelias/inventory/regional-offerings.json");
const comparisonManifest = readJson("data/bedelias/inventory/regional-content-comparison.json");
const auditRegistry = readJson("data/bedelias/audits/official-source-audits.json");
const saved = readJson("data/bedelias/inventory/audit-queue.json");

test("genera una cola canónica deduplicada y dirigida por excepciones", () => {
  assert.equal(saved.counts.canonicalIdentities, 184);
  assert.equal(saved.counts.auditedCanonicalIdentities, 7);
  assert.equal(saved.counts.evidenceClosedCanonicalIdentities, 122);
  assert.equal(saved.counts.pendingCanonicalIdentities, 55);
  assert.deepEqual(saved.counts.byPriority, {
    "official-sources-pending": 55,
  });
  assert.deepEqual(saved.counts.regionalComparisons, {
    "curriculum-match-prerequisite-coverage-difference": 16,
    "insufficient-content": 26,
    "content-difference-detected": 15,
  });
  assert.equal(new Set(saved.queue.map((entry) => entry.identity)).size, saved.queue.length);
  assert.equal(saved.queue.filter((entry) => entry.sourceOffers.length > 1).length, 3);
  assert.equal(saved.completedAudits[0].identity, "ingeniero agronomo:2020");
  assert.equal(saved.completedAudits[1].identity, "licenciatura en biotecnologia:2024");
  assert.equal(saved.completedAudits[2].identity, "abogacia:2016");
  assert.equal(saved.completedAudits[3].identity, "notariado:2016");
  assert.equal(saved.completedAudits[4].identity, "licenciatura en enfermeria:2016");
  assert.equal(saved.completedAudits[5].identity, "doctor en medicina:2008");
  assert.equal(saved.completedAudits[6].identity, "licenciatura en educacion fisica:2017");
  assert.equal(saved.completedAudits[7].identity, "tecnicatura en deportes:2007");
  assert.equal(saved.completedAudits[8].identity, "licenciatura en psicologia:2013");
  assert.equal(saved.completedAudits[9].identity, "diplomatura en musica:1994");
  assert.equal(saved.completedAudits[10].identity, "licenciatura en trabajo social:2009");
  assert.equal(saved.completedAudits[11].identity, "escalonada de enfermeria:2001");
  assert.equal(saved.completedAudits[12].identity, "licenciatura en enfermeria profesionalizacion de auxiliar:1999");
  assert.equal(saved.completedAudits[13].identity, "archivologia:2012");
  assert.equal(saved.completedAudits[14].identity, "bibliotecologia:2012");
  assert.equal(saved.completedAudits[15].identity, "lic en ingenieria biologica:2013");
  assert.equal(saved.completedAudits[16].identity, "licenciatura en fisioterapia:2006");
  assert.equal(saved.completedAudits[17].identity, "licenciatura en imagenologia:2006");
  assert.equal(saved.completedAudits[18].identity, "licenciatura en instrumentacion quirurgica:2006");
  assert.equal(saved.completedAudits[19].identity, "licenciatura en laboratorio clinico:2006");
  assert.equal(saved.completedAudits[20].identity, "licenciatura en psicomotricidad:2006");
  assert.equal(saved.completedAudits[21].identity, "tecnicatura en anatomia patologica:2006");
  assert.equal(saved.completedAudits[22].identity, "tecnicatura en hemoterapia:2006");
  assert.equal(saved.completedAudits[23].identity, "tecnicatura en podologia:2006");
  assert.equal(saved.completedAudits[24].identity, "tecnicatura en radioterapia:2006");
  assert.equal(saved.completedAudits[25].identity, "tecnicatura en salud ocupacional:2006");
  assert.equal(saved.completedAudits[26].identity, "tecnologo quimico:2025");
  assert.equal(saved.completedAudits[27].identity, "doctor en ciencias veterinarias:2021");
  assert.equal(saved.completedAudits[28].identity, "asistente en odontologia:2017");
  assert.equal(saved.completedAudits[29].identity, "higienista en odontologia:2017");
  assert.equal(saved.completedAudits[30].identity, "licenciatura en ciencias hidricas aplicadas:2016");
  assert.equal(saved.completedAudits[31].identity, "licenciatura en diseno integrado:2012");
  assert.equal(saved.completedAudits[32].identity, "tecnologo en administracion y contabilidad:2012");
  assert.equal(saved.completedAudits[33].identity, "licenciatura en gestion ambiental:2011");
  assert.equal(saved.completedAudits[34].identity, "licenciatura en lenguajes y medios audiovisuales:2011");
  assert.equal(saved.completedAudits[35].identity, "ingenieria forestal:2013");
  assert.equal(saved.completedAudits[36].identity, "tecnicatura en desarrollo regional sustentable:2013");
  assert.equal(saved.completedAudits[37].identity, "tecnico operador de alimentos:2011");
  assert.equal(saved.completedAudits[38].identity, "tecnologo carnico:2010");
  assert.equal(saved.completedAudits[39].identity, "licenciatura en nutricion:2014");
  assert.equal(saved.completedAudits[40].identity, "licenciatura en vitivinicultura:2006");
  assert.equal(saved.completedAudits[41].identity, "tecnico rural:1956");
  assert.equal(saved.completedAudits[42].identity, "tecnologo en gestion universitaria:2018");
  assert.equal(saved.completedAudits[43].identity, "licenciatura en oceanografia biologica:1978");
  assert.equal(saved.completedAudits[44].identity, "licenciatura en ciencia politica:2009");
  assert.equal(saved.completedAudits[45].identity, "licenciatura en desarrollo:2009");
  assert.equal(saved.completedAudits[46].identity, "licenciatura en sociologia:2009");
  assert.equal(saved.completedAudits[47].identity, "diplomacia:1918");
  assert.equal(saved.completedAudits[48].identity, "licenciatura en relaciones laborales:2012");
  assert.equal(saved.completedAudits[49].identity, "licenciatura en comunicacion:2012");
  assert.equal(saved.completedAudits[50].identity, "licenciatura en ciencias de la comunicacion:2012");
  assert.equal(saved.completedAudits[51].identity, "licenciatura en comunicacion generacion 2014:2012");
  assert.equal(saved.completedAudits[52].identity, "licenciatura en comunicacion plan 2012 version 2019:2012");
  assert.equal(saved.completedAudits[53].identity, "tecnicatura en archivo medico:2006");
  assert.equal(saved.completedAudits[54].identity, "tecnicatura en electroencefalografia:1900");
  assert.equal(saved.completedAudits[55].identity, "tecnicatura en electroencefalografia y neurofisiologia clinica:1990");
  assert.deepEqual(saved.completedAudits.slice(56, 65).map((entry) => entry.identity), [
    "tecnicatura en fisioterapia:1901",
    "tecnicatura en fonoaudiologia:1900",
    "tecnicatura en instrumentacion quirurgica:1997",
    "tecnicatura en laboratorio clinico:1900",
    "tecnicatura en neumocardiologia:1900",
    "tecnicatura en oftalmologia:1990",
    "tecnicatura en radiologia:1900",
    "tecnicatura en reeducacion psicomotriz:1901",
    "tecnicatura en registros medicos:1990",
  ]);
  assert.deepEqual(saved.completedAudits.slice(65, 85).map((entry) => entry.identity), [
    "asistente dental:1963",
    "higienista dental:1963",
    "laboratorista dental:1963",
    "laboratorista en odontologia:2017",
    "tecnicatura en direccion de coros:2002",
    "tecnicatura en interpretacion perfil canto guitarra piano:2002",
    "licenciatura binacional en turismo:2004",
    "tecnicatura binacional en turismo:2004",
    "tecnicatura en relaciones laborales:1995",
    "creador plastico:1991",
    "licenciatura en composicion:1987",
    "licenciatura en direccion coral:1987",
    "licenciatura en direccion orquestal:1987",
    "licenciatura en musicologia:1987",
    "profesorado:1967",
    "psicologia infantil:1960",
    "enfermeria universitaria:1983",
    "letras hispanicas:1976",
    "tecnicatura en turismo:1996",
    "ingenieria en computacion revalida:1987",
  ]);
  assert.deepEqual(saved.completedAudits.slice(85).map((entry) => entry.identity), [
    "licenciatura en fonoaudiologia:2006",
    "licenciatura en neumocardiologia:2006",
    "licenciatura en neurofisiologia clinica:2006",
    "licenciatura en oftalmologia:2006",
    "licenciatura en registros medicos:2006",
    "licenciatura en terapia ocupacional:2006",
    "tecnicatura en radioisotopos:2006",
    "tecnologo en cosmetologia medica:2006",
    "obstetra partera:1990",
    "tecnologo agroenergetico:2008",
    "ciclo en biologia bioquimica:2016",
    "ciclo inicial de matematica:2012",
    "licenciatura en ciencias sociales:2009",
    "tecnicatura en tecnologias de la imagen fotografica:2008",
    "tecnicatura universitaria en bienes culturales:2021",
    "tecnologo en produccion equina:2022",
    "tecnologo en sistemas integrados de produccion agropecuaria:2022",
    "licenciatura en educacion fisica:2014",
    "licenciatura en recursos naturales:2010",
    "tecnicatura en artes plasticas y visuales:2017",
    "tecnicatura en artes artes plasticas y visuales:2013",
    "tecnicatura en gestion de recursos naturales:2011",
    "tecnologo en madera:2012",
    "licenciatura en diseno de paisaje:2008",
    "licenciatura en turismo:2014",
    "tecnologo minero:2013",
    "licenciatura en economia agricola y gestion de agronegocios:2022",
    "licenciatura en arte digital y electronico:2013",
    "licenciatura en artes artes plasticas y visuales:2002",
    "licenciatura en artes ceramica:2002",
    "licenciatura en artes dibujo y pintura:2002",
    "licenciatura en artes diseno grafico:2002",
    "licenciatura en artes escultura y volumen en el espacio:2002",
    "licenciatura en artes fotografia:2002",
    "licenciatura en danza contemporanea:2018",
    "licenciatura en interpretacion musical:2005",
    "licenciatura en musica:2005",
  ]);
  assert.equal(saved.source.officialAuditRegistryHash, auditRegistry.contentHash);
  assert.equal(officialAuditRegistryHash(auditRegistry), auditRegistry.contentHash);
});

test("la cola guardada se reconstruye sin red con el mismo hash", () => {
  const rebuilt = buildAuditQueue({
    globalManifest,
    regionalManifest,
    comparisonManifest,
    auditRegistry,
    generatedAt: saved.generatedAt,
  });
  assert.equal(rebuilt.contentHash, saved.contentHash);
  assert.deepEqual(rebuilt.counts, saved.counts);
  assert.ok(rebuilt.queue.every((entry) => entry.canonicalSource.state !== "audited"));
  assert.equal(rebuilt.queue[0].priority, "official-sources-pending");
  assert.equal(rebuilt.queue[0].identity, "contador publico:2024");
});
