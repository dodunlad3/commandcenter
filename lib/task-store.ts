import {
  createMockTasks,
  validateTaskInput,
  type Task,
  type TaskInput,
} from "./tasks";
export const TASK_STORAGE_KEY = "daywell.tasks.v1";
const STORAGE_VERSION = 1;
// Async boundaries keep the provider independent of a future network-backed adapter.
export interface TaskStore {
  load(seedDate: string): Promise<Task[]>;
  create(input: TaskInput): Promise<Task[]>;
  update(id: string, input: TaskInput): Promise<Task[]>;
  remove(id: string): Promise<Task[]>;
  toggle(id: string): Promise<Task[]>;
  subscribe(listener: () => void): () => void;
}
type StorageAccess = Pick<Storage, "getItem" | "setItem">;
function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Task;
  return (
    typeof task.id === "string" &&
    !!task.id &&
    typeof task.title === "string" &&
    typeof task.description === "string" &&
    typeof task.scheduledDate === "string" &&
    (task.scheduledTime === null || typeof task.scheduledTime === "string") &&
    validateTaskInput(task) === null &&
    typeof task.completed === "boolean" &&
    typeof task.recurring === "boolean" &&
    typeof task.createdAt === "string" &&
    !Number.isNaN(Date.parse(task.createdAt))
  );
}
function newId(): string {
  // randomUUID requires a secure context; LAN previews on tablets may use HTTP.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) =>
    n.toString(16).padStart(8, "0"),
  ).join("-");
}
export function createLocalTaskStore(
  getStorage: () => StorageAccess = () => window.localStorage,
): TaskStore {
  function read(): Task[] | null {
    const raw = getStorage().getItem(TASK_STORAGE_KEY);
    if (raw === null) return null;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "Saved task data could not be read. It has been kept unchanged.",
      );
    }
    if (!data || typeof data !== "object")
      throw new Error(
        "Saved task data is invalid. It has been kept unchanged.",
      );
    const record = data as { version?: unknown; tasks?: unknown };
    if (
      record.version !== STORAGE_VERSION ||
      !Array.isArray(record.tasks) ||
      !record.tasks.every(isTask) ||
      new Set(record.tasks.map((t) => t.id)).size !== record.tasks.length
    ) {
      throw new Error(
        "Saved task data is invalid or uses an unsupported version. It has been kept unchanged.",
      );
    }
    return record.tasks;
  }
  function write(tasks: Task[]): Task[] {
    getStorage().setItem(
      TASK_STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, tasks }),
    );
    return tasks;
  }
  function mutate(id: string, change: (task: Task) => Task | null): Task[] {
    const tasks = read();
    if (!tasks)
      throw new Error(
        "Task storage is not ready. Reload tasks before making changes.",
      );
    if (!tasks.some((t) => t.id === id))
      throw new Error(
        "This task no longer exists. Reload tasks to see the latest changes.",
      );
    return write(
      tasks.flatMap((task) => (task.id === id ? (change(task) ?? []) : task)),
    );
  }
  function validated(input: TaskInput): TaskInput {
    const error = validateTaskInput(input);
    if (error) throw new Error(error);
    return {
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
    };
  }
  return {
    async load(seedDate) {
      return read() ?? write(createMockTasks(seedDate));
    },
    async create(input) {
      const fields = validated(input);
      const tasks = read();
      if (!tasks)
        throw new Error(
          "Task storage is not ready. Reload tasks before making changes.",
        );
      return write([
        ...tasks,
        {
          ...fields,
          id: newId(),
          completed: false,
          recurring: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    async update(id, input) {
      const fields = validated(input);
      return mutate(id, (task) => ({ ...task, ...fields }));
    },
    async remove(id) {
      return mutate(id, () => null);
    },
    async toggle(id) {
      return mutate(id, (task) => ({ ...task, completed: !task.completed }));
    },
    subscribe(listener) {
      if (typeof window === "undefined") return () => {};
      const onStorage = (event: StorageEvent) => {
        if (
          (event.key === TASK_STORAGE_KEY || event.key === null) &&
          event.storageArea === window.localStorage
        )
          listener();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
  };
}
