import test from "node:test";
import assert from "node:assert/strict";
import {
  createLocalScheduleStore,
  SCHEDULE_STORAGE_KEY as key,
  SCHEDULE_BACKUP_KEY as backup,
} from "../.task-tests/schedule-store.js";
import {
  createDefaultSchedule,
  matchesRecurring,
  scheduleForDate,
} from "../.task-tests/schedule.js";
const metadata = {
  name: "Remote Friday",
  weekday: "friday",
  anchorDate: "2026-10-09",
};
const block = {
  title: "Remote Work",
  description: "At home",
  category: "work",
  startTime: "07:00",
  endTime: "15:30",
  flexible: false,
};
function memory(raw) {
  const values = new Map(raw === undefined ? [] : [[key, raw]]);
  return {
    values,
    storage: {
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => values.set(k, v),
    },
  };
}
test("v1 migration preserves edited routines and date patches with exact backup, without reseeding", async () => {
  const data = createDefaultSchedule();
  delete data.recurringOverrides;
  data.routines[4].blocks[1].title = "My actual work";
  data.routines[5].blocks = [];
  data.overrides = [
    {
      date: "2026-10-09",
      additions: [],
      replacements: [{ ...block, id: "friday-work", title: "Personal day" }],
      removedIds: [],
    },
  ];
  const raw = JSON.stringify({ version: 1, schedule: data }),
    m = memory(raw),
    store = createLocalScheduleStore(() => m.storage);
  const migrated = await store.load();
  assert.deepEqual(migrated, { ...data, recurringOverrides: [] });
  assert.equal(m.values.get(backup), raw);
  assert.equal(JSON.parse(m.values.get(key)).version, 2);
  assert.deepEqual(await store.load(), migrated);
  assert.equal(m.values.get(backup), raw);
});
test("failed migration write preserves original legacy record", async () => {
  const data = createDefaultSchedule();
  delete data.recurringOverrides;
  const raw = JSON.stringify({ version: 1, schedule: data });
  for (const blocked of [key, backup]) {
    const m = memory(raw);
    const store = createLocalScheduleStore(() => ({
      getItem: m.storage.getItem,
      setItem: (k, v) => {
        if (k === blocked) throw Error("quota");
        m.storage.setItem(k, v);
      },
    }));
    await assert.rejects(store.load(), /quota/);
    assert.equal(m.values.get(key), raw);
  }
});
test("anchor calendar arithmetic crosses months, years, DST and rejects other weekdays", () => {
  const rule = {
    ...metadata,
    id: "rule",
    intervalWeeks: 2,
    additions: [],
    replacements: [],
    removedIds: [],
  };
  for (const date of ["2026-10-09", "2026-10-23", "2026-11-06", "2026-09-25"])
    assert.equal(matchesRecurring(rule, date), true, date);
  for (const date of ["2026-10-16", "2026-10-10"])
    assert.equal(matchesRecurring(rule, date), false, date);
  for (const [anchor, match, miss] of [
    ["2026-12-25", "2027-01-08", "2027-01-01"],
    ["2026-03-06", "2026-03-20", "2026-03-13"],
    ["2026-10-30", "2026-11-13", "2026-11-06"],
  ]) {
    assert.equal(
      matchesRecurring({ ...rule, anchorDate: anchor }, match),
      true,
    );
    assert.equal(
      matchesRecurring({ ...rule, anchorDate: anchor }, miss),
      false,
    );
  }
});
test("weekly then alternating then date precedence; deletion restores original weekly schedule", async () => {
  const m = memory(),
    store = createLocalScheduleStore(() => m.storage),
    original = await store.load();
  let data = await store.createRecurring(metadata);
  const id = data.recurringOverrides[0].id;
  await store.remove({ recurringId: id }, "friday-commute-out");
  await store.remove({ recurringId: id }, "friday-commute-home");
  data = await store.update({ recurringId: id }, "friday-work", block);
  assert.equal(scheduleForDate(data, "2026-10-09").length, 2);
  assert.equal(scheduleForDate(data, "2026-10-23")[0].title, "Remote Work");
  assert.deepEqual(
    scheduleForDate(data, "2026-10-16"),
    scheduleForDate(original, "2026-10-16"),
  );
  // A previously saved date replacement wins even when alternating removes its base block.
  data.overrides.push({
    date: "2026-10-09",
    additions: [],
    replacements: [
      { ...block, id: "friday-commute-out", title: "Special commute" },
    ],
    removedIds: ["friday-work"],
  });
  m.storage.setItem(key, JSON.stringify({ version: 2, schedule: data }));
  const resolved = scheduleForDate(await store.load(), "2026-10-09");
  assert.ok(resolved.some((b) => b.title === "Special commute"));
  assert.ok(!resolved.some((b) => b.id === "friday-work"));
  const datePatches = structuredClone(data.overrides);
  data = await store.removeRecurring(id);
  assert.deepEqual(data.routines, original.routines);
  assert.deepEqual(data.overrides, datePatches);
  assert.deepEqual(
    scheduleForDate(data, "2026-10-23"),
    scheduleForDate(original, "2026-10-23"),
  );
  assert.deepEqual((await store.load()).recurringOverrides, []);
});
test("reset alternating block and rule edits persist; overlapping phases rejected", async () => {
  const m = memory(),
    store = createLocalScheduleStore(() => m.storage);
  await store.load();
  let data = await store.createRecurring(metadata);
  const id = data.recurringOverrides[0].id;
  await store.remove({ recurringId: id }, "friday-commute-out");
  data = await store.resetRecurringBlock(id, "friday-commute-out");
  assert.ok(
    scheduleForDate(data, metadata.anchorDate).some(
      (b) => b.id === "friday-commute-out",
    ),
  );
  await assert.rejects(
    store.createRecurring({ ...metadata, anchorDate: "2026-10-23" }),
  );
  await assert.rejects(
    store.createRecurring({ ...metadata, anchorDate: "2026-10-10" }),
  );
  await store.createRecurring({
    ...metadata,
    name: "Other Friday",
    anchorDate: "2026-10-16",
  });
  await assert.rejects(
    store.updateRecurring(id, { ...metadata, anchorDate: "2026-10-16" }),
  );
  await store.updateRecurring(id, { ...metadata, name: "Home Friday" });
  assert.equal((await store.load()).recurringOverrides[0].name, "Home Friday");
});
test("removing an alternating addition preserves explicit date edits", async () => {
  const m = memory(),
    store = createLocalScheduleStore(() => m.storage);
  await store.load();
  let data = await store.createRecurring(metadata);
  const id = data.recurringOverrides[0].id;
  data = await store.create({ recurringId: id }, block);
  const added = data.recurringOverrides[0].additions[0];
  await store.update({ date: metadata.anchorDate }, added.id, {
    ...block,
    title: "Date-specific work",
  });
  data = await store.removeRecurring(id);
  assert.ok(
    scheduleForDate(data, metadata.anchorDate).some(
      (b) => b.title === "Date-specific work",
    ),
  );
  assert.deepEqual(await store.load(), data);
});
test("corrupt recurring records are rejected without overwriting data", async () => {
  const rule = {
    ...metadata,
    id: "rule",
    intervalWeeks: 2,
    additions: [],
    replacements: [],
    removedIds: [],
  };
  for (const patch of [
    { intervalWeeks: 3 },
    { anchorDate: "2026-10-10" },
    { weekday: "unknown" },
    { removedIds: ["missing"] },
    { name: "" },
    { replacements: [{ ...block, id: "missing" }] },
  ]) {
    const data = createDefaultSchedule();
    data.recurringOverrides = [{ ...rule, ...patch }];
    const raw = JSON.stringify({ version: 2, schedule: data }),
      m = memory(raw);
    await assert.rejects(createLocalScheduleStore(() => m.storage).load());
    assert.equal(m.values.get(key), raw);
  }
});
