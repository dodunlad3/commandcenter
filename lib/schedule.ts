import { categories, type Category } from "./tasks";
import {
  isValidDate,
  isValidTime,
  timeMinutes,
  minuteTime,
  calendarDayNumber,
} from "./date-time";
export const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type Weekday = (typeof weekdays)[number];
export type ScheduleBlock = {
  id: string;
  title: string;
  description: string;
  category: Category;
  startTime: string | null;
  endTime: string | null;
  flexible: boolean;
};
export type BlockInput = Omit<ScheduleBlock, "id">;
export type WeeklyRoutine = { weekday: Weekday; blocks: ScheduleBlock[] };
// Patches, rather than copies of whole days, preserve unrelated template updates.
export type DateOverride = {
  date: string;
  additions: ScheduleBlock[];
  replacements: ScheduleBlock[];
  removedIds: string[];
};
export type RecurringScheduleOverride = Omit<DateOverride, "date"> & {
  id: string;
  name: string;
  weekday: Weekday;
  intervalWeeks: 2;
  anchorDate: string;
};
export type RecurringInput = Pick<
  RecurringScheduleOverride,
  "name" | "weekday" | "anchorDate"
>;
export type ScheduleData = {
  routines: WeeklyRoutine[];
  overrides: DateOverride[];
  recurringOverrides: RecurringScheduleOverride[];
};
export type ScheduleScope =
  | { weekday: Weekday; date?: never; recurringId?: never }
  | { date: string; weekday?: never; recurringId?: never }
  | { recurringId: string; date?: never; weekday?: never };
