import { newId } from "./ids";
import { isValidDate } from "./date-time";
import {
  createDefaultSchedule,
  scheduleForDate,
  validateBlock,
  weekdays,
  weekdayForDate,
  type ScheduleData,
  type ScheduleBlock,
  type BlockInput,
  type ScheduleScope,
  type DateOverride,
} from "./schedule";
export const SCHEDULE_STORAGE_KEY = "daywell.schedule.v1";
export interface ScheduleStore {
  load(): Promise<ScheduleData>;
  create(scope: ScheduleScope, input: BlockInput): Promise<ScheduleData>;
  update(
    scope: ScheduleScope,
    id: string,
    input: BlockInput,
  ): Promise<ScheduleData>;
  remove(scope: ScheduleScope, id: string): Promise<ScheduleData>;
  resetDate(date: string): Promise<ScheduleData>;
  subscribe(listener: () => void): () => void;
}
type StorageAccess = Pick<Storage, "getItem" | "setItem">;
function isBlock(value: unknown): value is ScheduleBlock {
  if (!value || typeof value !== "object") return false;
  const b = value as ScheduleBlock;
  return typeof b.id === "string" && !!b.id && validateBlock(b) === null;
}
function blockList(value: unknown): value is ScheduleBlock[] {
  return (
    Array.isArray(value) &&
    value.every(isBlock) &&
    new Set(value.map((b) => b.id)).size === value.length
  );
}
export function isScheduleData(value: unknown): value is ScheduleData {
  if (!value || typeof value !== "object") return false;
  const d = value as ScheduleData;
  if (
    !Array.isArray(d.routines) ||
    d.routines.length !== 7 ||
    !Array.isArray(d.overrides)
  )
    return false;
  if (
    !d.routines.every(
      (r) => r && weekdays.includes(r.weekday) && blockList(r.blocks),
    ) ||
    new Set(d.routines.map((r) => r.weekday)).size !== 7
  )
    return false;
  const ids = d.routines.flatMap((r) => r.blocks.map((b) => b.id));
  const dates: string[] = [];
  for (const o of d.overrides) {
    if (
      !o ||
      typeof o.date !== "string" ||
      !isValidDate(o.date) ||
      !blockList(o.additions) ||
      !blockList(o.replacements) ||
      !Array.isArray(o.removedIds) ||
      !o.removedIds.every((id) => typeof id === "string" && !!id) ||
      new Set(o.removedIds).size !== o.removedIds.length
    )
      return false;
    const base = d.routines.find(
      (r) => r.weekday === weekdayForDate(o.date),
    )!.blocks;
    if (
      o.replacements.some(
        (b) => !base.some((r) => r.id === b.id) || o.removedIds.includes(b.id),
      ) ||
      o.removedIds.some((id) => !base.some((b) => b.id === id))
    )
      return false;
    ids.push(...o.additions.map((b) => b.id));
    dates.push(o.date);
  }
  return (
    new Set(ids).size === ids.length && new Set(dates).size === dates.length
  );
}
export function createLocalScheduleStore(
  getStorage: () => StorageAccess = () => window.localStorage,
): ScheduleStore {
  function read(): ScheduleData | null {
    const raw = getStorage().getItem(SCHEDULE_STORAGE_KEY);
    if (raw === null) return null;
    let record: unknown;
    try {
      record = JSON.parse(raw);
    } catch {
      throw new Error(
        "Saved schedule data could not be read. It has been kept unchanged.",
      );
    }
    if (
      !record ||
      typeof record !== "object" ||
      (record as { version?: unknown }).version !== 1 ||
      !isScheduleData((record as { schedule?: unknown }).schedule)
    )
      throw new Error(
        "Saved schedule data is invalid or uses an unsupported version. It has been kept unchanged.",
      );
    return (record as { schedule: ScheduleData }).schedule;
  }
  function write(data: ScheduleData): ScheduleData {
    getStorage().setItem(
      SCHEDULE_STORAGE_KEY,
      JSON.stringify({ version: 1, schedule: data }),
    );
    return data;
  }
  function loaded(): ScheduleData {
    const d = read();
    if (!d) throw new Error("Reload the schedule before making changes.");
    return d;
  }
  function fields(input: BlockInput): BlockInput {
    const error = validateBlock(input);
    if (error) throw new Error(error);
    return {
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
    };
  }
  function validScope(scope: ScheduleScope) {
    if (
      scope.date ? !isValidDate(scope.date) : !weekdays.includes(scope.weekday!)
    )
      throw new Error("Choose a valid weekday or date.");
  }
  function override(data: ScheduleData, date: string): DateOverride {
    let o = data.overrides.find((o) => o.date === date);
    if (!o) {
      o = { date, additions: [], replacements: [], removedIds: [] };
      data.overrides.push(o);
    }
    return o;
  }
  function mutate(
    scope: ScheduleScope,
    id: string,
    input: BlockInput | null,
  ): ScheduleData {
    validScope(scope);
    const data = loaded();
    const blocks = scope.date
      ? scheduleForDate(data, scope.date)
      : data.routines.find((r) => r.weekday === scope.weekday)!.blocks;
    if (!blocks.some((b) => b.id === id))
      throw new Error("This block no longer exists. Reload the schedule.");
    if (scope.date) {
      const o = override(data, scope.date);
      if (o.additions.some((b) => b.id === id))
        o.additions = o.additions.flatMap((b) =>
          b.id === id ? (input ? { ...input, id } : []) : b,
        );
      else {
        o.replacements = o.replacements.filter((b) => b.id !== id);
        if (input) o.replacements.push({ ...input, id });
        else o.removedIds.push(id);
      }
      data.overrides = data.overrides.filter(
        (o) =>
          o.additions.length || o.replacements.length || o.removedIds.length,
      );
    } else {
      const routine = data.routines.find((r) => r.weekday === scope.weekday)!;
      routine.blocks = routine.blocks.flatMap((b) =>
        b.id === id ? (input ? { ...input, id } : []) : b,
      );
      if (!input)
        for (const o of data.overrides) {
          o.replacements = o.replacements.filter((b) => b.id !== id);
          o.removedIds = o.removedIds.filter((removed) => removed !== id);
        }
      data.overrides = data.overrides.filter(
        (o) =>
          o.additions.length || o.replacements.length || o.removedIds.length,
      );
    }
    return write(data);
  }
  return {
    async load() {
      return read() ?? write(createDefaultSchedule());
    },
    async create(scope, input) {
      validScope(scope);
      const block = { ...fields(input), id: newId() },
        data = loaded();
      if (scope.date) override(data, scope.date).additions.push(block);
      else
        data.routines
          .find((r) => r.weekday === scope.weekday)!
          .blocks.push(block);
      return write(data);
    },
    async update(scope, id, input) {
      return mutate(scope, id, fields(input));
    },
    async remove(scope, id) {
      return mutate(scope, id, null);
    },
    async resetDate(date) {
      if (!isValidDate(date)) throw new Error("Choose a valid date.");
      const data = loaded();
      data.overrides = data.overrides.filter((o) => o.date !== date);
      return write(data);
    },
    subscribe(listener) {
      if (typeof window === "undefined") return () => {};
      const onStorage = (event: StorageEvent) => {
        if (
          (event.key === SCHEDULE_STORAGE_KEY || event.key === null) &&
          event.storageArea === window.localStorage
        )
          listener();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
  };
}
