import { newId } from "./ids";
import { isValidDate } from "./date-time";
import {
  createDefaultSchedule,
  blocksForScope,
  validateBlock,
  validateRecurring,
  weekdays,
  weekdayForDate,
  matchesRecurring,
  type ScheduleData,
  type ScheduleBlock,
  type BlockInput,
  type ScheduleScope,
  type DateOverride,
  type RecurringInput,
} from "./schedule";
// Keep the existing key so users remain on the same collection; migrate the envelope to version 2.
export const SCHEDULE_STORAGE_KEY = "daywell.schedule.v1";
export const SCHEDULE_BACKUP_KEY = "daywell.schedule.backup.v1";
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
  createRecurring(input: RecurringInput): Promise<ScheduleData>;
  updateRecurring(id: string, input: RecurringInput): Promise<ScheduleData>;
  removeRecurring(id: string): Promise<ScheduleData>;
  resetRecurringBlock(id: string, blockId: string): Promise<ScheduleData>;
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
function isPatch(value: unknown): value is Omit<DateOverride, "date"> {
  if (!value || typeof value !== "object") return false;
  const p = value as DateOverride;
  return (
    blockList(p.additions) &&
    blockList(p.replacements) &&
    Array.isArray(p.removedIds) &&
    p.removedIds.every((id) => typeof id === "string" && !!id) &&
    new Set(p.removedIds).size === p.removedIds.length &&
    p.replacements.every((b) => !p.removedIds.includes(b.id))
  );
}
function referencesValid(
  p: Omit<DateOverride, "date">,
  ids: string[],
): boolean {
  return (
    p.replacements.every((b) => ids.includes(b.id)) &&
    p.removedIds.every((id) => ids.includes(id))
  );
}
export function isScheduleData(value: unknown): value is ScheduleData {
  if (!value || typeof value !== "object") return false;
  const d = value as ScheduleData;
  if (
    !Array.isArray(d.routines) ||
    d.routines.length !== 7 ||
    !Array.isArray(d.overrides) ||
    !Array.isArray(d.recurringOverrides)
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
  const ruleIds: string[] = [];
  for (const rule of d.recurringOverrides) {
    if (
      !rule ||
      typeof rule.id !== "string" ||
      !rule.id ||
      rule.intervalWeeks !== 2 ||
      validateRecurring(rule) !== null ||
      !isPatch(rule)
    )
      return false;
    const baseIds = d.routines
      .find((r) => r.weekday === rule.weekday)!
      .blocks.map((b) => b.id);
    if (!referencesValid(rule, baseIds)) return false;
    ids.push(...rule.additions.map((b) => b.id));
    ruleIds.push(rule.id);
  }
  if (new Set(ruleIds).size !== ruleIds.length) return false;
  // Two phases per weekday are possible; overlapping rules in one phase would be ambiguous.
  if (
    d.recurringOverrides.some((rule, i) =>
      d.recurringOverrides
        .slice(i + 1)
        .some((other) => matchesRecurring(rule, other.anchorDate)),
    )
  )
    return false;
  const dates: string[] = [];
  for (const o of d.overrides) {
    if (!o || typeof o.date !== "string" || !isValidDate(o.date) || !isPatch(o))
      return false;
    const weekday = weekdayForDate(o.date);
    const allowedIds = [
      ...d.routines.find((r) => r.weekday === weekday)!.blocks.map((b) => b.id),
      ...d.recurringOverrides
        .filter((r) => r.weekday === weekday)
        .flatMap((r) => r.additions.map((b) => b.id)),
    ];
    if (!referencesValid(o, allowedIds)) return false;
    ids.push(...o.additions.map((b) => b.id));
    dates.push(o.date);
  }
  return (
    new Set(ids).size === ids.length && new Set(dates).size === dates.length
  );
}
function migrateLegacy(value: unknown): ScheduleData | null {
  if (!value || typeof value !== "object") return null;
  const old = value as ScheduleData;
  if (
    old.recurringOverrides !== undefined &&
    (!Array.isArray(old.recurringOverrides) || old.recurringOverrides.length)
  )
    return null;
  const migrated = {
    routines: old.routines,
    overrides: old.overrides,
    recurringOverrides: [],
  };
  return isScheduleData(migrated) ? migrated : null;
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
    if (record && typeof record === "object") {
      const envelope = record as { version?: unknown; schedule?: unknown };
      if (envelope.version === 2 && isScheduleData(envelope.schedule))
        return envelope.schedule;
      if (envelope.version === 1) {
        const migrated = migrateLegacy(envelope.schedule);
        if (migrated) {
          // Keep the exact v1 record before attempting a write. If either write fails, v1 stays intact.
          if (getStorage().getItem(SCHEDULE_BACKUP_KEY) === null)
            getStorage().setItem(SCHEDULE_BACKUP_KEY, raw);
          return write(migrated);
        }
      }
    }
    throw new Error(
      "Saved schedule data is invalid or uses an unsupported version. It has been kept unchanged.",
    );
  }
  function write(data: ScheduleData): ScheduleData {
    getStorage().setItem(
      SCHEDULE_STORAGE_KEY,
      JSON.stringify({ version: 2, schedule: data }),
    );
    return data;
  }
  function loaded(): ScheduleData {
    const data = read();
    if (!data) throw new Error("Reload the schedule before making changes.");
    return data;
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
  function recurringFields(
    input: RecurringInput,
    data: ScheduleData,
    id?: string,
  ): RecurringInput {
    const error = validateRecurring(input);
    if (error) throw new Error(error);
    const candidate = {
      ...input,
      id: "candidate",
      intervalWeeks: 2 as const,
      additions: [],
      replacements: [],
      removedIds: [],
    };
    if (
      data.recurringOverrides.some(
        (r) => r.id !== id && matchesRecurring(r, candidate.anchorDate),
      )
    )
      throw new Error(
        "An alternating routine already covers this weekday and cycle. Edit that routine or choose the other week.",
      );
    return { ...input, name: input.name.trim() };
  }
  function validScope(scope: ScheduleScope, data: ScheduleData) {
    if (scope.recurringId) {
      if (!data.recurringOverrides.some((r) => r.id === scope.recurringId))
        throw new Error(
          "This alternating routine no longer exists. Reload the schedule.",
        );
    } else if (
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
  function patchForScope(data: ScheduleData, scope: ScheduleScope) {
    return scope.date
      ? override(data, scope.date)
      : data.recurringOverrides.find((r) => r.id === scope.recurringId)!;
  }
  function pruneDatePatches(
    data: ScheduleData,
    ids: string[],
    preserveEdits = false,
  ) {
    for (const o of data.overrides) {
      if (preserveEdits)
        o.additions.push(
          ...o.replacements
            .filter((b) => ids.includes(b.id))
            .map((b) => ({ ...b, id: newId() })),
        );
      o.replacements = o.replacements.filter((b) => !ids.includes(b.id));
      o.removedIds = o.removedIds.filter((id) => !ids.includes(id));
    }
    data.overrides = data.overrides.filter(
      (o) => o.additions.length || o.replacements.length || o.removedIds.length,
    );
  }
  function mutate(
    scope: ScheduleScope,
    id: string,
    input: BlockInput | null,
  ): ScheduleData {
    const data = loaded();
    validScope(scope, data);
    const recurringBase = scope.recurringId
      ? data.routines.find(
          (r) =>
            r.weekday ===
            data.recurringOverrides.find(
              (rule) => rule.id === scope.recurringId,
            )!.weekday,
        )!.blocks
      : [];
    if (
      !blocksForScope(data, scope).some((b) => b.id === id) &&
      !(input && recurringBase.some((b) => b.id === id))
    )
      throw new Error("This block no longer exists. Reload the schedule.");
    if (scope.date || scope.recurringId) {
      const p = patchForScope(data, scope);
      if (p.additions.some((b) => b.id === id)) {
        p.additions = p.additions.flatMap((b) =>
          b.id === id ? (input ? { ...input, id } : []) : b,
        );
        if (!input && scope.recurringId) pruneDatePatches(data, [id], true);
      } else {
        p.replacements = p.replacements.filter((b) => b.id !== id);
        if (input)
          p.removedIds = p.removedIds.filter((removed) => removed !== id);
        if (input) p.replacements.push({ ...input, id });
        else p.removedIds.push(id);
      }
    } else {
      const routine = data.routines.find((r) => r.weekday === scope.weekday)!;
      routine.blocks = routine.blocks.flatMap((b) =>
        b.id === id ? (input ? { ...input, id } : []) : b,
      );
      if (!input) {
        pruneDatePatches(data, [id]);
        for (const rule of data.recurringOverrides) {
          rule.replacements = rule.replacements.filter((b) => b.id !== id);
          rule.removedIds = rule.removedIds.filter((removed) => removed !== id);
        }
      }
    }
    data.overrides = data.overrides.filter(
      (o) => o.additions.length || o.replacements.length || o.removedIds.length,
    );
    return write(data);
  }
  return {
    async load() {
      return read() ?? write(createDefaultSchedule());
    },
    async create(scope, input) {
      const data = loaded();
      validScope(scope, data);
      const block = { ...fields(input), id: newId() };
      if (scope.date || scope.recurringId)
        patchForScope(data, scope).additions.push(block);
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
    async createRecurring(input) {
      const data = loaded(),
        clean = recurringFields(input, data);
      data.recurringOverrides.push({
        ...clean,
        id: newId(),
        intervalWeeks: 2,
        additions: [],
        replacements: [],
        removedIds: [],
      });
      return write(data);
    },
    async updateRecurring(id, input) {
      const data = loaded(),
        rule = data.recurringOverrides.find((r) => r.id === id);
      if (!rule) throw new Error("This alternating routine no longer exists.");
      const clean = recurringFields(input, data, id);
      if (clean.weekday !== rule.weekday)
        throw new Error(
          "Keep the weekday of an existing routine. Create another routine to use a different weekday.",
        );
      Object.assign(rule, clean);
      return write(data);
    },
    async removeRecurring(id) {
      const data = loaded(),
        rule = data.recurringOverrides.find((r) => r.id === id);
      if (!rule) throw new Error("This alternating routine no longer exists.");
      pruneDatePatches(
        data,
        rule.additions.map((b) => b.id),
        true,
      );
      data.recurringOverrides = data.recurringOverrides.filter(
        (r) => r.id !== id,
      );
      return write(data);
    },
    async resetRecurringBlock(id, blockId) {
      const data = loaded(),
        rule = data.recurringOverrides.find((r) => r.id === id);
      if (!rule) throw new Error("This alternating routine no longer exists.");
      rule.replacements = rule.replacements.filter((b) => b.id !== blockId);
      rule.removedIds = rule.removedIds.filter(
        (removed) => removed !== blockId,
      );
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
