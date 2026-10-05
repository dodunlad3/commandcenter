"use client";
import { Check, Clock3 } from "lucide-react";
import Link from "next/link";
import { formatTime, localDate } from "@/lib/date-time";
import {
  type AgendaItem,
  rightNow,
  nextUpcomingItem,
  todayTimeline,
  todayOpenWindows,
  energyRecommendations,
  overdueTasks,
} from "@/lib/agenda";
import { matchingRecurring, scheduleForDate } from "@/lib/schedule";
import { useDay } from "./task-provider";
import { useSchedule } from "./schedule-provider";
import {
  CategoryTag,
  CompletionButton,
  Panel,
  TaskRow,
} from "./task-components";
function eventTitle(item: AgendaItem) {
  return item.kind === "task" ? item.task.title : item.block.title;
}
function eventTime(item: AgendaItem) {
  return item.kind === "task"
    ? `${formatTime(item.startTime)} · ${item.task.estimatedMinutes} min`
    : `${formatTime(item.startTime)} – ${formatTime(item.block.endTime)}`;
}
export function AgendaTitle({
  item,
  className = "task-title-button",
}: {
  item: AgendaItem;
  className?: string;
}) {
  const { openTask, now } = useDay();
  const { openBlock } = useSchedule();
  return (
    <button
      className={className}
      onClick={() =>
        item.kind === "task"
          ? openTask(item.task.id)
          : openBlock({ date: localDate(now!) }, item.block.id)
      }
      aria-label={`${item.kind === "task" ? "View task" : "Edit routine"}: ${eventTitle(item)}`}
    >
      {eventTitle(item)}
    </button>
  );
}
export function RightNowCard() {
  const { tasks, now, capture } = useDay();
  const { data, ready } = useSchedule();
  const blocks = ready ? scheduleForDate(data, localDate(now!)) : [];
  const current = rightNow(tasks, blocks, now!);
  return (
    <section className="focus-card">
      <div className="focus-top">
        <span className="eyebrow">
          <span className="pulse-dot" />
          RIGHT NOW
        </span>
        <span className="focus-count">
          {current
            ? current.active
              ? "IN THIS WINDOW"
              : "COMING UP"
            : "OPEN WINDOW"}
        </span>
      </div>
      {current ? (
        <>
          <CategoryTag
            category={
              current.item.kind === "task"
                ? current.item.task.category
                : current.item.block.category
            }
          />
          <h2>
            <AgendaTitle item={current.item} />
          </h2>
          <p>
            {(current.item.kind === "task"
              ? current.item.task.description
              : current.item.block.description) ||
              (current.active
                ? "A little structure for this part of your day."
                : "Your current window is open. Here’s what begins next.")}
          </p>
          <div className="focus-bottom">
            <span>
              <Clock3 size={17} />
              {eventTime(current.item)}
              <span className="event-kind">
                {current.item.kind === "task" ? "Task" : "Routine"}
              </span>
            </span>
            {current.item.kind === "task" ? (
              <CompletionButton task={current.item.task} fullLabel />
            ) : (
              <Link className="outline-button" href="/schedule">
                View schedule
              </Link>
            )}
          </div>
        </>
      ) : (
        <>
          <h2>A little breathing room.</h2>
          <p>This window is open. Nothing timed is coming up today.</p>
          <button className="primary-button" onClick={capture}>
            Capture something new
          </button>
        </>
      )}
      {!ready && (
        <p className="form-note">
          Routine information is unavailable until schedule storage is restored.
        </p>
      )}
    </section>
  );
}
export function UpNextCard() {
  const { tasks, now } = useDay();
  const { data, ready } = useSchedule();
  const next = nextUpcomingItem(
    tasks,
    ready ? scheduleForDate(data, localDate(now!)) : [],
    now!,
  );
  return (
    <Panel
      title="Up next"
      aside={<span className="subtle">ON THE HORIZON</span>}
      className="up-next"
    >
      {next ? (
        <div className="next-content">
          <span
            className={`next-icon ${next.kind === "task" ? next.task.category : next.block.category}`}
          >
            <Clock3 size={24} />
          </span>
          <div>
            <h3>
              <AgendaTitle item={next} />
            </h3>
            <div className="task-meta">
              <span className="event-kind">
                {next.kind === "task" ? "Task" : "Routine"}
              </span>
              <span>{eventTime(next)}</span>
            </div>
          </div>
          {next.kind === "task" && <CompletionButton task={next.task} />}
        </div>
      ) : (
        <p className="muted">Nothing timed waiting today. Enjoy the space.</p>
      )}
    </Panel>
  );
}
export function StillOpenCard() {
  const { tasks, now } = useDay();
  const overdue = overdueTasks(tasks, now!);
  if (!overdue.length) return null;
  return (
    <Panel
      title="Still open"
      aside={<span className="counter">{overdue.length}</span>}
    >
      <p className="schedule-help">
        These time windows have passed. Complete a task or tap it to edit and
        reschedule.
      </p>
      {overdue.slice(0, 3).map((t) => (
        <TaskRow key={t.id} task={t} showSchedule />
      ))}
      {overdue.length > 3 && (
        <Link className="text-link" href="/tasks">
          View all open tasks
        </Link>
      )}
    </Panel>
  );
}
export function EnergySuggestions() {
  const { tasks, now, energy } = useDay();
  const { data, ready, openBlock } = useSchedule();
  const date = localDate(now!);
  const suggestions = energyRecommendations(
    tasks,
    ready ? scheduleForDate(data, date) : [],
    now!,
    energy,
  );
  return (
    <div className="energy-suggestions">
      <p className="energy-note">{suggestions.note}</p>
      {suggestions.tasks.map((t) => (
        <TaskRow key={t.id} task={t} />
      ))}
      {energy === "Low" &&
        suggestions.routines.map((b) => (
          <button
            key={b.id}
            className="text-link"
            onClick={() => openBlock({ date }, b.id)}
          >
            {b.title} · flexible fitness
          </button>
        ))}
    </div>
  );
}
export function TodayTimeline() {
  const { tasks, now, energy } = useDay();
  const { data, ready, openBlock } = useSchedule();
  const date = localDate(now!);
  const blocks = ready ? scheduleForDate(data, date) : [],
    current = rightNow(tasks, blocks, now!);
  const events = todayTimeline(tasks, blocks, date),
    gaps = todayOpenWindows(tasks, blocks, date);
  const rows = [
    ...events.map((item) => ({ time: item.startTime, item })),
    ...gaps
      .filter((w) => w.minutes >= 15)
      .map((gap) => ({ time: gap.startTime, gap })),
  ].sort((a, b) => a.time.localeCompare(b.time));
  const flexible = blocks.filter((b) => b.flexible),
    untimed = tasks.filter((t) => t.scheduledDate === date && !t.scheduledTime);
  const isCurrent = (item: AgendaItem) =>
    current?.active &&
    current.item.kind === item.kind &&
    (item.kind === "task"
      ? current.item.kind === "task" && current.item.task.id === item.task.id
      : current.item.kind === "routine" &&
        current.item.block.id === item.block.id);
  return (
    <Panel
      title="The shape of your day"
      aside={
        <Link className="text-link" href="/schedule">
          View schedule
        </Link>
      }
      className="timeline-panel"
    >
      {ready && matchingRecurring(data, date) && (
        <p className="schedule-source">
          <strong>{matchingRecurring(data, date)!.name}</strong>
          <span>Every other {matchingRecurring(data, date)!.weekday}</span>
          {data.overrides.some((o) => o.date === date) && (
            <span className="source-badge">Date-specific changes</span>
          )}
        </p>
      )}
      <div className="timeline">
        {!rows.length && <p className="muted">Your timeline is clear today.</p>}
        {rows.map((row, index) =>
          "item" in row ? (
            <div
              key={`${row.item.kind}-${index}`}
              className={`timeline-item ${row.item.kind === "routine" ? "routine-event" : ""} ${row.item.kind === "task" && row.item.task.completed ? "completed" : ""} ${isCurrent(row.item) ? "current" : ""}`}
            >
              <span className="timeline-time">{formatTime(row.time)}</span>
              <span className="timeline-point">
                {row.item.kind === "task" && row.item.task.completed && (
                  <Check size={10} />
                )}
              </span>
              <div className="timeline-copy">
                <span
                  className={`timeline-category ${row.item.kind === "task" ? row.item.task.category : row.item.block.category}`}
                >
                  {row.item.kind === "task" ? "Task" : "Routine"} ·{" "}
                  {row.item.kind === "task"
                    ? row.item.task.category
                    : row.item.block.category}
                  {isCurrent(row.item) && (
                    <span className="now-label">NOW</span>
                  )}
                </span>
                <AgendaTitle
                  item={row.item}
                  className="timeline-title task-title-button"
                />
                <span className="timeline-duration">
                  {row.item.kind === "task"
                    ? `${row.item.task.estimatedMinutes} min`
                    : `Until ${formatTime(row.item.block.endTime)}`}
                </span>
              </div>
              {row.item.kind === "task" && (
                <CompletionButton task={row.item.task} />
              )}
            </div>
          ) : (
            <div className="timeline-item open-event" key={`gap-${index}`}>
              <span className="timeline-time">{formatTime(row.time)}</span>
              <span className="timeline-point" />
              <div className="timeline-copy">
                <span className="timeline-title">Open space</span>
                <span className="timeline-duration">
                  Until {formatTime(row.gap.endTime)} · {row.gap.minutes} min
                </span>
              </div>
            </div>
          ),
        )}
      </div>
      <div className="flexible-area">
        <h3>Flexible today</h3>
        {flexible.map((block) => (
          <button
            key={block.id}
            className={`routine-row task-open-button ${energy === "Low" && block.category !== "fitness" ? "optional-routine" : ""}`}
            onClick={() => openBlock({ date }, block.id)}
            aria-label={`Edit routine: ${block.title}`}
          >
            <span className="task-title">{block.title}</span>
            <span className="task-meta">
              <CategoryTag category={block.category} />
              <span>Routine · Anytime</span>
            </span>
          </button>
        ))}
        {!flexible.length && (
          <p className="muted">No flexible routines for today.</p>
        )}
      </div>
      {!!untimed.length && (
        <div className="flexible-area">
          <h3>Untimed tasks</h3>
          {untimed.map((t) => (
            <div
              key={t.id}
              className={
                energy === "Low" && t.priority !== "high"
                  ? "optional-routine"
                  : ""
              }
            >
              <TaskRow task={t} />
            </div>
          ))}
        </div>
      )}
      <p className="panel-footnote">
        Open space excludes timed routines and task windows. Nothing is filled
        automatically.{!ready && " Routine storage is currently unavailable."}
      </p>
    </Panel>
  );
}
