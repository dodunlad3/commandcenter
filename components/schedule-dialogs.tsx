"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { categories } from "@/lib/tasks";
import { formatDate } from "@/lib/date-time";
import {
  scheduleForDate,
  validateBlock,
  weekdayForDate,
  type ScheduleScope,
  type ScheduleBlock,
  type BlockInput,
} from "@/lib/schedule";
import { Modal } from "./modal";
import { useSchedule, type ScheduleDialog } from "./schedule-provider";
function BlockEditor({
  selection,
}: {
  selection: NonNullable<ScheduleDialog>;
}) {
  const {
    data,
    createBlock,
    updateBlock,
    deleteBlock,
    closeDialog,
    storageError,
  } = useSchedule();
  const original = selection.scope;
  const date = original.date;
  const block = selection.id
    ? (date
        ? scheduleForDate(data, date)
        : data.routines.find((r) => r.weekday === original.weekday)!.blocks
      ).find((b) => b.id === selection.id)
    : undefined;
  const dateAddition =
    date &&
    data.overrides
      .find((o) => o.date === date)
      ?.additions.some((b) => b.id === selection.id);
  const [scope, setScope] = useState<ScheduleScope | null>(
    date && block && !dateAddition ? null : original,
  );
  const [flexible, setFlexible] = useState(block?.flexible ?? false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null),
    deleteRef = useRef<HTMLButtonElement>(null),
    titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (confirm) keepRef.current?.focus();
  }, [confirm]);
  useEffect(() => {
    if (scope) titleRef.current?.focus();
  }, [scope]);
  const editingBlock: ScheduleBlock | undefined =
    scope?.weekday && selection.id
      ? data.routines
          .find((r) => r.weekday === scope.weekday)
          ?.blocks.find((b) => b.id === selection.id)
      : block;
  if (selection.id && !block)
    return (
      <p className="muted">
        This block no longer exists. Close this view and reload the schedule.
      </p>
    );
  if (!scope)
    return (
      <div className="scope-choice">
        <p>Where should changes to “{block?.title}” apply?</p>
        <button className="primary-button" onClick={() => setScope(original)}>
          Change {date ? formatDate(date) : "today"} only
        </button>
        <button
          className="outline-button"
          onClick={() => {
            const weekday = weekdayForDate(date!);
            const weekly = data.routines
              .find((r) => r.weekday === weekday)
              ?.blocks.find((b) => b.id === selection.id);
            setFlexible(weekly?.flexible ?? false);
            setScope({ weekday });
          }}
        >
          Change the weekly routine
        </button>
        <p className="form-note">
          Date-only changes keep the weekly template intact.
        </p>
      </div>
    );
  const scopeLabel = scope.date
    ? `Only ${formatDate(scope.date)}. Your weekly routine stays unchanged.`
    : `Weekly routine · every ${scope.weekday}. This change affects every future ${scope.weekday} occurrence.`;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !scope) return;
    const values = new FormData(event.currentTarget);
    const input: BlockInput = {
      title: String(values.get("title")).trim(),
      description: String(values.get("description")).trim(),
      category: values.get("category") as BlockInput["category"],
      flexible,
      startTime: flexible ? null : String(values.get("startTime")),
      endTime: flexible ? null : String(values.get("endTime")),
    };
    const problem = validateBlock(input);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setBusy(true);
    const saved = selection.id
      ? await updateBlock(scope, selection.id, input)
      : await createBlock(scope, input);
    setBusy(false);
    if (saved) closeDialog();
  }
  async function remove() {
    if (!scope || !selection.id) return;
    setBusy(true);
    const saved = await deleteBlock(scope, selection.id);
    setBusy(false);
    if (saved) closeDialog();
  }
  return (
    <>
      <p className="scope-note">{scopeLabel}</p>
      {confirm ? (
        <section
          className="delete-confirmation"
          aria-labelledby="delete-block-title"
        >
          <h3 id="delete-block-title">Remove this block?</h3>
          <p>
            “{editingBlock?.title}” will be removed{" "}
            {scope.date ? "for this date only" : "from the weekly routine"}.
          </p>
          {storageError && (
            <p className="form-error" role="alert">
              {storageError}
            </p>
          )}
          <div className="dialog-actions">
            <button
              ref={keepRef}
              className="outline-button"
              disabled={busy}
              onClick={() => {
                setConfirm(false);
                requestAnimationFrame(() => deleteRef.current?.focus());
              }}
            >
              Keep block
            </button>
            <button
              className="danger-button"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "Removing…" : "Remove block"}
            </button>
          </div>
        </section>
      ) : (
        <form key={scope.date ?? scope.weekday} onSubmit={submit}>
          <label>
            Block title
            <input
              ref={titleRef}
              name="title"
              required
              maxLength={160}
              defaultValue={editingBlock?.title}
              placeholder="Make room for something…"
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              rows={2}
              maxLength={4000}
              defaultValue={editingBlock?.description}
              placeholder="Optional details"
            />
          </label>
          <div className="form-grid">
            <label>
              Category
              <select
                name="category"
                defaultValue={editingBlock?.category ?? "personal"}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Timing
              <select
                value={flexible ? "flexible" : "timed"}
                onChange={(e) => setFlexible(e.target.value === "flexible")}
              >
                <option value="timed">Timed block</option>
                <option value="flexible">Flexible / anytime</option>
              </select>
            </label>
            {!flexible && (
              <>
                <label>
                  Start time
                  <input
                    name="startTime"
                    type="time"
                    required
                    defaultValue={editingBlock?.startTime ?? ""}
                  />
                </label>
                <label>
                  End time
                  <input
                    name="endTime"
                    type="time"
                    required
                    defaultValue={editingBlock?.endTime ?? ""}
                  />
                </label>
              </>
            )}
          </div>
          <p className="form-note">
            {flexible
              ? "Flexible routines have no required start time and never become the next timed event."
              : "Times use your local day. End must follow start; split overnight routines into two blocks."}
          </p>
          {(error || storageError) && (
            <p className="form-error" role="alert">
              {error || storageError}
            </p>
          )}
          <button className="primary-button" disabled={busy} type="submit">
            <Check size={18} />
            {busy ? "Saving…" : selection.id ? "Save block" : "Add block"}
          </button>
          {selection.id && (
            <button
              ref={deleteRef}
              className="text-link delete-button"
              type="button"
              onClick={() => setConfirm(true)}
              disabled={busy}
            >
              <Trash2 size={18} />
              Remove {scope.date ? "for this date" : "from routine"}
            </button>
          )}
        </form>
      )}
    </>
  );
}
export function ScheduleDialogs() {
  const { dialog, closeDialog } = useSchedule();
  if (!dialog) return null;
  return (
    <Modal
      key={`${dialog.scope.date ?? dialog.scope.weekday}-${dialog.id ?? "new"}`}
      title={dialog.id ? "Edit schedule block" : "Add schedule block"}
      eyebrow="MAKE ROOM FOR YOUR DAY"
      onClose={closeDialog}
      focusTitle
      closeLabel="Close schedule dialog"
    >
      <BlockEditor selection={dialog} />
    </Modal>
  );
}
