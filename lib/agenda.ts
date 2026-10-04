import { type Task, compareScheduled, priorities } from "./tasks";
import { localDate, localTimestamp, timeMinutes } from "./date-time";
import {
  type ScheduleBlock,
  activeScheduleBlock,
  nextScheduleBlock,
  openWindows,
  flexibleRoutines,
} from "./schedule";
function taskStart(task: Task): number {
  return task.scheduledTime
    ? localTimestamp(task.scheduledDate, task.scheduledTime)
    : NaN;
}
export function activeTask(tasks: Task[], now: Date): Task | undefined {
  return tasks
    .filter(
      (t) =>
        !t.completed &&
        taskStart(t) <= now.getTime() &&
        now.getTime() < taskStart(t) + t.estimatedMinutes * 60000,
    )
    .sort(
      (a, b) =>
        taskStart(b) - taskStart(a) ||
        priorities.indexOf(a.priority) - priorities.indexOf(b.priority) ||
        a.id.localeCompare(b.id),
    )[0];
}
export function overdueTasks(tasks: Task[], now: Date): Task[] {
  return tasks
    .filter(
      (t) =>
        !t.completed &&
        t.scheduledTime !== null &&
        taskStart(t) + t.estimatedMinutes * 60000 <= now.getTime(),
    )
    .sort(compareScheduled);
}
export function nextUpcomingTask(tasks: Task[], now: Date): Task | undefined {
  return tasks
    .filter((t) => !t.completed && taskStart(t) > now.getTime())
    .sort(compareScheduled)[0];
}
export type AgendaItem =
  | { kind: "task"; task: Task; startTime: string }
  | { kind: "routine"; block: ScheduleBlock; startTime: string };
export function nextUpcomingItem(
  tasks: Task[],
  blocks: ScheduleBlock[],
  now: Date,
): AgendaItem | undefined {
  const task = nextUpcomingTask(
      tasks.filter((t) => t.scheduledDate === localDate(now)),
      now,
    ),
    block = nextScheduleBlock(blocks, now);
  if (task && (!block || task.scheduledTime! <= block.startTime!))
    return { kind: "task", task, startTime: task.scheduledTime! };
  if (block) return { kind: "routine", block, startTime: block.startTime! };
}
export function todayTimeline(
  tasks: Task[],
  blocks: ScheduleBlock[],
  date: string,
): AgendaItem[] {
  return [
    ...tasks
      .filter((t) => t.scheduledDate === date && t.scheduledTime)
      .map((t) => ({
        kind: "task" as const,
        task: t,
        startTime: t.scheduledTime!,
      })),
    ...blocks
      .filter((b) => !b.flexible)
      .map((b) => ({
        kind: "routine" as const,
        block: b,
        startTime: b.startTime!,
      })),
  ].sort(
    (a, b) =>
      a.startTime.localeCompare(b.startTime) || a.kind.localeCompare(b.kind),
  );
}
export function rightNow(
  tasks: Task[],
  blocks: ScheduleBlock[],
  now: Date,
): { item: AgendaItem; active: boolean } | null {
  const task = activeTask(tasks, now);
  if (task)
    return {
      item: { kind: "task", task, startTime: task.scheduledTime! },
      active: true,
    };
  const block = activeScheduleBlock(blocks, now);
  if (block)
    return {
      item: { kind: "routine", block, startTime: block.startTime! },
      active: true,
    };
  const next = nextUpcomingItem(tasks, blocks, now);
  return next ? { item: next, active: false } : null;
}
export function todayOpenWindows(
  tasks: Task[],
  blocks: ScheduleBlock[],
  date: string,
) {
  const dayStart = localTimestamp(date, "00:00"),
    nextDay = new Date(`${date}T12:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  const dayEnd = localTimestamp(localDate(nextDay), "00:00");
  const ranges = tasks
    .filter(
      (t) =>
        t.scheduledTime &&
        taskStart(t) < dayEnd &&
        taskStart(t) + t.estimatedMinutes * 60000 > dayStart,
    )
    .map((t) => {
      const start = taskStart(t),
        end = start + t.estimatedMinutes * 60000;
      const startDate = new Date(start),
        endDate = new Date(end);
      return {
        start:
          start <= dayStart
            ? 0
            : startDate.getHours() * 60 + startDate.getMinutes(),
        end:
          end >= dayEnd ? 1440 : endDate.getHours() * 60 + endDate.getMinutes(),
      };
    });
  return openWindows(blocks, ranges);
}
// Recommendations are ephemeral. They never mutate tasks or routine templates.
export function energyRecommendations(
  tasks: Task[],
  blocks: ScheduleBlock[],
  now: Date,
  energy: string,
): { tasks: Task[]; routines: ScheduleBlock[]; note: string } {
  const open = tasks.filter(
    (t) =>
      t.scheduledDate === localDate(now) && !t.completed && !t.scheduledTime,
  );
  const flexible = flexibleRoutines(blocks);
  if (energy === "Low")
    return {
      tasks: open.filter((t) => t.priority === "high").slice(0, 3),
      routines: flexible.filter((b) => b.category === "fitness"),
      note: "Keep the essentials in view: timed commitments, high-priority tasks, and your flexible fitness routine. Optional tasks can wait.",
    };
  if (energy === "Locked In") {
    const minute = now.getHours() * 60 + now.getMinutes();
    const available = todayOpenWindows(tasks, blocks, localDate(now)).reduce(
      (max, w) =>
        Math.max(
          max,
          timeMinutes(w.endTime) - Math.max(minute, timeMinutes(w.startTime)),
        ),
      0,
    );
    return {
      tasks: open
        .filter((t) => t.estimatedMinutes <= available)
        .sort(
          (a, b) =>
            priorities.indexOf(a.priority) - priorities.indexOf(b.priority),
        )
        .slice(0, 3),
      routines: flexible,
      note: "Untimed tasks below fit a remaining open window by duration. Choose one when it suits you; nothing is moved automatically.",
    };
  }
  return {
    tasks: open.slice(0, 3),
    routines: flexible,
    note: "A steady pace. Your schedule and flexible commitments are here when you need them.",
  };
}
