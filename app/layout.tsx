import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TaskProvider } from "@/components/task-provider";
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
    <html lang="en">
      <body>
        <TaskProvider>
          <AppShell>{children}</AppShell>
        </TaskProvider>
      </body>
    </html>
  );
}
