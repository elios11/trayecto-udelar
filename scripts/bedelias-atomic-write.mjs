import { rename } from "node:fs/promises";

const RETRIABLE_RENAME_ERRORS = new Set(["EACCES", "EBUSY", "EPERM"]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function renameWithRetry(source, destination, options = {}) {
  const renameFile = options.renameFile ?? rename;
  const wait = options.wait ?? sleep;
  const maxAttempts = options.maxAttempts ?? 8;
  const baseDelayMs = options.baseDelayMs ?? 75;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await renameFile(source, destination);
      return;
    } catch (error) {
      if (!RETRIABLE_RENAME_ERRORS.has(error?.code) || attempt === maxAttempts) throw error;
      await wait(baseDelayMs * attempt);
    }
  }
}
