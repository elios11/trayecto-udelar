export async function runVisibleTransition({ locator, action, recover, timeout = 30_000, attempts = 2 }) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await Promise.all([
        locator.waitFor({ state: "visible", timeout }),
        action(attempt),
      ]);
      return locator;
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await recover?.(attempt, error);
    }
  }
  throw lastError;
}

export async function recoverNavigation({ navigate, reload, isReady }) {
  try {
    await navigate();
  } catch {
    // La URL de destino puede haber quedado activa aunque Playwright reporte un error de red.
  }
  if (await isReady()) return true;
  try {
    await reload();
  } catch {
    // El llamador conserva su recuperación final y el error descriptivo.
  }
  return isReady();
}

export async function openServicePrograms(page, serviceRow, timeout = 30_000, recover) {
  const programFilter = page.getByRole("textbox", { name: "Filtrar por Nombre" });
  return runVisibleTransition({
    locator: programFilter,
    action: () => serviceRow.click(),
    recover,
    timeout,
  });
}
