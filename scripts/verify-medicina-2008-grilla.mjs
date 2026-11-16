import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const grid = await read("../data/official-trajectories/medicina-2008-grilla.json");
const rows = grid.periods.flatMap(({ rows }) => rows);
assert.equal(rows.length, 25);
assert.equal(new Set(rows.map(([code]) => code)).size, 25);
assert.deepEqual(grid.periods.map(({ semesters }) => semesters), [
  [1], [2], [3], [4], [5], [6], [7, 8], [9, 10], [11, 12], [13, 14],
]);
assert.deepEqual(grid.periods.map(({ rows }) => rows.reduce((total, [, , credits]) => total + credits, 0)),
  [40, 45, 45, 45, 45, 45, 110, 110, 110, 146]);
assert.deepEqual(grid.periods.at(-1).rows.map(([code]) => code), ["INTO"]);

for (const service of ["fmed", "cenurln"]) {
  const snapshot = await read(`../data/bedelias/${service}-doctor-en-medicina-2008.json`);
  const differences = {};
  for (const [code, , faculty] of rows) {
    const matches = snapshot.plan.courses.filter((course) => course.code === code);
    assert.equal(matches.length, 1, `${service}: ${code}`);
    const [match] = matches;
    if (match.credits !== faculty) differences[code] = { faculty, bedelias: match.credits };
  }
  assert.deepEqual(differences, grid.creditConflicts, service);
  for (const code of grid.credentials.degree.additionalRequiredActas) {
    assert.ok(snapshot.plan.courses.some((course) => course.code === code), `${service}: ${code}`);
    assert.ok(!rows.some(([rowCode]) => rowCode === code), `El acta ${code} no integra la grilla numerada.`);
  }
  console.log(`${service} ${snapshot.contentHash}: 25 códigos únicos; diferencias ${Object.keys(differences).join(", ")}`);
}
console.log(`Grilla normalizada: sha256:${createHash("sha256").update(JSON.stringify(grid)).digest("hex")}`);
