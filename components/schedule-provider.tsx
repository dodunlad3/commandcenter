"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createLocalScheduleStore } from "@/lib/schedule-store";
import {
  type ScheduleData,
  type ScheduleScope,
  type BlockInput,
} from "@/lib/schedule";
export type ScheduleDialog = { scope: ScheduleScope; id?: string } | null;
type ScheduleState = {
  data: ScheduleData;
  ready: boolean;
  storageError: string;
  dialog: ScheduleDialog;
  openBlock: (scope: ScheduleScope, id?: string) => void;
  closeDialog: () => void;
  createBlock: (scope: ScheduleScope, input: BlockInput) => Promise<boolean>;
  updateBlock: (
    scope: ScheduleScope,
    id: string,
    input: BlockInput,
  ) => Promise<boolean>;
  deleteBlock: (scope: ScheduleScope, id: string) => Promise<boolean>;
  resetDate: (date: string) => Promise<boolean>;
  reload: () => Promise<void>;
};
const ScheduleContext = createContext<ScheduleState | null>(null);
export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) throw new Error("Schedule provider missing");
  return context;
}
function errorMessage(error: unknown) {
  return error instanceof Error && error.name === "Error"
    ? error.message
    : "Your schedule could not be saved or loaded. Check browser storage and try again.";
}
export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createLocalScheduleStore());
  const [data, setData] = useState<ScheduleData>({
    routines: [],
    overrides: [],
  });
  const [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState(""),
    [dialog, setDialog] = useState<ScheduleDialog>(null);
  const reload = useCallback(async () => {
    try {
      setData(await store.load());
      setReady(true);
      setStorageError("");
    } catch (error) {
      setStorageError(errorMessage(error));
    }
  }, [store]);
  useEffect(() => {
    let active = true;
    store
      .load()
      .then((saved) => {
        if (active) {
          setData(saved);
          setReady(true);
        }
      })
      .catch((error) => {
        if (active) setStorageError(errorMessage(error));
      });
    const unsubscribe = store.subscribe(() => void reload());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [store, reload]);
  async function change(action: () => Promise<ScheduleData>) {
    if (!ready) return false;
    try {
      setData(await action());
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(errorMessage(error));
      return false;
    }
  }
  return (
    <ScheduleContext.Provider
      value={{
        data,
        ready,
        storageError,
        dialog,
        openBlock: (scope, id) => setDialog({ scope, id }),
        closeDialog: () => setDialog(null),
        reload,
        createBlock: (scope, input) => change(() => store.create(scope, input)),
        updateBlock: (scope, id, input) =>
          change(() => store.update(scope, id, input)),
        deleteBlock: (scope, id) => change(() => store.remove(scope, id)),
        resetDate: (date) => change(() => store.resetDate(date)),
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}
