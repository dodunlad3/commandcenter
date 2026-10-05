import {
  accents,
  themes,
  defaultSettings,
  isSettings,
  type DaywellSettings,
} from "./settings";
export const SETTINGS_STORAGE_KEY = "daywell.settings.v1";
type StorageAccess = Pick<Storage, "getItem" | "setItem">;
export interface SettingsStore {
  load(): Promise<DaywellSettings>;
  update(patch: Partial<DaywellSettings>): Promise<DaywellSettings>;
  subscribe(listener: () => void): () => void;
}
export function createLocalSettingsStore(
  getStorage: () => StorageAccess = () => window.localStorage,
): SettingsStore {
  function read(): DaywellSettings | null {
    const raw = getStorage().getItem(SETTINGS_STORAGE_KEY);
    if (raw === null) return null;
    let envelope: unknown;
    try {
      envelope = JSON.parse(raw);
    } catch {
      throw new Error(
        "Saved appearance settings could not be read. They have been kept unchanged.",
      );
    }
    if (
      !envelope ||
      typeof envelope !== "object" ||
      (envelope as { version?: unknown }).version !== 1 ||
      !isSettings((envelope as { settings?: unknown }).settings)
    )
      throw new Error(
        "Saved appearance settings are invalid or use an unsupported version. They have been kept unchanged.",
      );
    return (envelope as { settings: DaywellSettings }).settings;
  }
  function write(settings: DaywellSettings) {
    getStorage().setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 1, settings }),
    );
    return settings;
  }
  return {
    async load() {
      return read() ?? write({ ...defaultSettings });
    },
    async update(patch) {
      const settings = { ...(read() ?? defaultSettings), ...patch };
      if (!isSettings(settings))
        throw new Error("Choose a valid theme and accent color.");
      return write(settings);
    },
    subscribe(listener) {
      if (typeof window === "undefined") return () => {};
      const onStorage = (event: StorageEvent) => {
        if (
          (event.key === SETTINGS_STORAGE_KEY || event.key === null) &&
          event.storageArea === window.localStorage
        )
          listener();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
  };
}
export function applyAppearance(settings: DaywellSettings) {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.accent = settings.accent;
  document.documentElement.style.colorScheme = settings.theme;
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      settings.theme === "light" ? "#f3f5f1" : "#101613",
    );
}
// Self-contained, read-only bootstrap runs in the head before the app can paint.
// Store access stays here; the React provider subsequently loads the same validated record.
function bootstrap(
  key: string,
  validThemes: readonly string[],
  validAccents: readonly string[],
) {
  let theme = "dark",
    accent = "green";
  try {
    const record = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (
      record?.version === 1 &&
      validThemes.includes(record.settings?.theme) &&
      validAccents.includes(record.settings?.accent)
    ) {
      theme = record.settings.theme;
      accent = record.settings.accent;
    }
  } catch {}
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.accent = accent;
  document.documentElement.style.colorScheme = theme;
}
export const settingsBootstrapScript = `(${bootstrap.toString()})(${JSON.stringify(SETTINGS_STORAGE_KEY)},${JSON.stringify(themes)},${JSON.stringify(accents)});`;
