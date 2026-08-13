#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { incompleteLogicalNodes } from "../lib/requirement-expression.mjs";

async function jsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(target);
    return entry.isFile() && entry.name.endsWith(".json") ? [target] : [];
  }));
  return nested.flat();
}

export async function auditBedeliasSnapshots(directory = "data/bedelias") {
  const findings = [];
  for (const file of await jsonFiles(directory)) {
    let snapshot;
    try {
      snapshot = JSON.parse(await readFile(file, "utf8"));
    } catch {
      continue;
    }
    if (!Array.isArray(snapshot.prerequisites)) continue;
    for (const rule of snapshot.prerequisites) {
      const nodes = incompleteLogicalNodes(rule.expression);
      if (nodes.length) {
        findings.push({
          file,
          targetCode: rule.target?.code ?? null,
          assessment: rule.target?.assessment ?? null,
          nodes,
        });
      }
    }
  }
  return findings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const findings = await auditBedeliasSnapshots(path.resolve("data/bedelias"));
  if (!findings.length) console.log("Auditoría de reglas de Bedelías: sin grupos lógicos incompletos.");
  else {
    console.log(`Auditoría de reglas de Bedelías: ${findings.length} reglas incompletas.`);
    for (const finding of findings) {
      console.log(`- ${path.relative(process.cwd(), finding.file)} · ${finding.targetCode}:${finding.assessment} · ${finding.nodes.map((node) => `${node.path} (${node.kind})`).join(", ")}`);
    }
  }
  if (process.argv.includes("--strict") && findings.length) process.exitCode = 1;
}
