"use client";
import { useState } from "react";
import { formatDate } from "@/lib/tasks";
import { Check, Clock3, RotateCw } from "lucide-react";
import type { Task } from "@/lib/tasks";
import { useDay } from "./task-provider";
export function CategoryTag({ category }: { category: Task["category"] }) {
  return (
    <span className={`category-tag ${category}`}>
      <span />
      {category}
    </span>
  );
}
export function CompletionButton({ task }: { task: Task }) {
  const { toggle, ready } = useDay();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={`check-button ${task.completed ? "checked" : ""}`}
      disabled={!ready || busy}
      onClick={async () => {
        setBusy(true);
        await toggle(task.id);
        setBusy(false);
      }}
      aria-label={`${task.completed ? "Reopen" : "Complete"} ${task.title}`}
      aria-pressed={task.completed}
    >
      {task.completed && <Check size={16} />}
    </button>
  );
}
export function TaskRow({
  task,
  index,
  showSchedule = false,
}: {
  task: Task;
  index?: number;
  showSchedule?: boolean;
}) {
  const { openTask } = useDay();
  return (
    <div className={`task-row ${task.completed ? "completed" : ""}`}>
      <CompletionButton task={task} />
      <button
        type="button"
        className="task-row-copy task-open-button"
        onClick={() => openTask(task.id)}
        aria-label={`View task: ${task.title}`}
      >
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <CategoryTag category={task.category} />
          <span>
            <Clock3 size={13} />
            {task.estimatedMinutes} min
          </span>
          {task.recurring && <RotateCw size={13} aria-label="Recurring task" />}
          {showSchedule && (
            <>
              <span>{task.priority} priority</span>
              <span>
                {formatDate(task.scheduledDate)} ·{" "}
                {formatTime(task.scheduledTime)}
              </span>
            </>
          )}
        </span>
      </button>
      {index !== undefined && (
        <span className="priority-number">0{index + 1}</span>
      )}
    </div>
  );
}
export function Panel({
  title,
  eyebrow,
  aside,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
export function formatTime(time: string | null) {
  if (!time) return "Anytime";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
