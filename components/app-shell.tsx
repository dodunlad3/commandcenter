"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
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
  X,
  Menu,
  Sparkles,
} from "lucide-react";
import {
  categories,
  createMockTasks,
  localDate,
  navigation,
  type Task,
  type Category,
} from "@/lib/tasks";
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
type DayState = {
  tasks: Task[];
  now: Date | null;
  toggle: (id: string) => void;
  capture: () => void;
  energy: string;
  setEnergy: (value: string) => void;
};
const DayContext = createContext<DayState | null>(null);
export function useDay() {
  const day = useContext(DayContext);
  if (!day) throw new Error("Day provider missing");
  return day;
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  const [now, setNow] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [energy, setEnergy] = useState("Normal");
  const [light, setLight] = useState(false);
  const [capture, setCapture] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let date = "";
    const tick = () => {
      const time = new Date();
      setNow(time);
      if (localDate(time) !== date) {
        date = localDate(time);
        setTasks(createMockTasks(date));
      }
    };
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (capture) {
      dialogRef.current?.showModal();
      dialogRef.current
        ?.querySelector<HTMLInputElement>('input[name="title"]')
        ?.focus();
    }
  }, [capture]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title")).trim();
    if (!title) return;
    setTasks((old) => [
      ...old,
      {
        id: crypto.randomUUID(),
        title,
        description: String(data.get("description")).trim(),
        category: data.get("category") as Category,
        priority: data.get("priority") as Task["priority"],
        completed: false,
        scheduledDate: localDate(),
        scheduledTime: String(data.get("time")) || null,
        estimatedMinutes: Number(data.get("duration")),
        recurring: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setCapture(false);
    setNotice("Captured. A little less on your mind.");
  }
  return (
    <DayContext.Provider
      value={{
        tasks,
        now,
        toggle: (id) =>
          setTasks((old) =>
            old.map((t) =>
              t.id === id ? { ...t, completed: !t.completed } : t,
            ),
          ),
        capture: () => setCapture(true),
        energy,
        setEnergy,
      }}
    >
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
                onClick={() => setCapture(true)}
              >
                <Plus size={19} />
                <span>Quick capture</span>
              </button>
            </div>
          </header>
          <main>{children}</main>
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
        {capture && (
          <div className="modal-backdrop" onClick={() => setCapture(false)}>
            <dialog
              ref={dialogRef}
              className="capture-dialog"
              aria-labelledby="capture-title"
              onClick={(e) => e.stopPropagation()}
              onCancel={() => setCapture(false)}
            >
              <div className="dialog-heading">
                <div>
                  <span className="eyebrow">GET IT OFF YOUR MIND</span>
                  <h2 id="capture-title">Quick capture</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close capture"
                  onClick={() => setCapture(false)}
                >
                  <X />
                </button>
              </div>
              <form onSubmit={addTask}>
                <label>
                  What needs doing?
                  <input
                    name="title"
                    required
                    maxLength={160}
                    autoFocus
                    placeholder="Give it a name…"
                  />
                </label>
                <label>
                  A little context
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="Optional details"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Category
                    <select name="category" defaultValue="personal">
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Priority
                    <select name="priority" defaultValue="medium">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </label>
                  <label>
                    Today at
                    <input name="time" type="time" />
                  </label>
                  <label>
                    Minutes
                    <input
                      name="duration"
                      type="number"
                      min="1"
                      max="1440"
                      defaultValue="25"
                      required
                    />
                  </label>
                </div>
                <p className="form-note">
                  Added to today. Mock data resets when you refresh.
                </p>
                <button type="submit" className="primary-button">
                  Capture task <Plus size={18} />
                </button>
              </form>
            </dialog>
          </div>
        )}
        <div className="toast" role="status" aria-live="polite">
          {notice}
        </div>
      </div>
    </DayContext.Provider>
  );
}
