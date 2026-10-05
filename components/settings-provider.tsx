"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  createLocalSettingsStore,
  applyAppearance,
} from "@/lib/settings-store";
import { defaultSettings, type DaywellSettings } from "@/lib/settings";
type SettingsState = {
  settings: DaywellSettings;
  ready: boolean;
  busy: boolean;
  storageError: string;
  updateSettings: (patch: Partial<DaywellSettings>) => Promise<void>;
  reload: () => Promise<void>;
};
const SettingsContext = createContext<SettingsState | null>(null);
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("Settings provider missing");
  return context;
}
function message(error: unknown) {
  return error instanceof Error && error.name === "Error"
    ? error.message
    : "Appearance settings could not be saved. Check browser storage and try again.";
}
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createLocalSettingsStore());
  const [settings, setSettings] = useState(defaultSettings),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [storageError, setStorageError] = useState("");
  const reload = useCallback(async () => {
    try {
      const saved = await store.load();
      applyAppearance(saved);
      setSettings(saved);
      setReady(true);
      setStorageError("");
    } catch (error) {
      setStorageError(message(error));
    }
  }, [store]);
  useEffect(() => {
    let active = true;
    store
      .load()
      .then((saved) => {
        if (active) {
          applyAppearance(saved);
          setSettings(saved);
          setReady(true);
        }
      })
      .catch((error) => {
        if (active) setStorageError(message(error));
      });
    const unsubscribe = store.subscribe(() => void reload());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [store, reload]);
  async function updateSettings(patch: Partial<DaywellSettings>) {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const saved = await store.update(patch);
      applyAppearance(saved);
      setSettings(saved);
      setStorageError("");
    } catch (error) {
      setStorageError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <SettingsContext.Provider
      value={{ settings, ready, busy, storageError, updateSettings, reload }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
