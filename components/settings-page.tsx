"use client";
import { Check, Moon, Sun } from "lucide-react";
import { accents, accentPalettes } from "@/lib/settings";
import { useSettings } from "./settings-provider";
import { Panel } from "./task-components";
export function SettingsPage() {
  const { settings, ready, busy, updateSettings, storageError } = useSettings();
  return (
    <>
      <div className="day-heading">
        <div>
          <span className="eyebrow">YOUR PERSONAL SPACE</span>
          <h1>
            Settings<span>.</span>
          </h1>
          <p>A few small choices to make Daywell feel like you.</p>
        </div>
      </div>
      <Panel title="Appearance" className="settings-panel">
        <fieldset className="appearance-fieldset" disabled={!ready || busy}>
          <legend>Theme</legend>
          <div className="theme-options">
            {(["dark", "light"] as const).map((theme) => (
              <label
                key={theme}
                className={`appearance-option ${settings.theme === theme ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={theme}
                  checked={settings.theme === theme}
                  onChange={() => void updateSettings({ theme })}
                />
                {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
                <span>{theme === "dark" ? "Dark" : "Light"}</span>
                {settings.theme === theme && <Check size={18} />}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="appearance-fieldset" disabled={!ready || busy}>
          <legend>Accent color</legend>
          <div className="accent-options">
            {accents.map((accent) => (
              <label
                key={accent}
                className={`appearance-option ${settings.accent === accent ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="accent"
                  value={accent}
                  checked={settings.accent === accent}
                  onChange={() => void updateSettings({ accent })}
                />
                <span
                  className="accent-swatch"
                  style={{
                    background: accentPalettes[accent][settings.theme].accent,
                  }}
                  aria-hidden="true"
                />
                <span className="accent-name">{accent}</span>
                {settings.accent === accent && <Check size={18} />}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="panel-footnote" role="status">
          {storageError
            ? "Changes are unavailable until appearance storage is restored."
            : !ready
              ? "Loading your appearance…"
              : busy
                ? "Saving your appearance…"
                : "Saved automatically in this browser. The sidebar theme shortcut stays in sync."}
        </p>
      </Panel>
    </>
  );
}
