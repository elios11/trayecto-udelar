import { createHash } from "node:crypto";
import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = resolve(scriptDirectory, "..");
export const portableOutputRelativePath = "outputs/portable";
export const manifestFileName = "manifest.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalizedRelativePath = (root, file) => relative(root, file).split(sep).join("/");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`El resultado compilado no puede contener enlaces simbólicos: ${entryPath}`);
    if (entry.isDirectory()) files.push(...(await collectFiles(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

function expectedPaths(projectRoot) {
  const root = resolve(projectRoot);
  return { root, source: resolve(root, "dist"), output: resolve(root, portableOutputRelativePath), packagedDist: resolve(root, portableOutputRelativePath, "dist"), manifest: resolve(root, portableOutputRelativePath, manifestFileName), packageLock: resolve(root, "package-lock.json") };
}

function assertKnownPaths(projectRoot, source, output) {
  const expected = expectedPaths(projectRoot);
  if (resolve(source) !== expected.source || resolve(output) !== expected.output) throw new Error("El empaquetador sólo acepta dist/ y outputs/portable del mismo proyecto.");
  return expected;
}

async function manifestFor(paths) {
  const files = await collectFiles(paths.packagedDist);
  const records = await Promise.all(files.map(async (file) => {
    const contents = await readFile(file);
    return { path: normalizedRelativePath(paths.packagedDist, file), sha256: sha256(contents), bytes: contents.byteLength };
  }));
  records.sort((left, right) => left.path.localeCompare(right.path, "en"));
  return { format: "trayecto-portable-build", formatVersion: 1, nodeVersion: process.version, packageLockSha256: sha256(await readFile(paths.packageLock)), files: records };
}

export async function createPortablePackage({ projectRoot = repositoryRoot } = {}) {
  const paths = expectedPaths(projectRoot);
  assertKnownPaths(projectRoot, paths.source, paths.output);
  let sourceStatus;
  try { sourceStatus = await lstat(paths.source); } catch { throw new Error("No existe dist/. Ejecutá npm run build antes de npm run package."); }
  if (!sourceStatus.isDirectory()) throw new Error("dist/ debe ser un directorio compilado antes de empaquetar.");
  await rm(paths.output, { recursive: true, force: true });
  await mkdir(paths.output, { recursive: true });
  await cp(paths.source, paths.packagedDist, { recursive: true, dereference: false });
  const manifest = await manifestFor(paths);
  await writeFile(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...paths, packageManifest: manifest };
}

export async function verifyPortablePackage({ projectRoot = repositoryRoot } = {}) {
  const paths = expectedPaths(projectRoot);
  assertKnownPaths(projectRoot, paths.source, paths.output);
  let manifest;
  try { manifest = JSON.parse(await readFile(paths.manifest, "utf8")); } catch { throw new Error("No existe un manifiesto portable. Ejecutá npm run package primero."); }
  const expected = await manifestFor(paths);
  if (JSON.stringify(manifest) !== JSON.stringify(expected)) throw new Error("El manifiesto portable no coincide con los archivos empaquetados.");
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 0) { const result = await createPortablePackage(); console.log(`Artefacto portable generado en ${normalizedRelativePath(repositoryRoot, result.output)}.`); }
  else if (args.length === 1 && args[0] === "--verify") { await verifyPortablePackage(); console.log("El manifiesto portable coincide con el artefacto."); }
  else throw new Error("Uso: node scripts/package-portable-build.mjs [--verify]");
}
