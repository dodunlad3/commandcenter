import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  createLocalSettingsStore,
  settingsBootstrapScript,
  SETTINGS_STORAGE_KEY,
} from "../.task-tests/settings-store.js";
import { accentPalettes } from "../.task-tests/settings.js";
function memory(initial = null) {
  let raw = initial,
    writes = 0;
  return {
    storage: {
      getItem: () => raw,
      setItem: (k, v) => {
        assert.equal(k, SETTINGS_STORAGE_KEY);
        raw = v;
        writes++;
      },
    },
    raw: () => raw,
    writes: () => writes,
  };
}
test("settings constructor is SSR safe; defaults seed once and both preferences persist", async () => {
  assert.doesNotThrow(() => createLocalSettingsStore());
  const m = memory(),
    store = createLocalSettingsStore(() => m.storage);
  assert.deepEqual(await store.load(), { theme: "dark", accent: "green" });
  await store.load();
  assert.equal(m.writes(), 1);
  await store.update({ theme: "light" });
  await store.update({ accent: "yellow" });
  assert.deepEqual(await createLocalSettingsStore(() => m.storage).load(), {
    theme: "light",
    accent: "yellow",
  });
});
test("corrupt settings and failed writes preserve saved preferences", async () => {
  for (const raw of [
    "bad",
    JSON.stringify({
      version: 2,
      settings: { theme: "dark", accent: "green" },
    }),
    JSON.stringify({
      version: 1,
      settings: { theme: "dark", accent: "invalid" },
    }),
  ]) {
    const m = memory(raw),
      store = createLocalSettingsStore(() => m.storage);
    await assert.rejects(store.load());
    await assert.rejects(store.update({ theme: "light" }));
    assert.equal(m.raw(), raw);
  }
  const m = memory();
  await createLocalSettingsStore(() => m.storage).load();
  const raw = m.raw();
  await assert.rejects(
    createLocalSettingsStore(() => ({
      getItem: m.storage.getItem,
      setItem: () => {
        throw Error("quota");
      },
    })).update({ accent: "blue" }),
  );
  assert.equal(m.raw(), raw);
});
test("prepaint bootstrap validates saved appearance and never writes storage", () => {
  for (const [raw, expected] of [
    [
      JSON.stringify({
        version: 1,
        settings: { theme: "light", accent: "yellow" },
      }),
      { theme: "light", accent: "yellow" },
    ],
    ["broken", { theme: "dark", accent: "green" }],
    [
      JSON.stringify({
        version: 1,
        settings: { theme: "light", accent: "invalid" },
      }),
      { theme: "dark", accent: "green" },
    ],
  ]) {
    const root = { dataset: {}, style: {} };
    vm.runInNewContext(settingsBootstrapScript, {
      window: {
        localStorage: {
          getItem: () => raw,
          setItem: () => assert.fail("bootstrap must not write"),
        },
      },
      document: { documentElement: root },
    });
    assert.deepEqual(root.dataset, expected);
    assert.equal(root.style.colorScheme, expected.theme);
  }
});
function rgb(hex) {
  return hex.match(/[a-f\d]{2}/gi).map((v) => parseInt(v, 16) / 255);
}
function luminance(channels) {
  return channels
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
test("all six palettes meet normal-text contrast on primary buttons, hover and accent highlights", () => {
  for (const [name, palettes] of Object.entries(accentPalettes))
    for (const [theme, p] of Object.entries(palettes)) {
      const accent = rgb(p.accent),
        surface = rgb(theme === "dark" ? "#19211c" : "#ffffff");
      for (const color of [p.accent, p.hover])
        assert.ok(
          contrast(rgb(color), rgb(p.foreground)) >= 4.5,
          `${name} ${theme} button`,
        );
      assert.ok(contrast(accent, surface) >= 4.5, `${name} ${theme} text`);
      assert.ok(
        contrast(
          accent,
          surface.map((v, i) => v * 0.92 + accent[i] * 0.08),
        ) >= 4.5,
        `${name} ${theme} soft highlight`,
      );
    }
});
