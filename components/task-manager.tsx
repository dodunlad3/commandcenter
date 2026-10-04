"use client";
import { useState } from "react";
import {
  categories,
  localDate,
  selectTasks,
  type TaskFilters,
  type TaskView,
} from "@/lib/tasks";
import { useDay } from "./task-provider";
import { Panel, TaskRow } from "./task-components";
const defaults: TaskFilters = {
  view: "all",
  category: "all",
  priority: "all",
  status: "all",
  sort: "scheduled",
};
const views: { value: TaskView; label: string }[] = [
  { value: "all", label: "All tasks" },
  { value: "today", label: "Today" },
  { value: "completed", label: "Completed" },
  { value: "upcoming", label: "Upcoming" },
];
export function TaskManager() {
  const { tasks, now, ready, storageError } = useDay();
  const [filters, setFilters] = useState<TaskFilters>(defaults);
  if (!ready || !now)
    return (
      <div className="loading" role="status">
        {storageError
          ? "Your tasks are unavailable until storage is restored."
          : "Loading your tasks…"}
      </div>
    );
  const today = localDate(now);
  const visible = selectTasks(tasks, today, filters);
  const update = <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) =>
    setFilters((old) => ({ ...old, [key]: value }));
  return (
    <Panel
      title="Your tasks"
      className="section-list task-manager"
      aside={
        <span className="counter">
          {visible.length} / {tasks.length}
        </span>
      }
    >
      <div className="task-views" role="group" aria-label="Task views">
        {views.map((view) => (
          <button
            key={view.value}
            className={filters.view === view.value ? "selected" : ""}
            aria-pressed={filters.view === view.value}
            onClick={() => update("view", view.value)}
          >
            {view.label}
          </button>
        ))}
      </div>
      <div className="task-filters">
        <label>
          Category
          <select
            value={filters.category}
            onChange={(e) =>
              update("category", e.target.value as TaskFilters["category"])
            }
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select
            value={filters.priority}
            onChange={(e) =>
              update("priority", e.target.value as TaskFilters["priority"])
            }
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label>
          Status
          <select
            value={filters.status}
            onChange={(e) =>
              update("status", e.target.value as TaskFilters["status"])
            }
          >
            <option value="all">Any status</option>
            <option value="open">Open</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label>
          Sort by
          <select
            value={filters.sort}
            onChange={(e) =>
              update("sort", e.target.value as TaskFilters["sort"])
            }
          >
            <option value="scheduled">Scheduled time</option>
            <option value="priority">Priority</option>
            <option value="created">Creation date</option>
          </select>
        </label>
      </div>
      {visible.length ? (
        <div>
          {visible.map((task) => (
            <TaskRow key={task.id} task={task} showSchedule />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No tasks in this view.</h3>
          <p>Try another view or adjust the filters.</p>
        </div>
      )}
      <div className="manager-footer">
        <span>
          {filters.view === "upcoming"
            ? "Open tasks scheduled after today."
            : "Tap a task to view details, edit, or delete."}
        </span>
        <button className="text-link" onClick={() => setFilters(defaults)}>
          Reset filters
        </button>
      </div>
    </Panel>
  );
}