export function weekdayForDate(date: string): Weekday {
  if (!isValidDate(date)) throw new Error("Choose a valid date.");
  return weekdays[(new Date(`${date}T12:00:00`).getDay() + 6) % 7];
}
export function validateBlock(input: BlockInput): string | null {
  if (
    typeof input.title !== "string" ||
    !input.title.trim() ||
    input.title.trim().length > 160
  )
    return "Use a title between 1 and 160 characters.";
  if (typeof input.description !== "string" || input.description.length > 4000)
    return "Keep the description within 4,000 characters.";
  if (!categories.includes(input.category)) return "Choose a valid category.";
  if (typeof input.flexible !== "boolean") return "Choose a timing type.";
  if (input.flexible)
    return input.startTime === null && input.endTime === null
      ? null
      : "Flexible routines must have no required times.";
  if (!isValidTime(input.startTime) || !isValidTime(input.endTime))
    return "Choose both start and end times.";
  if (input.endTime <= input.startTime)
    return "End time must be after start time on the same day.";
  return null;
}
export function sortBlocks(blocks: ScheduleBlock[]): ScheduleBlock[] {
  return [...blocks].sort(
    (a, b) =>
      Number(a.flexible) - Number(b.flexible) ||
      (a.startTime ?? "").localeCompare(b.startTime ?? ""),
  );
}
export function validateRecurring(input: RecurringInput): string | null {
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.trim().length > 100
  )
    return "Use a name between 1 and 100 characters.";
  if (!weekdays.includes(input.weekday)) return "Choose a valid weekday.";
  if (typeof input.anchorDate !== "string" || !isValidDate(input.anchorDate))
    return "Choose a valid anchor date.";
  if (weekdayForDate(input.anchorDate) !== input.weekday)
    return `Choose a ${input.weekday} as the anchor date.`;
  return null;
}
export function matchesRecurring(
  rule: RecurringScheduleOverride,
  date: string,
): boolean {
  return (
    weekdayForDate(date) === rule.weekday &&
    (calendarDayNumber(date) - calendarDayNumber(rule.anchorDate)) % 14 === 0
  );
}
export function matchingRecurring(
  data: ScheduleData,
  date: string,
): RecurringScheduleOverride | undefined {
  return data.recurringOverrides.find((rule) => matchesRecurring(rule, date));
}
export function applySchedulePatch(
  blocks: ScheduleBlock[],
  patch: Pick<DateOverride, "additions" | "replacements" | "removedIds">,
): ScheduleBlock[] {
  const replacements = new Map(patch.replacements.map((b) => [b.id, b]));
  const result = blocks
    .filter((b) => !patch.removedIds.includes(b.id))
    .map((b) => replacements.get(b.id) ?? b);
  // An explicit date replacement can restore a weekly block removed by a repeating exception.
  for (const replacement of patch.replacements)
    if (!result.some((b) => b.id === replacement.id)) result.push(replacement);
  return sortBlocks([...result, ...patch.additions]);
}
export function blocksForScope(
  data: ScheduleData,
  scope: ScheduleScope,
): ScheduleBlock[] {
  if (scope.date) return scheduleForDate(data, scope.date);
  if (scope.recurringId) {
    const rule = data.recurringOverrides.find(
      (r) => r.id === scope.recurringId,
    );
    if (!rule) return [];
    return applySchedulePatch(
      data.routines.find((r) => r.weekday === rule.weekday)?.blocks ?? [],
      rule,
    );
  }
  return sortBlocks(
    data.routines.find((r) => r.weekday === scope.weekday)?.blocks ?? [],
  );
}
export function scheduleForDate(
  data: ScheduleData,
  date: string,
): ScheduleBlock[] {
  const base =
    data.routines.find((r) => r.weekday === weekdayForDate(date))?.blocks ?? [];
  const recurring = matchingRecurring(data, date);
  const withRecurring = recurring
    ? applySchedulePatch(base, recurring)
    : sortBlocks(base);
  const override = data.overrides.find((o) => o.date === date);
  return override ? applySchedulePatch(withRecurring, override) : withRecurring;
}
export function flexibleRoutines(blocks: ScheduleBlock[]): ScheduleBlock[] {
  return blocks.filter((b) => b.flexible);
}
export function activeScheduleBlock(
  blocks: ScheduleBlock[],
  now: Date,
): ScheduleBlock | undefined {
  const minute = now.getHours() * 60 + now.getMinutes();
  return blocks
    .filter(
      (b) =>
        !b.flexible &&
        timeMinutes(b.startTime!) <= minute &&
        minute < timeMinutes(b.endTime!),
    )
    .sort((a, b) => b.startTime!.localeCompare(a.startTime!))[0];
}
export function nextScheduleBlock(
  blocks: ScheduleBlock[],
  now: Date,
): ScheduleBlock | undefined {
  const minute = now.getHours() * 60 + now.getMinutes();
  return sortBlocks(blocks).find(
    (b) => !b.flexible && timeMinutes(b.startTime!) > minute,
  );
}
export type OpenWindow = {
  startTime: string;
  endTime: string;
  minutes: number;
};
export function openWindows(
  blocks: ScheduleBlock[],
  extra: { start: number; end: number }[] = [],
): OpenWindow[] {
  const ranges = [
    ...blocks
      .filter((b) => !b.flexible)
      .map((b) => ({
        start: timeMinutes(b.startTime!),
        end: timeMinutes(b.endTime!),
      })),
    ...extra,
  ].sort((a, b) => a.start - b.start);
  const gaps: OpenWindow[] = [];
  let cursor = 0;
  function add(end: number) {
    if (end > cursor)
      gaps.push({
        startTime: minuteTime(cursor),
        endTime: minuteTime(end),
        minutes: end - cursor,
      });
  }
  for (const range of ranges) {
    const start = Math.max(0, Math.min(1440, range.start)),
      end = Math.max(0, Math.min(1440, range.end));
    if (end <= start) continue;
    add(start);
    cursor = Math.max(cursor, end);
  }
  add(1440);
  return gaps;
}
export function createDefaultSchedule(): ScheduleData {
  return {
    routines: weekdays.map((weekday, index) => ({
      weekday,
      blocks:
        index < 5
          ? [
              {
                id: `${weekday}-commute-out`,
                title: "Commute to Work",
                description: "",
                category: "work",
                startTime: "06:00",
                endTime: "07:00",
                flexible: false,
              },
              {
                id: `${weekday}-work`,
                title: "Work",
                description: "",
                category: "work",
                startTime: "07:00",
                endTime: "15:30",
                flexible: false,
              },
              {
                id: `${weekday}-commute-home`,
                title: "Commute Home",
                description: "",
                category: "work",
                startTime: "15:30",
                endTime: "16:30",
                flexible: false,
              },
              {
                id: `${weekday}-fitness`,
                title:
                  index % 2 === 0
                    ? "Full-body workout"
                    : "Run — minimum 1.5 miles",
                description: "Choose a time that fits your day.",
                category: "fitness",
                startTime: null,
                endTime: null,
                flexible: true,
              },
            ]
          : [],
    })),
    overrides: [],
    recurringOverrides: [],
  };
}
