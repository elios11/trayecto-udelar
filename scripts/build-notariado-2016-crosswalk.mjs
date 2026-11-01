import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Explicit review candidates, never publication rules or inferred equivalences.
const candidates = [
  [['11.1','11.2','11.2U'],['11.3'],['11.4','11.4U','11.8'],['11.5'],['11.6']],
  [['12.1','12.1U','12.10'],['12.2'],['12.3'],['12.4'],['12.5','12.5U','12.8'],['12.6','12.6U','12.9'],['12.7']],
  [['21.6','21.6U','21.9'],['21.2','21.2U','21.3'],['21.7','21.7U','21.8'],['21.4','21.4U','21.5'],['21.1']],
  [['22.1'],['22.2'],['22.3'],['22.4','22.4U','22.5'],[]],
  [['31.1','31.1U','31.2'],['31.6'],['31.7'],['31.3'],['31.4'],['31.5']],
  [['32.4'],['32.5'],['32.1'],['32.2','32.2U','32.3']],
  [['41.6'],['41.3','41.3U','41.4'],['41.2'],['41.5'],['41.1'],['41.7']],
  [['42.1','42.1U','42.2'],['42.4'],['42.3'],['42.5'],[]],
  [['51.1','51.2'],['51.3'],['51.4'],['51.6'],['51.5'],[]],
  [['52.2'],['52.1'],['52.3'],['52.5'],['52.6','52.6U','52.7'],['52.41'],['52.42'],[]],
];
const root = new URL('../', import.meta.url);
const readJson = async p => JSON.parse(await readFile(new URL(p, root), 'utf8'));
const hash = x => `sha256:${createHash('sha256').update(JSON.stringify(x)).digest('hex')}`;

export async function buildNotariadoCrosswalk({ write = true } = {}) {
  const evidence = await readJson('data/fder/notariado-2016-evidence.json');
  const snapshot = await readJson('app/data/bedelias-generated/bedelias-fder-notariado-2016.json');
  const courses = new Map(snapshot.courses.map(c => [c.bedeliasCode, c]));
  const rows = evidence.sourcePortion.semesterRows.flatMap((period, p) => {
    if (period.labels.length !== candidates[p].length) throw new Error(`Cambió el semestre ${p+1}; revisar el cotejo.`);
    return period.labels.map((officialLabel, i) => {
      const codes = candidates[p][i];
      const matched = codes.map(code => {
        const c = courses.get(code);
        if (!c) throw new Error(`Falta la identidad técnica ${code}`);
        return { code, id: c.id, name: c.name, credits: c.credits };
      });
      return {
        semester: period.semester, sourcePage: period.page, officialLabel,
        status: codes.length ? 'technical-correspondence-pending' : 'official-flexible-slot',
        candidates: matched,
        ...(p === 5 && i < 2 ? { conflict: 'La grilla asigna 6 al componente teórico y 10 al práctico; los códigos 32.4/32.5 publican 10/6 y no se intercambian por intuición.' } : {}),
        ...(p === 9 && i === 5 ? { conflict: 'La grilla muestra 3 créditos de área y 2 de curso para Parte 1.' } : {}),
        ...(p === 1 && i === 5 ? { conflict: 'La grilla rotula Sociedad y Derecho / Ciencia Política; no demuestra equivalencia automática con Ciencia Política.' } : {}),
      };
    });
  });
  const report = {
    schemaVersion: 1, planId: evidence.planId, reviewedAt: '2026-11-01',
    sourceUrl: evidence.curriculumUrl, sourcePdfSha256: evidence.sourcePdfSha256,
    evidenceHash: hash(evidence), projectionHash: hash(snapshot),
    policy: 'Candidatos para cotejo humano. Este archivo no promueve, fusiona, migra progreso ni publica identidades.',
    counts: { rows: rows.length, flexibleSlots: rows.filter(r => r.status === 'official-flexible-slot').length, explicitConflicts: rows.filter(r => r.conflict).length },
    rows,
  };
  if (write) {
    const target = new URL('data/fder/notariado-2016-crosswalk.json', root);
    const temporary = new URL(`${target.href}.tmp`);
    await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`);
    await rename(temporary, target);
  }
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await buildNotariadoCrosswalk();
  console.log(JSON.stringify(report.counts));
}
