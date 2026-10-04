export const categories = [
  "work",
  "fitness",
  "content",
  "projects",
  "money",
  "home",
  "personal",
] as const;
export type Category = (typeof categories)[number];
export type Task = {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: "high" | "medium" | "low";
  completed: boolean;
  scheduledDate: string;
  scheduledTime: string | null;
  estimatedMinutes: number;
  recurring: boolean;
  createdAt: string;
};
export function localDate(date = new Date()): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function createMockTasks(date: string): Task[] {
  const rows: [
    string,
    string,
    Category,
    string,
    number,
    boolean,
    Task["priority"],
    boolean,
  ][] = [
    [
      "Morning reset",
      "Water, breakfast, and a little space to think.",
      "personal",
      "08:00",
      30,
      true,
      "low",
      true,
    ],
    [
      "Plan the week ahead",
      "Review your projects and choose what matters most.",
      "work",
      "09:00",
      45,
      true,
      "high",
      false,
    ],
    [
      "Build the command center",
      "Make progress on the Today dashboard. One focused block.",
      "projects",
      "10:00",
      90,
      false,
      "high",
      false,
    ],
    [
      "Strength & stretch",
      "Full-body strength session, followed by ten minutes of mobility.",
      "fitness",
      "12:00",
      50,
      false,
      "high",
      true,
    ],
    [
      "Outline the next video",
      "Shape the hook, three key points, and a closing thought.",
      "content",
      "14:00",
      45,
      false,
      "medium",
      false,
    ],
    [
      "Weekly money check-in",
      "Review spending and upcoming bills.",
      "money",
      "16:00",
      20,
      false,
      "medium",
      true,
    ],
    [
      "Grocery run",
      "Pick up vegetables, eggs, and the essentials for the week.",
      "home",
      "17:30",
      30,
      false,
      "low",
      false,
    ],
    [
      "A little time offline",
      "Read a few chapters and wind down.",
      "personal",
      "20:00",
      30,
      false,
      "low",
      true,
    ],
  ];
  return rows.map(
    (
      [
        title,
        description,
        category,
        scheduledTime,
        estimatedMinutes,
        completed,
        priority,
        recurring,
      ],
      i,
    ) => ({
      id: `mock-${i}`,
      title,
      description,
      category,
      scheduledDate: date,
      scheduledTime,
      estimatedMinutes,
      completed,
      priority,
      recurring,
      createdAt: `${date}T07:00:00`,
    }),
  );
}
export const navigation = [
  "Today",
  "Tasks",
  "Work",
  "Fitness",
  "Content",
  "Projects",
  "Money",
  "Home",
  "Journal",
] as const;

export type TaskInput = Pick<
  Task,
  | "title"
  | "description"
  | "category"
  | "priority"
  | "scheduledDate"
  | "scheduledTime"
  | "estimatedMinutes"
>;
export const priorities = ["high", "medium", "low"] as const;
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDate(date) === value;
}
export function validateTaskInput(input: TaskInput): string | null {
  if (!input.title.trim() || input.title.trim().length > 160)
    return "Use a title between 1 and 160 characters.";
  if (input.description.length > 4000)
    return "Keep the description within 4,000 characters.";
  if (!categories.includes(input.category)) return "Choose a valid category.";
  if (!priorities.includes(input.priority)) return "Choose a valid priority.";
  if (!isValidDate(input.scheduledDate))
    return "Choose a valid scheduled date.";
  if (
    input.scheduledTime !== null &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.scheduledTime)
  )
    return "Choose a valid time.";
  if (
    !Number.isInteger(input.estimatedMinutes) ||
    input.estimatedMinutes < 1 ||
    input.estimatedMinutes > 1440
  )
    return "Duration must be a whole number from 1 to 1,440 minutes.";
  return null;
}
export function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
export type TaskView = "all" | "today" | "completed" | "upcoming";
export type TaskSort = "scheduled" | "priority" | "created";
export type TaskFilters = {
  view: TaskView;
  category: Category | "all";
  priority: Task["priority"] | "all";
  status: "all" | "open" | "completed";
  sort: TaskSort;
};
export function compareScheduled(a: Task, b: Task): number {
  return (
    a.scheduledDate.localeCompare(b.scheduledDate) ||
    (a.scheduledTime || "99:99").localeCompare(b.scheduledTime || "99:99") ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}
export function selectTasks(
  tasks: Task[],
  today: string,
  filters: TaskFilters,
): Task[] {
  return tasks
    .filter(
      (task) =>
        (filters.view === "all" ||
          (filters.view === "today" && task.scheduledDate === today) ||
          (filters.view === "completed" && task.completed) ||
          (filters.view === "upcoming" &&
            task.scheduledDate > today &&
            !task.completed)) &&
        (filters.category === "all" || task.category === filters.category) &&
        (filters.priority === "all" || task.priority === filters.priority) &&
        (filters.status === "all" ||
          task.completed === (filters.status === "completed")),
    )
    .sort((a, b) =>
      filters.sort === "priority"
        ? priorities.indexOf(a.priority) - priorities.indexOf(b.priority) ||
          compareScheduled(a, b)
        : filters.sort === "created"
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
            a.id.localeCompare(b.id)
          : compareScheduled(a, b),
    );
}
