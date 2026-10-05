import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TaskProvider } from "@/components/task-provider";
import { ScheduleProvider } from "@/components/schedule-provider";
import { SettingsProvider } from "@/components/settings-provider";
import { appearanceCss } from "@/lib/settings";
import { settingsBootstrapScript } from "@/lib/settings-store";
import { AppShell } from "@/components/app-shell";
export const metadata: Metadata = {
  title: "Daywell · Your personal command center",
  description: "A little clarity for everything in your day.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Daywell",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111715",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: appearanceCss }} />
        <script dangerouslySetInnerHTML={{ __html: settingsBootstrapScript }} />
      </head>
      <body>
        <SettingsProvider>
          <TaskProvider>
            <ScheduleProvider>
              <AppShell>{children}</AppShell>
            </ScheduleProvider>
          </TaskProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
