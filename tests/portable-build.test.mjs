import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { createPortablePackage, verifyPortablePackage } from "../scripts/package-portable-build.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
async function fixtureRoot() {
  const root = await mkdtemp(resolve(tmpdir(), "trayecto-portable-build-"));
  await mkdir(resolve(root, "dist", "assets"), { recursive: true });
  await writeFile(resolve(root, "dist", "index.html"), "<main>Trayecto</main>\n");
  await writeFile(resolve(root, "dist", "assets", "app.js"), "console.log('trayecto');\n");
  await writeFile(resolve(root, "package-lock.json"), "{\"lockfileVersion\":3}\n");
  return root;
}
test("el empaquetador exige dist/ con un mensaje útil", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "trayecto-portable-build-missing-"));
  await writeFile(resolve(root, "package-lock.json"), "{}\n");
  await assert.rejects(() => createPortablePackage({ projectRoot: root }), /No existe dist/);
  await rm(root, { recursive: true, force: true });
});
test("copia archivos anidados y registra hashes ordenados y verificables", async () => {
  const root = await fixtureRoot();
  try {
    const result = await createPortablePackage({ projectRoot: root });
    const manifest = JSON.parse(await readFile(result.manifest, "utf8"));
    assert.deepEqual(manifest.files.map((file) => file.path), ["assets/app.js", "index.html"]);
    assert.equal(manifest.files[0].sha256, hash("console.log('trayecto');\n"));
    assert.equal(manifest.files[1].sha256, hash("<main>Trayecto</main>\n"));
    assert.equal(manifest.packageLockSha256, hash("{\"lockfileVersion\":3}\n"));
    assert.deepEqual(await verifyPortablePackage({ projectRoot: root }), manifest);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("dos empaquetados de la misma entrada generan el mismo manifiesto y no exponen rutas ni fechas", async () => {
  const root = await fixtureRoot();
  try {
    const first = JSON.stringify((await createPortablePackage({ projectRoot: root })).packageManifest);
    const second = JSON.stringify((await createPortablePackage({ projectRoot: root })).packageManifest);
    assert.equal(second, first);
    assert.equal(first.includes(root), false);
    assert.equal(first.includes("202"), false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("sólo limpia outputs/portable y preserva archivos vecinos", async () => {
  const root = await fixtureRoot();
  try {
    await mkdir(resolve(root, "outputs", "portable"), { recursive: true });
    await writeFile(resolve(root, "outputs", "preservar.txt"), "no borrar\n");
    await writeFile(resolve(root, "outputs", "portable", "anterior.txt"), "reemplazar\n");
    await createPortablePackage({ projectRoot: root });
    assert.equal(await readFile(resolve(root, "outputs", "preservar.txt"), "utf8"), "no borrar\n");
    await assert.rejects(() => readFile(resolve(root, "outputs", "portable", "anterior.txt"), "utf8"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("el workflow orquesta solamente scripts existentes y conserva permisos mínimos", async () => {
  const workflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  for (const command of ["verify", "build", "package"]) { assert.equal(typeof packageJson.scripts[command], "string"); assert.match(workflow, new RegExp(`- run: npm run ${command}`)); }
  assert.match(workflow, /^on:\n {2}push:\n {2}pull_request:/m);
  assert.match(workflow, /^permissions:\n {2}contents: read$/m);
  assert.match(workflow, /actions\/(checkout|setup-node|upload-artifact)@v4/);
  assert.match(workflow, /node-version: 22\.13\.0/);
  assert.doesNotMatch(workflow, /deploy|secret|bedelias|playwright/i);
});
