"use client";
import { useState } from "react";
import { Plus, CalendarDays } from "lucide-react";
import {
  localDate,
  formatDate,
  formatTime,
  isValidDate,
} from "@/lib/date-time";
import {
  weekdays,
  sortBlocks,
  scheduleForDate,
  flexibleRoutines,
  openWindows,
  type ScheduleBlock,
  type ScheduleScope,
} from "@/lib/schedule";
import { useDay } from "./task-provider";
import { useSchedule } from "./schedule-provider";
import { CategoryTag, Panel } from "./task-components";
export function ScheduleBlockRow({
  block,
  scope,
}: {
  block: ScheduleBlock;
  scope: ScheduleScope;
}) {
  const { openBlock } = useSchedule();
  return (
    <button
      className="routine-row task-open-button"
      onClick={() => openBlock(scope, block.id)}
      aria-label={`Edit routine: ${block.title}`}
    >
      <span className="routine-time">
        {block.flexible
          ? "Anytime"
          : `${formatTime(block.startTime)} – ${formatTime(block.endTime)}`}
      </span>
      <span className="task-title">{block.title}</span>
      <span className="task-meta">
        <CategoryTag category={block.category} />
        <span>Routine</span>
      </span>
    </button>
  );
}
export function SchedulePage() {
  const { data, ready, storageError, openBlock, resetDate } = useSchedule();
  const { now } = useDay();
  const [view, setView] = useState<"week" | "date">("week"),
    [selected, setSelected] = useState<string | null>(null),
    [resetConfirm, setResetConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  const date = selected ?? (now ? localDate(now) : "");
  if (!ready || !now)
    return (
      <div className="loading" role="status">
        {storageError
          ? "Your schedule is unavailable until storage is restored."
          : "Loading your weekly rhythm…"}
      </div>
    );
  const dateValid = isValidDate(date);
  const days =
    view === "week"
      ? weekdays.map((weekday) => ({
          label: weekday,
          scope: { weekday } as ScheduleScope,
          blocks: sortBlocks(
            data.routines.find((r) => r.weekday === weekday)!.blocks,
          ),
        }))
      : dateValid
        ? [
            {
              label: formatDate(date),
              scope: { date } as ScheduleScope,
              blocks: scheduleForDate(data, date),
            },
          ]
        : [];
  return (
    <>
      <div className="day-heading">
        <div>
          <span className="eyebrow">YOUR WEEKLY RHYTHM</span>
          <h1>
            Schedule<span>.</span>
          </h1>
          <p>A little structure. Plenty of room to make it your own.</p>
        </div>
        <button
          className="outline-button"
          onClick={() => {
            setSelected(localDate(now));
            setView("date");
            setResetConfirm(false);
          }}
        >
          <CalendarDays size={18} />
          Edit today
        </button>
      </div>
      <div className="schedule-controls">
        <div className="task-views" role="group" aria-label="Schedule views">
          <button
            className={view === "week" ? "selected" : ""}
            aria-pressed={view === "week"}
            onClick={() => {
              setView("week");
              setResetConfirm(false);
            }}
          >
            Weekly routine
          </button>
          <button
            className={view === "date" ? "selected" : ""}
            aria-pressed={view === "date"}
            onClick={() => setView("date")}
          >
            Specific date
          </button>
        </div>
        {view === "date" && (
          <label className="schedule-date">
            Choose date
            <input
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={date}
              onChange={(e) => {
                setSelected(e.target.value);
                setResetConfirm(false);
              }}
            />
          </label>
        )}
      </div>
      <p className="schedule-help">
        {view === "week"
          ? "These templates repeat each weekday. Edits affect every future occurrence; flexible routines stay untimed."
          : "This day starts with its weekly routine. Choose date-only changes or explicitly edit the recurring template."}
      </p>
      {view === "date" &&
        dateValid &&
        data.overrides.some((o) => o.date === date) && (
          <div className="override-notice">
            <span>This date has personal changes.</span>
            {resetConfirm ? (
              <div className="dialog-actions">
                <span>Remove date-only additions and edits?</span>
                <button
                  className="outline-button"
                  disabled={busy}
                  onClick={() => setResetConfirm(false)}
                >
                  Keep changes
                </button>
                <button
                  className="danger-button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    if (await resetDate(date)) setResetConfirm(false);
                    setBusy(false);
                  }}
                >
                  Use weekly routine
                </button>
              </div>
            ) : (
              <button
                className="text-link"
                onClick={() => setResetConfirm(true)}
              >
                Reset to weekly routine
              </button>
            )}
          </div>
        )}
      {!dateValid && view === "date" && (
        <p role="alert" className="form-error">
          Choose a valid date.
        </p>
      )}
      <div className={`schedule-grid ${view === "date" ? "date-view" : ""}`}>
        {days.map((day) => (
          <Panel
            key={day.label}
            title={day.label}
            className="schedule-day"
            aside={
              <button
                className="icon-button"
                aria-label={`Add block for ${day.label}`}
                onClick={() => openBlock(day.scope)}
              >
                <Plus size={20} />
              </button>
            }
          >
            {day.blocks
              .filter((b) => !b.flexible)
              .map((block) => (
                <ScheduleBlockRow
                  key={block.id}
                  block={block}
                  scope={day.scope}
                />
              ))}
            {!day.blocks.some((b) => !b.flexible) && (
              <p className="muted schedule-empty">
                No timed commitments. An open day.
              </p>
            )}
            <div className="flexible-area">
              <h3>Flexible</h3>
              {flexibleRoutines(day.blocks).map((block) => (
                <ScheduleBlockRow
                  key={block.id}
                  block={block}
                  scope={day.scope}
                />
              ))}
              {!day.blocks.some((b) => b.flexible) && (
                <p className="muted">Nothing flexible added.</p>
              )}
            </div>
            <details className="open-windows">
              <summary>
                Open time · {openWindows(day.blocks).length}{" "}
                {openWindows(day.blocks).length === 1 ? "window" : "windows"}
              </summary>
              {openWindows(day.blocks).map((w) => (
                <p key={w.startTime}>
                  {formatTime(w.startTime)} – {formatTime(w.endTime)}{" "}
                  <span>Open</span>
                </p>
              ))}
              <p className="form-note">
                Gaps between routine blocks. Tasks may also use this time.
              </p>
            </details>
          </Panel>
        ))}
      </div>
    </>
  );
}
