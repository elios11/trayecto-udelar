import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const forbiddenPathRules = [
  { label: "archivo de entorno", test: (value) => path.basename(value).startsWith(".env") },
  { label: "clave o certificado privado", test: (value) => /\.(?:pem|key|p12|pfx)$/i.test(value) },
  { label: "base de datos local", test: (value) => /\.(?:db|sqlite|sqlite3)$/i.test(value) },
  { label: "artefacto local", test: (value) => /(?:^|\/)(?:tmp|\.codex-remote-attachments)(?:\/|$)/.test(value) },
];

const joined = (...parts) => parts.join("");

export const secretContentRules = [
  { label: "clave privada", pattern: new RegExp(joined("-----BEGIN ", "(?:RSA |EC |OPENSSH )?", "PRIVATE KEY-----")) },
  { label: "token personal de GitHub", pattern: new RegExp(joined("(?:gh", "[pousr]_|github_pat_)", "[A-Za-z0-9_]{20,}")) },
  { label: "clave de API de OpenAI", pattern: new RegExp(joined("sk-", "(?:proj-|svcacct-)?", "[A-Za-z0-9_-]{20,}")) },
  { label: "clave de acceso de AWS", pattern: new RegExp(joined("AK", "IA", "[0-9A-Z]{16}")) },
];

export function inspectTrackedFiles(files, readFile = (file) => readFileSync(path.join(root, file))) {
  const findings = [];

  for (const file of files) {
    const normalized = file.replaceAll("\\", "/");
    for (const rule of forbiddenPathRules) {
      if (rule.test(normalized)) findings.push({ file: normalized, rule: rule.label });
    }

    const content = readFile(file);
    if (content.includes(0)) continue;
    const text = content.toString("utf8");
    for (const rule of secretContentRules) {
      if (rule.pattern.test(text)) findings.push({ file: normalized, rule: rule.label });
    }
  }

  return findings;
}

export function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { cwd: root })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const findings = inspectTrackedFiles(trackedFiles());
  if (findings.length > 0) {
    console.error("El repositorio contiene archivos o patrones que no deben publicarse:");
    for (const finding of findings) console.error(`- ${finding.file}: ${finding.rule}`);
    process.exitCode = 1;
  } else {
    console.log("Auditoría pública: no se detectaron archivos sensibles ni patrones de credenciales conocidos.");
  }
}
