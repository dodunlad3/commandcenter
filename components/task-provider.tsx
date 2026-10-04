"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createLocalTaskStore } from "@/lib/task-store";
import { localDate, type Task, type TaskInput } from "@/lib/tasks";
export type TaskDialog =
  { mode: "create" } | { mode: "details" | "edit"; id: string } | null;
type DayState = {
  tasks: Task[];
  ready: boolean;
  storageError: string;
  now: Date | null;
  energy: string;
  setEnergy: (value: string) => void;
  capture: () => void;
  openTask: (id: string) => void;
  dialog: TaskDialog;
  setDialog: (dialog: TaskDialog) => void;
  createTask: (input: TaskInput) => Promise<boolean>;
  updateTask: (id: string, input: TaskInput) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  toggle: (id: string) => Promise<boolean>;
  reload: () => Promise<void>;
};
const DayContext = createContext<DayState | null>(null);
export function useDay() {
  const day = useContext(DayContext);
  if (!day) throw new Error("Day provider missing");
  return day;
}
function errorMessage(error: unknown) {
  return error instanceof Error && error.name === "Error"
    ? error.message
    : "Your tasks could not be saved or loaded. Check browser storage and try again.";
}
export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createLocalTaskStore());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [energy, setEnergy] = useState("Normal");
  const [dialog, setDialog] = useState<TaskDialog>(null);
  const reload = useCallback(async () => {
    try {
      const saved = await store.load(localDate());
      setTasks(saved);
      setReady(true);
      setStorageError("");
    } catch (error) {
      setStorageError(errorMessage(error));
    }
  }, [store]);
  useEffect(() => {
    let active = true;
    store
      .load(localDate())
      .then((saved) => {
        if (active) {
          setTasks(saved);
          setReady(true);
        }
      })
      .catch((error) => {
        if (active) setStorageError(errorMessage(error));
      });
    const tick = () => setNow(new Date());
    tick();
    const timer = setInterval(tick, 30000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    const unsubscribe = store.subscribe(() => {
      void reload();
    });
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
      unsubscribe();
    };
  }, [store, reload]);
  async function change(action: () => Promise<Task[]>): Promise<boolean> {
    if (!ready) return false;
    try {
      const saved = await action();
      setTasks(saved);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(errorMessage(error));
      return false;
    }
  }
  return (
    <DayContext.Provider
      value={{
        tasks,
        ready,
        storageError,
        now,
        energy,
        setEnergy,
        dialog,
        setDialog,
        capture: () => setDialog({ mode: "create" }),
        openTask: (id) => setDialog({ mode: "details", id }),
        createTask: (input) => change(() => store.create(input)),
        updateTask: (id, input) => change(() => store.update(id, input)),
        deleteTask: (id) => change(() => store.remove(id)),
        toggle: (id) => change(() => store.toggle(id)),
        reload,
      }}
    >
      {children}
    </DayContext.Provider>
  );
}
