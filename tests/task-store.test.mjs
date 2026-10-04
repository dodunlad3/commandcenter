import test from "node:test";
import assert from "node:assert/strict";
import { createLocalTaskStore } from "../.task-tests/task-store.js";
import {
  localDate,
  selectTasks,
  validateTaskInput,
} from "../.task-tests/tasks.js";
function memory(initial) {
  let raw = initial ?? null;
  let blocked = false;
  let writes = 0;
  return {
    storage: {
      getItem: () => raw,
      setItem: (_key, value) => {
        if (blocked) throw new Error("quota");
        raw = value;
        writes++;
      },
    },
    raw: () => raw,
    writes: () => writes,
    block: () => {
      blocked = true;
    },
  };
}
const input = {
  title: "A real task",
  description: "Some context",
  category: "projects",
  priority: "high",
  scheduledDate: "2026-10-04",
  scheduledTime: "10:30",
  estimatedMinutes: 45,
};
const filters = {
  view: "all",
  category: "all",
  priority: "all",
  status: "all",
  sort: "scheduled",
};
test("adapter can be constructed during SSR without browser globals", () =>
  assert.doesNotThrow(() => createLocalTaskStore()));
test("first-run samples seed once, never on refresh or a new day", async () => {
  const data = memory();
  const store = createLocalTaskStore(() => data.storage);
  const seeded = await store.load("2026-10-04");
  assert.equal(seeded.length, 8);
  assert.deepEqual(
    await createLocalTaskStore(() => data.storage).load("2026-10-05"),
    seeded,
  );
  assert.equal(data.writes(), 1);
});
test("create, edit, complete, reopen and delete survive new adapter instances", async () => {
  const data = memory();
  let store = createLocalTaskStore(() => data.storage);
  await store.load(input.scheduledDate);
  const created = (
    await store.create({ ...input, title: "  A real task  " })
  ).at(-1);
  assert.equal(created.title, input.title);
  const originalId = created.id,
    createdAt = created.createdAt;
  await store.toggle(originalId);
  store = createLocalTaskStore(() => data.storage);
  assert.equal(
    (await store.load("2026-10-05")).find((t) => t.id === originalId).completed,
    true,
  );
  await store.update(originalId, {
    ...input,
    title: "Edited task",
    category: "fitness",
    scheduledDate: "2026-10-07",
    scheduledTime: null,
  });
  const edited = (await store.load("2026-10-05")).find(
    (t) => t.id === originalId,
  );
  assert.equal(edited.completed, true);
  assert.equal(edited.createdAt, createdAt);
  assert.equal(edited.recurring, false);
  assert.equal(edited.scheduledDate, "2026-10-07");
  await store.toggle(originalId);
  assert.equal(
    (await store.load("2026-10-05")).find((t) => t.id === originalId).completed,
    false,
  );
  await store.remove(originalId);
  assert.equal(
    (await store.load("2026-10-05")).some((t) => t.id === originalId),
    false,
  );
});
test("deleting every task persists an empty collection without reseeding", async () => {
  const data = memory();
  const store = createLocalTaskStore(() => data.storage);
  const seeded = await store.load(input.scheduledDate);
  for (const task of seeded) await store.remove(task.id);
  assert.deepEqual(
    await createLocalTaskStore(() => data.storage).load("2026-10-10"),
    [],
  );
  assert.equal(JSON.parse(data.raw()).tasks.length, 0);
});
test("failed saves leave durable data unchanged", async () => {
  const data = memory();
  const store = createLocalTaskStore(() => data.storage);
  await store.load(input.scheduledDate);
  const before = data.raw();
  data.block();
  await assert.rejects(store.create(input), /quota/);
  await assert.rejects(store.toggle("mock-0"), /quota/);
  await assert.rejects(store.remove("mock-0"), /quota/);
  assert.equal(data.raw(), before);
});
test("corrupt, unsupported, duplicate and malformed data are preserved", async () => {
  for (const raw of [
    "broken",
    "null",
    '{"version":2,"tasks":[]}',
    '{"version":1,"tasks":[{}]}',
  ]) {
    const data = memory(raw);
    await assert.rejects(
      createLocalTaskStore(() => data.storage).load(input.scheduledDate),
    );
    assert.equal(data.raw(), raw);
    assert.equal(data.writes(), 0);
  }
  const data = memory();
  const store = createLocalTaskStore(() => data.storage);
  const seeded = await store.load(input.scheduledDate);
  const duplicate = memory(
    JSON.stringify({ version: 1, tasks: [seeded[0], seeded[0]] }),
  );
  await assert.rejects(
    createLocalTaskStore(() => duplicate.storage).load(input.scheduledDate),
  );
  assert.equal(duplicate.writes(), 0);
});
test("invalid input is rejected before mutation", async () => {
  const data = memory();
  const store = createLocalTaskStore(() => data.storage);
  await store.load(input.scheduledDate);
  const before = data.raw();
  for (const invalid of [
    { title: "   " },
    { estimatedMinutes: 1.5 },
    { estimatedMinutes: 0 },
    { estimatedMinutes: 1441 },
    { scheduledDate: "2026-02-30" },
    { scheduledTime: "24:01" },
    { category: "other" },
    { priority: "urgent" },
    { description: "x".repeat(4001) },
  ]) {
    assert.ok(validateTaskInput({ ...input, ...invalid }));
    await assert.rejects(store.create({ ...input, ...invalid }));
  }
  assert.equal(data.raw(), before);
  assert.equal(validateTaskInput({ ...input, scheduledTime: null }), null);
});
test("independent adapters and rapid mutations preserve preceding changes", async () => {
  const data = memory();
  const a = createLocalTaskStore(() => data.storage),
    b = createLocalTaskStore(() => data.storage);
  await a.load(input.scheduledDate);
  await Promise.all([
    a.create(input),
    b.create({ ...input, title: "Another task" }),
  ]);
  assert.equal((await a.load(input.scheduledDate)).length, 10);
  await assert.rejects(a.update("missing", input), /no longer exists/);
});
test("today filtering excludes past and future tasks; upcoming excludes completed", async () => {
  const data = memory();
  const store = createLocalTaskStore(() => data.storage);
  await store.load(input.scheduledDate);
  await store.create({ ...input, scheduledDate: "2026-10-03" });
  await store.create({ ...input, scheduledDate: "2026-10-05" });
  const tasks = await store.load(input.scheduledDate);
  assert.equal(
    selectTasks(tasks, input.scheduledDate, { ...filters, view: "today" })
      .length,
    8,
  );
  assert.equal(
    selectTasks(tasks, input.scheduledDate, { ...filters, view: "upcoming" })
      .length,
    1,
  );
  const future = tasks.at(-1);
  await store.toggle(future.id);
  assert.equal(
    selectTasks(await store.load(input.scheduledDate), input.scheduledDate, {
      ...filters,
      view: "upcoming",
    }).length,
    0,
  );
});
test("filters compose and sorts order time, priority, and newest creation", async () => {
  const tasks = [
    {
      ...input,
      id: "a",
      completed: false,
      recurring: false,
      createdAt: "2026-10-01T09:00:00Z",
    },
    {
      ...input,
      id: "b",
      priority: "low",
      scheduledTime: "09:00",
      completed: true,
      recurring: false,
      createdAt: "2026-10-02T09:00:00Z",
    },
    {
      ...input,
      id: "c",
      priority: "medium",
      scheduledTime: null,
      completed: false,
      recurring: false,
      createdAt: "2026-10-03T09:00:00Z",
    },
  ];
  assert.deepEqual(
    selectTasks(tasks, input.scheduledDate, filters).map((t) => t.id),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    selectTasks(tasks, input.scheduledDate, {
      ...filters,
      sort: "priority",
    }).map((t) => t.id),
    ["a", "c", "b"],
  );
  assert.deepEqual(
    selectTasks(tasks, input.scheduledDate, {
      ...filters,
      sort: "created",
    }).map((t) => t.id),
    ["c", "b", "a"],
  );
  assert.deepEqual(
    selectTasks(tasks, input.scheduledDate, {
      ...filters,
      category: "projects",
      priority: "high",
      status: "open",
    }).map((t) => t.id),
    ["a"],
  );
  assert.equal(
    selectTasks(tasks, input.scheduledDate, { ...filters, category: "home" })
      .length,
    0,
  );
  assert.equal(
    selectTasks(tasks, input.scheduledDate, { ...filters, view: "completed" })
      .length,
    1,
  );
  assert.equal(localDate(new Date(2026, 9, 4, 23, 59)), "2026-10-04");
});
