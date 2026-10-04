"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useDay } from "./task-provider";
import { TaskDialogs } from "./task-dialogs";
import {
  LayoutDashboard,
  CheckCheck,
  BriefcaseBusiness,
  Dumbbell,
  Clapperboard,
  Layers,
  Wallet,
  House,
  BookOpen,
  Plus,
  Moon,
  Sun,
  Menu,
  Sparkles,
} from "lucide-react";
import { navigation } from "@/lib/tasks";
const icons = [
  LayoutDashboard,
  CheckCheck,
  BriefcaseBusiness,
  Dumbbell,
  Clapperboard,
  Layers,
  Wallet,
  House,
  BookOpen,
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { capture, ready, storageError, reload } = useDay();
  const [light, setLight] = useState(false);
  const [menu, setMenu] = useState(false);
  return (
    <div className={`app ${light ? "light" : ""}`}>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-mark">d.</span>daywell
          <span className="brand-dot">•</span>
        </Link>
        <div className="nav-label">YOUR SPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((label, i) => {
            const href = i === 0 ? "/" : `/${label.toLowerCase()}`;
            const Icon = icons[i];
            return (
              <Link
                key={label}
                href={href}
                aria-current={path === href ? "page" : undefined}
                onClick={() => setMenu(false)}
                className={`nav-link ${path === href ? "active" : ""}`}
              >
                <Icon size={20} />
                {label}
                {path === href && <span className="active-dot" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="space-note">
            <Sparkles size={18} />
            <p>
              A little structure.
              <br />
              <strong>A lot more space.</strong>
            </p>
          </div>
          <button
            className="profile"
            onClick={() => setLight(!light)}
            aria-label={`Switch to ${light ? "dark" : "light"} mode`}
          >
            <span className="avatar">YO</span>
            <span>
              Your personal space
              <small>{light ? "Light" : "Dark"} mode</small>
            </span>
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={22} />
            </button>
            <span>My space</span>
            <span className="slash">/</span>
            <strong>
              {path === "/"
                ? "Today"
                : navigation.find((n) => `/${n.toLowerCase()}` === path) ||
                  "Page"}
            </strong>
          </div>
          <div className="top-actions">
            <span className="local-label">PERSONAL COMMAND CENTER</span>
            <button
              className="capture-button"
              onClick={capture}
              disabled={!ready}
            >
              <Plus size={19} />
              <span>Quick capture</span>
            </button>
          </div>
        </header>
        <main>
          {storageError && (
            <div className="storage-error" role="alert">
              <p>{storageError}</p>
              <button className="outline-button" onClick={() => void reload()}>
                Reload tasks
              </button>
            </div>
          )}
          {children}
        </main>
        <footer className="page-footer">
          <span>Make room for what matters.</span>
          <span>DAYWELL / V.01</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[0, 1, 5].map((i) => {
          const label = navigation[i];
          const Icon = icons[i];
          const href = i === 0 ? "/" : `/${label.toLowerCase()}`;
          return (
            <Link
              key={label}
              href={href}
              aria-current={path === href ? "page" : undefined}
              className={path === href ? "active" : ""}
            >
              <Icon size={21} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button onClick={() => setMenu(true)}>
          <Menu size={21} />
          <span>More</span>
        </button>
      </nav>
      <TaskDialogs />
    </div>
  );
}
