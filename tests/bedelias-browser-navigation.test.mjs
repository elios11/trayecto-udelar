import test from "node:test";
import assert from "node:assert/strict";

import { openServicePrograms, recoverNavigation, runRecoverableLookup, runVisibleTransition } from "../scripts/bedelias-browser-navigation.mjs";
import { selectPlanWithRecovery } from "../scripts/scrape-bedelias.mjs";

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

test("permite reconstruir la oferta antes de reintentar la entrada al servicio", async () => {
  const calls = [];
  let waits = 0;
  const programFilter = {
    waitFor: async () => {
      waits += 1;
      calls.push(`wait-${waits}`);
      if (waits === 1) throw new Error("timeout transitorio");
    },
  };
  const page = { getByRole: () => programFilter };
  const serviceRow = { click: async () => calls.push("click") };

  assert.equal(await openServicePrograms(
    page,
    serviceRow,
    10,
    async () => calls.push("recover-offer"),
  ), programFilter);
  assert.deepEqual(calls, ["wait-1", "click", "recover-offer", "wait-2", "click"]);
});

test("reintenta una transición visible una sola vez y permite recuperar el estado", async () => {
  const calls = [];
  let waits = 0;
  const locator = {
    waitFor: async () => {
      waits += 1;
      calls.push(`wait-${waits}`);
      if (waits === 1) throw new Error("timeout transitorio");
    },
  };

  assert.equal(await runVisibleTransition({
    locator,
    action: async (attempt) => calls.push(`action-${attempt}`),
    recover: async (attempt) => calls.push(`recover-${attempt}`),
    timeout: 10,
  }), locator);
  assert.deepEqual(calls, ["wait-1", "action-0", "recover-0", "wait-2", "action-1"]);
});

test("propaga el segundo fallo sin degradarlo silenciosamente", async () => {
  let actions = 0;
  await assert.rejects(runVisibleTransition({
    locator: { waitFor: async () => { throw new Error("árbol ausente"); } },
    action: async () => { actions += 1; },
    recover: async () => {},
    timeout: 10,
  }), /árbol ausente/);
  assert.equal(actions, 2);
});

test("recupera una vuelta de historial rechazada mediante recarga", async () => {
  const calls = [];
  let readyChecks = 0;
  assert.equal(await recoverNavigation({
    navigate: async () => {
      calls.push("navigate");
      throw new Error("ERR_CONNECTION_REFUSED");
    },
    reload: async () => calls.push("reload"),
    isReady: async () => {
      readyChecks += 1;
      calls.push(`ready-${readyChecks}`);
      return readyChecks === 2;
    },
  }), true);
  assert.deepEqual(calls, ["navigate", "ready-1", "reload", "ready-2"]);
});

test("reconstruye el servicio cuando un filtro paginado ignora la primera búsqueda", async () => {
  const calls = [];
  const result = await runRecoverableLookup({
    lookup: async (attempt) => {
      calls.push(`lookup-${attempt}`);
      return attempt === 0 ? null : { name: "TECNICATURA EN RADIOTERAPIA" };
    },
    recover: async () => calls.push("recover-service"),
  });

  assert.deepEqual(result, { name: "TECNICATURA EN RADIOTERAPIA" });
  assert.deepEqual(calls, ["lookup-0", "recover-service", "lookup-1"]);
});

test("vuelve a abrir servicio y carrera cuando la tabla de planes llega vacía", async () => {
  let attempts = 0;
  let recoveries = 0;
  const result = await selectPlanWithRecovery({
    year: "1999",
    select: async () => {
      attempts += 1;
      return attempts === 1 ? [] : [{ year: "1999", name: "Plan 1999" }];
    },
    recover: async () => { recoveries += 1; },
  });

  assert.equal(result.plan.year, "1999");
  assert.equal(attempts, 2);
  assert.equal(recoveries, 1);
});
