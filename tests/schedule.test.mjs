import test from "node:test";
import assert from "node:assert/strict";
import {
  createLocalScheduleStore,
  SCHEDULE_STORAGE_KEY,
} from "../.task-tests/schedule-store.js";
import {
  createDefaultSchedule,
  scheduleForDate,
  weekdayForDate,
  activeScheduleBlock,
  nextScheduleBlock,
  flexibleRoutines,
  openWindows,
  validateBlock,
} from "../.task-tests/schedule.js";
import {
  activeTask,
  overdueTasks,
  nextUpcomingTask,
  nextUpcomingItem,
  rightNow,
  todayTimeline,
  energyRecommendations,
  todayOpenWindows,
} from "../.task-tests/agenda.js";
import { localDate } from "../.task-tests/date-time.js";
function memory(initial = null) {
  let raw = initial,
    writes = 0,
    blocked = false;
  return {
    storage: {
      getItem: (key) => {
        assert.equal(key, SCHEDULE_STORAGE_KEY);
        return raw;
      },
      setItem: (key, value) => {
        assert.equal(key, SCHEDULE_STORAGE_KEY);
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
const monday = "2026-10-05",
  tuesday = "2026-10-06",
  nextMonday = "2026-10-12";
const input = {
  title: "Personal project",
  description: "A little progress",
  category: "projects",
  startTime: "17:00",
  endTime: "18:00",
  flexible: false,
};
const task = (extra = {}) => ({
  id: "task",
  title: "Fix a bug",
  description: "",
  category: "work",
  priority: "high",
  completed: false,
  recurring: false,
  createdAt: "2026-10-01T00:00:00Z",
  scheduledDate: monday,
  scheduledTime: "17:00",
  estimatedMinutes: 60,
  ...extra,
});
const at = (date, time) => new Date(`${date}T${time}:00`);
test("schedule adapter is safe to construct on the server", () =>
  assert.doesNotThrow(() => createLocalScheduleStore()));
test("first-run seeds exactly weekday work/commutes and flexible fitness, weekends open", async () => {
  const memoryStore = memory();
  const store = createLocalScheduleStore(() => memoryStore.storage);
  const data = await store.load();
  assert.equal(data.routines.length, 7);
  assert.equal(data.overrides.length, 0);
  for (const r of data.routines.slice(0, 5)) {
    assert.equal(r.blocks.length, 4);
    assert.deepEqual(
      r.blocks.slice(0, 3).map((b) => [b.title, b.startTime, b.endTime]),
      [
        ["Commute to Work", "06:00", "07:00"],
        ["Work", "07:00", "15:30"],
        ["Commute Home", "15:30", "16:30"],
      ],
    );
    assert.equal(r.blocks[3].flexible, true);
    assert.equal(r.blocks[3].startTime, null);
    assert.equal(r.blocks[3].endTime, null);
  }
  assert.equal(data.routines[0].blocks[3].title, "Full-body workout");
  assert.equal(data.routines[1].blocks[3].title, "Run — minimum 1.5 miles");
  assert.deepEqual(
    data.routines.slice(5).map((r) => r.blocks),
    [[], []],
  );
  assert.deepEqual(
    await createLocalScheduleStore(() => memoryStore.storage).load(),
    data,
  );
  assert.equal(memoryStore.writes(), 1);
});
test("weekly create/edit/delete persists and applies to all occurrences of that weekday", async () => {
  const data = memory(),
    store = createLocalScheduleStore(() => data.storage);
  await store.load();
  let saved = await store.create({ weekday: "monday" }, input);
  const block = saved.routines[0].blocks.at(-1);
  saved = await store.update({ weekday: "monday" }, block.id, {
    ...input,
    title: "Project focus",
    startTime: null,
    endTime: null,
    flexible: true,
  });
  assert.equal(
    scheduleForDate(saved, monday).find((b) => b.id === block.id).title,
    "Project focus",
  );
  assert.equal(
    scheduleForDate(saved, nextMonday).find((b) => b.id === block.id).flexible,
    true,
  );
  assert.equal(
    scheduleForDate(saved, tuesday).some((b) => b.id === block.id),
    false,
  );
  const fresh = createLocalScheduleStore(() => data.storage);
  assert.deepEqual(await fresh.load(), saved);
  await fresh.remove({ weekday: "monday" }, block.id);
  assert.equal(
    scheduleForDate(await fresh.load(), monday).some((b) => b.id === block.id),
    false,
  );
});
test("date-only additions, edits, and removals never change the weekly routine", async () => {
  const data = memory(),
    store = createLocalScheduleStore(() => data.storage);
  const original = await store.load();
  await store.create({ date: nextMonday }, input);
  await store.update({ date: nextMonday }, "monday-work", {
    ...input,
    title: "Day off",
    category: "personal",
    startTime: null,
    endTime: null,
    flexible: true,
  });
  const saved = await store.remove({ date: nextMonday }, "monday-commute-out");
  assert.deepEqual(saved.routines, original.routines);
  assert.equal(
    scheduleForDate(saved, nextMonday).find((b) => b.id === "monday-work")
      .title,
    "Day off",
  );
  assert.equal(
    scheduleForDate(saved, nextMonday).some(
      (b) => b.id === "monday-commute-out",
    ),
    false,
  );
  assert.equal(
    scheduleForDate(saved, nextMonday).some((b) => b.title === input.title),
    true,
  );
  assert.deepEqual(
    scheduleForDate(saved, monday),
    scheduleForDate(original, monday),
  );
  assert.deepEqual(
    await createLocalScheduleStore(() => data.storage).load(),
    saved,
  );
});
test("overrides inherit unrelated template changes, can edit their own additions, and reset explicitly", async () => {
  const data = memory(),
    store = createLocalScheduleStore(() => data.storage);
  await store.load();
  await store.update({ date: nextMonday }, "monday-work", {
    ...input,
    title: "Only this date",
  });
  await store.update({ weekday: "monday" }, "monday-commute-home", {
    ...input,
    title: "New commute time",
  });
  let saved = await store.create(
    { date: nextMonday },
    { ...input, title: "Date addition" },
  );
  const added = saved.overrides[0].additions[0];
  saved = await store.update({ date: nextMonday }, added.id, {
    ...input,
    title: "Edited addition",
  });
  assert.equal(
    scheduleForDate(saved, nextMonday).find((b) => b.id === "monday-work")
      .title,
    "Only this date",
  );
  assert.equal(
    scheduleForDate(saved, nextMonday).find(
      (b) => b.id === "monday-commute-home",
    ).title,
    "New commute time",
  );
  assert.equal(saved.overrides[0].additions[0].title, "Edited addition");
  await store.remove({ date: nextMonday }, added.id);
  saved = await store.resetDate(nextMonday);
  assert.equal(saved.overrides.length, 0);
  assert.deepEqual(
    scheduleForDate(saved, nextMonday),
    scheduleForDate(saved, monday),
  );
});
test("deleting a weekly block cleans associated patches without resurrecting it", async () => {
  const data = memory(),
    store = createLocalScheduleStore(() => data.storage);
  await store.load();
  await store.update({ date: monday }, "monday-work", input);
  await store.remove({ date: nextMonday }, "monday-work");
  await store.remove({ weekday: "monday" }, "monday-work");
  const saved = await createLocalScheduleStore(() => data.storage).load();
  assert.equal(
    scheduleForDate(saved, monday).some((b) => b.id === "monday-work"),
    false,
  );
  assert.equal(saved.overrides.length, 0);
});
test("deleting every schedule block preserves empty routines without reseeding", async () => {
  const data = memory(),
    store = createLocalScheduleStore(() => data.storage);
  const seeded = await store.load();
  for (const r of seeded.routines)
    for (const b of r.blocks) await store.remove({ weekday: r.weekday }, b.id);
  const saved = await createLocalScheduleStore(() => data.storage).load();
  assert.equal(saved.routines.flatMap((r) => r.blocks).length, 0);
  assert.deepEqual(scheduleForDate(saved, monday), []);
});
test("malformed/versioned/duplicate/invalid schedule storage is preserved on reads and writes", async () => {
  const base = createDefaultSchedule();
  const duplicate = structuredClone(base);
  duplicate.routines[0].blocks.push(duplicate.routines[0].blocks[0]);
  const invalid = structuredClone(base);
  invalid.routines[0].blocks[0].endTime = "05:00";
  const badOverride = structuredClone(base);
  badOverride.overrides = [
    {
      date: monday,
      additions: [],
      replacements: [{ ...input, id: "unknown" }],
      removedIds: [],
    },
  ];
  for (const raw of [
    "broken",
    "null",
    JSON.stringify({ version: 3, schedule: base }),
    JSON.stringify({ version: 1, schedule: {} }),
    ...[duplicate, invalid, badOverride].map((schedule) =>
      JSON.stringify({ version: 1, schedule }),
    ),
  ]) {
    const data = memory(raw),
      store = createLocalScheduleStore(() => data.storage);
    await assert.rejects(store.load());
    await assert.rejects(store.create({ weekday: "monday" }, input));
    assert.equal(data.raw(), raw);
    assert.equal(data.writes(), 0);
  }
});
test("invalid form input and failed persistence leave stored schedule untouched", async () => {
  const data = memory(),
    store = createLocalScheduleStore(() => data.storage);
  await store.load();
  const raw = data.raw();
  for (const invalid of [
    { title: " " },
    { category: "other" },
    { startTime: "25:00" },
    { endTime: "17:00" },
    { endTime: null },
    { flexible: true },
    { description: "x".repeat(4001) },
  ])
    await assert.rejects(
      store.create({ weekday: "monday" }, { ...input, ...invalid }),
    );
  await assert.rejects(store.create({ date: "2026-02-30" }, input));
  await assert.rejects(store.update({ weekday: "monday" }, "missing", input));
  assert.equal(data.raw(), raw);
  data.block();
  await assert.rejects(
    store.remove({ weekday: "monday" }, "monday-work"),
    /quota/,
  );
  assert.equal(data.raw(), raw);
  assert.equal(
    validateBlock({ ...input, startTime: null, endTime: null, flexible: true }),
    null,
  );
});
test("independent adapters apply preceding persisted edits", async () => {
  const data = memory(),
    a = createLocalScheduleStore(() => data.storage),
    b = createLocalScheduleStore(() => data.storage);
  await a.load();
  await Promise.all([
    a.create({ weekday: "monday" }, input),
    b.create({ date: monday }, input),
  ]);
  const saved = await a.load();
  assert.equal(saved.routines[0].blocks.length, 5);
  assert.equal(scheduleForDate(saved, monday).length, 6);
});
test("active routine uses start inclusive/end exclusive; next skips active and flexible routines", () => {
  const blocks = scheduleForDate(createDefaultSchedule(), monday);
  assert.equal(
    activeScheduleBlock(blocks, at(monday, "06:00")).title,
    "Commute to Work",
  );
  assert.equal(activeScheduleBlock(blocks, at(monday, "07:00")).title, "Work");
  assert.equal(
    activeScheduleBlock(blocks, at(monday, "15:30")).title,
    "Commute Home",
  );
  assert.equal(activeScheduleBlock(blocks, at(monday, "16:30")), undefined);
  assert.equal(
    nextScheduleBlock(blocks, at(monday, "05:59")).title,
    "Commute to Work",
  );
  assert.equal(
    nextScheduleBlock(blocks, at(monday, "07:00")).title,
    "Commute Home",
  );
  assert.equal(nextScheduleBlock(blocks, at(monday, "16:30")), undefined);
  assert.equal(flexibleRoutines(blocks).length, 1);
});
test("task window is active only within its estimated duration and overdue afterward", () => {
  const tasks = [
    task(),
    task({ id: "untimed", scheduledTime: null }),
    task({ id: "done", completed: true }),
  ];
  assert.equal(activeTask(tasks, at(monday, "16:59")), undefined);
  assert.equal(activeTask(tasks, at(monday, "17:00")).id, "task");
  assert.equal(activeTask(tasks, at(monday, "17:59")).id, "task");
  assert.equal(activeTask(tasks, at(monday, "18:00")), undefined);
  assert.deepEqual(overdueTasks(tasks, at(monday, "17:59")), []);
  assert.deepEqual(
    overdueTasks(tasks, at(monday, "18:00")).map((t) => t.id),
    ["task"],
  );
  assert.equal(nextUpcomingTask(tasks, at(monday, "16:59")).id, "task");
  assert.equal(nextUpcomingTask(tasks, at(monday, "18:00")), undefined);
});
test("tasks spanning midnight remain active until their window ends", () => {
  const t = task({ scheduledTime: "23:30", estimatedMinutes: 90 });
  assert.equal(activeTask([t], at(tuesday, "00:15")).id, t.id);
  assert.equal(activeTask([t], at(tuesday, "01:00")), undefined);
  assert.equal(overdueTasks([t], at(tuesday, "01:00")).length, 1);
});
test("Up Next merges timed tasks/routines chronologically and ignores untimed/completed/past items", () => {
  const blocks = scheduleForDate(createDefaultSchedule(), monday);
  assert.equal(
    nextUpcomingItem(
      [task({ scheduledTime: "06:30" })],
      blocks,
      at(monday, "05:30"),
    ).kind,
    "routine",
  );
  assert.equal(
    nextUpcomingItem(
      [task({ scheduledTime: "06:30" })],
      blocks,
      at(monday, "06:15"),
    ).kind,
    "task",
  );
  assert.equal(
    nextUpcomingItem(
      [
        task({ scheduledTime: null }),
        task({ id: "done", completed: true }),
        task({ id: "future", scheduledDate: tuesday }),
      ],
      blocks,
      at(monday, "16:30"),
    ),
    undefined,
  );
});
test("Right Now prefers active task, then routine, then next event, then open window", () => {
  const blocks = scheduleForDate(createDefaultSchedule(), monday);
  assert.equal(
    rightNow([task({ scheduledTime: "10:00" })], blocks, at(monday, "10:15"))
      .item.kind,
    "task",
  );
  assert.equal(
    rightNow([task({ scheduledTime: "09:00" })], blocks, at(monday, "10:15"))
      .item.block.title,
    "Work",
  );
  assert.equal(rightNow([], blocks, at(monday, "05:00")).active, false);
  assert.equal(rightNow([], blocks, at(monday, "16:30")), null);
});
test("midnight switches weekday and applies overrides without adding daily records or losing tasks", () => {
  const data = createDefaultSchedule(),
    before = JSON.stringify(data);
  assert.equal(weekdayForDate(localDate(at(monday, "23:59"))), "monday");
  assert.equal(weekdayForDate(localDate(at(tuesday, "00:00"))), "tuesday");
  assert.equal(
    scheduleForDate(data, tuesday).at(-1).title,
    "Run — minimum 1.5 miles",
  );
  assert.equal(scheduleForDate(data, "2026-10-10").length, 0);
  data.overrides.push({
    date: tuesday,
    additions: [{ ...input, id: "one-off" }],
    replacements: [],
    removedIds: [],
  });
  assert.equal(scheduleForDate(data, tuesday).length, 5);
  assert.equal(scheduleForDate(data, "2026-10-13").length, 4);
  assert.equal(data.overrides.length, 1);
  assert.equal(JSON.stringify(createDefaultSchedule()), before);
  const tasks = [task()];
  assert.equal(todayTimeline(tasks, [], tuesday).length, 0);
  assert.equal(tasks.length, 1);
});
test("timeline sorts both kinds, flexible routines remain separate, and open windows merge overlaps", () => {
  const blocks = scheduleForDate(createDefaultSchedule(), monday);
  const tasks = [
    task({ scheduledTime: "10:30" }),
    task({ id: "untimed", scheduledTime: null }),
  ];
  assert.deepEqual(
    todayTimeline(tasks, blocks, monday).map((e) => [e.startTime, e.kind]),
    [
      ["06:00", "routine"],
      ["07:00", "routine"],
      ["10:30", "task"],
      ["15:30", "routine"],
    ],
  );
  assert.deepEqual(
    openWindows(blocks).map((w) => [w.startTime, w.endTime]),
    [
      ["00:00", "06:00"],
      ["16:30", "24:00"],
    ],
  );
  assert.deepEqual(
    todayOpenWindows([task({ scheduledTime: "17:00" })], blocks, monday).map(
      (w) => [w.startTime, w.endTime],
    ),
    [
      ["00:00", "06:00"],
      ["16:30", "17:00"],
      ["18:00", "24:00"],
    ],
  );
  assert.deepEqual(openWindows([]), [
    { startTime: "00:00", endTime: "24:00", minutes: 1440 },
  ]);
  assert.equal(
    openWindows([
      { ...input, id: "a" },
      { ...input, id: "b", startTime: "17:30", endTime: "19:00" },
    ])[1].startTime,
    "19:00",
  );
});
test("energy recommendations are non-destructive, prioritize essentials, and respect available time", () => {
  const blocks = scheduleForDate(createDefaultSchedule(), monday),
    tasks = [
      task({ id: "essential", scheduledTime: null }),
      task({ id: "optional", priority: "low", scheduledTime: null }),
      task({
        id: "too-long",
        priority: "low",
        scheduledTime: null,
        estimatedMinutes: 500,
      }),
    ],
    before = JSON.stringify({ tasks, blocks });
  assert.deepEqual(
    energyRecommendations(tasks, blocks, at(monday, "20:00"), "Low").tasks.map(
      (t) => t.id,
    ),
    ["essential"],
  );
  assert.equal(
    energyRecommendations(tasks, blocks, at(monday, "20:00"), "Low").routines[0]
      .category,
    "fitness",
  );
  assert.deepEqual(
    energyRecommendations(
      tasks,
      blocks,
      at(monday, "20:00"),
      "Locked In",
    ).tasks.map((t) => t.id),
    ["essential", "optional"],
  );
  assert.equal(JSON.stringify({ tasks, blocks }), before);
});
test("open time accounts for a previous day's task window extending past midnight", () => {
  const tasks = [task({ scheduledTime: "23:30", estimatedMinutes: 90 })];
  assert.deepEqual(todayOpenWindows(tasks, [], tuesday), [
    { startTime: "01:00", endTime: "24:00", minutes: 1380 },
  ]);
});
