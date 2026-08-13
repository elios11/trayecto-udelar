import test from "node:test";
import assert from "node:assert/strict";
import {
  batchTargetKey,
  buildPlanArguments,
  isCompletedSnapshot,
  reconcileBatchState,
  selectServicePlans,
  summarizeBatch,
} from "../scripts/bedelias-service-batch.mjs";

const serviceIndex = {
  source: { system: "SGAE Bedelías", extractedAt: "2026-08-09T00:00:00.000Z" },
  service: { code: "FING", name: "FACULTAD DE INGENIERÍA" },
  programs: [
    {
      name: "INGENIERÍA ELÉCTRICA",
      type: "CARRERA DE GRADO",
      plans: [
        { year: "2023", name: "Plan 2023", current: true },
        { year: "1997", name: "Plan 1997", current: false },
      ],
    },
    {
      name: "TECNÓLOGO EN TELECOMUNICACIONES",
      type: "TECNICATURA",
      plans: [{ year: "2015", name: "Plan 2015", current: true }],
    },
    {
      name: "CICLO INICIAL OPTATIVO",
      type: "CIO",
      plans: [{ year: "2014", name: "Plan 2014", current: true }],
    },
  ],
};

test("selecciona por defecto todos los planes vigentes del servicio", () => {
  const targets = selectServicePlans(serviceIndex);
  assert.deepEqual(targets.map((target) => [target.programName, target.year]), [
    ["CICLO INICIAL OPTATIVO", "2014"],
    ["INGENIERÍA ELÉCTRICA", "2023"],
    ["TECNÓLOGO EN TELECOMUNICACIONES", "2015"],
  ]);
  assert.ok(targets.every((target) => target.current));
});

test("filtra tipos y carreras sin depender de mayúsculas o tildes", () => {
  assert.deepEqual(
    selectServicePlans(serviceIndex, { types: "tecnicatura|grado" }).map((target) => target.programName),
    ["INGENIERÍA ELÉCTRICA", "TECNÓLOGO EN TELECOMUNICACIONES"],
  );
  assert.deepEqual(
    selectServicePlans(serviceIndex, { careers: "ingenieria electrica", currentOnly: false }).map((target) => target.year),
    ["2023", "1997"],
  );
});

test("los filtros canónicos incluyen tecnólogos y ciclos iniciales", () => {
  const index = {
    ...serviceIndex,
    programs: [
      { name: "TECNÓLOGO MECÁNICO", type: "Tecnólogo", plans: [{ year: "2020", current: true }] },
      { name: "CICLO INICIAL OPTATIVO", type: "Ciclo Inicial", plans: [{ year: "2021", current: true }] },
    ],
  };
  assert.deepEqual(
    selectServicePlans(index, { types: "TECNICATURA|CIO" }).map((target) => target.programName),
    ["CICLO INICIAL OPTATIVO", "TECNÓLOGO MECÁNICO"],
  );
});

test("el filtro de grado nunca incorpora posgrados por coincidencia parcial", () => {
  const index = {
    ...serviceIndex,
    programs: [...serviceIndex.programs, {
      name: "MAESTRÍA EN INGENIERÍA ELÉCTRICA",
      type: "Posgrado",
      plans: [{ year: "2024", name: "Plan 2024", current: true }],
    }],
  };
  const names = selectServicePlans(index, { types: "Grado" }).map((target) => target.programName);
  assert.ok(names.includes("INGENIERÍA ELÉCTRICA"));
  assert.ok(!names.includes("MAESTRÍA EN INGENIERÍA ELÉCTRICA"));
});

test("reanuda estados completados y agrega objetivos nuevos como pendientes", () => {
  const targets = selectServicePlans(serviceIndex, { maxPlans: 2 });
  const completedKey = batchTargetKey(targets[0]);
  const previous = {
    createdAt: "2026-08-09T01:00:00.000Z",
    targets: [{ key: completedKey, status: "succeeded", attempts: 1, finishedAt: "2026-08-09T02:00:00.000Z" }],
  };
  const state = reconcileBatchState(previous, serviceIndex, targets, {
    outputForTarget: (target) => `data/${target.year}.json`,
  }, "2026-08-09T03:00:00.000Z");

  assert.equal(state.createdAt, previous.createdAt);
  assert.equal(state.targets[0].status, "succeeded");
  assert.equal(state.targets[0].attempts, 1);
  assert.equal(state.targets[1].status, "pending");
  assert.equal(state.targets[1].output, "data/2023.json");
});

test("construye argumentos directos sin interpolar una shell", () => {
  const target = {
    serviceCode: "FING",
    programName: "INGENIERÍA ELÉCTRICA & CONTROL",
    year: "2023",
    output: "C:\\datos con espacios\\electrica.json",
  };
  const args = buildPlanArguments(target, {
    scraperPath: "C:\\proyecto\\scripts\\scrape-bedelias.mjs",
    delayMs: 700,
    headed: true,
  });
  assert.deepEqual(args.slice(0, 9), [
    "C:\\proyecto\\scripts\\scrape-bedelias.mjs",
    "plan",
    "--service", "FING",
    "--career", "INGENIERÍA ELÉCTRICA & CONTROL",
    "--year", "2023",
    "--delay",
  ]);
  assert.equal(args[9], "700");
  assert.ok(args.includes("C:\\datos con espacios\\electrica.json"));
  assert.equal(args.at(-1), "--headed");
});

test("resume el estado del lote por resultado", () => {
  assert.deepEqual(summarizeBatch({ targets: [
    { status: "succeeded" },
    { status: "failed" },
    { status: "pending" },
    { status: "interrupted" },
  ] }), { total: 4, pending: 1, running: 0, succeeded: 1, failed: 1, interrupted: 1 });
});

test("reconoce un snapshot completo del objetivo sin aceptar otro plan", () => {
  const target = { serviceCode: "FCIEN", programName: "LICENCIATURA EN CIENCIAS BIOLÓGICAS", year: "2017" };
  const snapshot = {
    schemaVersion: 1,
    service: { code: "FCIEN" },
    program: { name: "LICENCIATURA EN CIENCIAS BIOLOGICAS" },
    plan: { year: "2017" },
    validation: { issues: [] },
  };
  assert.equal(isCompletedSnapshot(snapshot, target), true);
  assert.equal(isCompletedSnapshot({ ...snapshot, plan: { year: "2018" } }, target), false);
  assert.equal(isCompletedSnapshot({ ...snapshot, validation: {} }, target), false);
});
