import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("wires local recovery controls into the data panel accessibly", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /RECOVERY_STORAGE_KEY/);
  assert.match(page, /Recuperación local/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /isUndoShortcut/);
  assert.match(page, /createRecoverySnapshot/);
  assert.match(page, /restoreDeletedTerm/);
  assert.match(page, /reason: "Migración local"/);
  assert.match(page, /createCurrentSnapshot\("Importación completa"\)/);
  assert.match(page, /createCurrentSnapshot\("Importación de planificador"\)/);
  assert.match(page, /createCurrentSnapshot\("Reinicio de progreso"\)/);
  assert.match(page, /Copia de seguridad antes de restaurar/);
  assert.match(page, /currentPersonalDocument\(\)/);
  assert.match(page, /persistRecoveryImmediately\(snapshot\.store\)/);
  assert.match(page, /persistRecoveryImmediately\(added\.store\)/);
  assert.match(page, /persistRecoveryImmediately\(cleared\)/);
  assert.match(page, /isDeletedTermAlreadyRestored\(document, item\)/);
  const restoreStart = page.indexOf("const restoreTrashedTerm");
  const restoreEnd = page.indexOf("const importProgress", restoreStart);
  const restoreSource = page.slice(restoreStart, restoreEnd);
  const normalRestore = restoreSource.slice(restoreSource.indexOf("const restored = restoreDeletedTerm"));
  assert.ok(normalRestore.indexOf("applyImportedDocument(restored.document, state.state)") < normalRestore.indexOf("persistRecoveryImmediately(removed.store)"));
  assert.match(page, /ref=\{recoveryConfirmRef\}/);
  assert.match(page, /transferResources\.catalog/);
  assert.match(page, /onBlur=\{\(\) => \{ renameUndoTermRef\.current = null; \}\}/);
  assert.match(page, /role="dialog" aria-modal="true"/);
  assert.doesNotMatch(page, /window\.confirm/);
});

test("keeps the expanded recovery panel usable on narrow and short screens", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /\.data-panel[^\n]*max-height: calc\(100dvh - 96px\)/);
  assert.match(css, /\.data-panel[^\n]*overflow-y: auto/);
  assert.match(css, /\.data-panel[^\n]*overscroll-behavior: contain/);
  assert.match(css, /\.recovery-list > div[^\n]*grid-template-columns: minmax\(0, 1fr\) auto auto/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.data-panel \{ max-height: calc\(100dvh - 121px\);/);
  assert.match(css, /@media \(max-width: 360px\)[\s\S]*\.recovery-list > div \{ grid-template-columns: 1fr;/);
});
