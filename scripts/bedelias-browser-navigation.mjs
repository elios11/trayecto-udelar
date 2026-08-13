export async function openServicePrograms(page, serviceRow, timeout = 30_000) {
  const programFilter = page.getByRole("textbox", { name: "Filtrar por Nombre" });
  await Promise.all([
    programFilter.waitFor({ state: "visible", timeout }),
    serviceRow.click(),
  ]);
  return programFilter;
}
