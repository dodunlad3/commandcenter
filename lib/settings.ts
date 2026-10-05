export const themes = ["dark", "light"] as const;
export const accents = [
  "green",
  "blue",
  "purple",
  "red",
  "orange",
  "yellow",
] as const;
export type DaywellSettings = {
  theme: (typeof themes)[number];
  accent: (typeof accents)[number];
};
export const defaultSettings: DaywellSettings = {
  theme: "dark",
  accent: "green",
};
export function isSettings(value: unknown): value is DaywellSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as DaywellSettings;
  return themes.includes(settings.theme) && accents.includes(settings.accent);
}
type Colors = { accent: string; hover: string; foreground: string };
export const accentPalettes: Record<
  DaywellSettings["accent"],
  Record<DaywellSettings["theme"], Colors>
> = {
  green: {
    dark: { accent: "#c4ed98", hover: "#d3f4b0", foreground: "#1c2a15" },
    light: { accent: "#476f2b", hover: "#42672a", foreground: "#ffffff" },
  },
  blue: {
    dark: { accent: "#a6c7f5", hover: "#bfd7fa", foreground: "#172a43" },
    light: { accent: "#2457a6", hover: "#1e478c", foreground: "#ffffff" },
  },
  purple: {
    dark: { accent: "#d1b3f2", hover: "#e0c9f8", foreground: "#30203f" },
    light: { accent: "#7546a5", hover: "#63388f", foreground: "#ffffff" },
  },
  red: {
    dark: { accent: "#f3a7a1", hover: "#f8beb9", foreground: "#401f1c" },
    light: { accent: "#b13240", hover: "#982837", foreground: "#ffffff" },
  },
  orange: {
    dark: { accent: "#efbe8d", hover: "#f7cea6", foreground: "#3d2915" },
    light: { accent: "#a14a17", hover: "#873b13", foreground: "#ffffff" },
  },
  yellow: {
    dark: { accent: "#efd474", hover: "#f5e099", foreground: "#352b10" },
    light: { accent: "#805d0d", hover: "#6b4c0a", foreground: "#ffffff" },
  },
};
function tokens(colors: Colors): string {
  return `--accent:${colors.accent};--accent-hover:${colors.hover};--accent-foreground:${colors.foreground};`;
}
export const appearanceCss =
  `:root{${tokens(accentPalettes.green.dark)}}` +
  accents
    .map(
      (accent) =>
        `:root[data-accent="${accent}"]{${tokens(accentPalettes[accent].dark)}}:root[data-theme="light"][data-accent="${accent}"]{${tokens(accentPalettes[accent].light)}}`,
    )
    .join("");
