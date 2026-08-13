import test from "node:test";
import assert from "node:assert/strict";

import { openServicePrograms } from "../scripts/bedelias-browser-navigation.mjs";

test("confirma la apertura del servicio por la UI de destino y no por un evento de URL", async () => {
  const calls = [];
  const programFilter = {
    waitFor: async (options) => calls.push(["waitFor", options]),
  };
  const page = {
    getByRole: (role, options) => {
      calls.push(["getByRole", role, options]);
      return programFilter;
    },
  };
  const serviceRow = {
    click: async () => calls.push(["click"]),
  };

  assert.equal(await openServicePrograms(page, serviceRow, 12_345), programFilter);
  assert.deepEqual(calls, [
    ["getByRole", "textbox", { name: "Filtrar por Nombre" }],
    ["waitFor", { state: "visible", timeout: 12_345 }],
    ["click"],
  ]);
});
