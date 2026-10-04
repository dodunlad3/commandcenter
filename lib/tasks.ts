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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
