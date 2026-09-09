import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("centraliza el guardado canónico y no aplica importaciones que no pudieron persistirse", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.equal((page.match(/dataKey: PERSONAL_DATA_STORAGE_KEY/g) ?? []).length, 1);
  assert.match(page, /writeWithLocalLease\(serialized/);
  assert.match(page, /if \(!persistPersonalDocument\(document, \{ fingerprint: importedFingerprint, allowBlocked: true \}\)\) return false/);
  assert.match(page, /if \(!applyImportedDocument\(transfer\.document, transfer\.state\)\) return/);
  assert.match(page, /canonicalWriteBlockedRef\.current && !options\.allowBlocked/);
  assert.match(page, /window\.addEventListener\("storage", receiveExternalPersonalData\)/);
  assert.match(page, /Exportar esta pestaña/);
  assert.match(page, /Exportar otra pestaña/);
});

test("muestra un estado accesible, última fecha durable y reintento local", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /aria-label="Estado del guardado local"/);
  assert.match(page, /role="status" aria-live="polite"/);
  assert.match(page, /<time dateTime=\{localSaveStatus\.savedAt\}>/);
  assert.match(page, /Reintentar guardado/);
  assert.match(page, /retryLocalSave/);
  assert.match(css, /\.local-save-message \{[^\n]*grid-template-columns: 8px minmax\(0, 1fr\)/);
  assert.match(css, /\.local-save-card > button \{[^\n]*min-height: 36px/);
});
