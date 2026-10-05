"use client";
import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/date-time";
import {
  weekdays,
  validateRecurring,
  type RecurringInput,
} from "@/lib/schedule";
import { useSchedule } from "./schedule-provider";
import { Modal } from "./modal";
export function AlternatingDialog({
  id,
  onClose,
}: {
  id?: string;
  onClose: () => void;
}) {
  const {
    data,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    storageError,
  } = useSchedule();
  const rule = id
    ? data.recurringOverrides.find((r) => r.id === id)
    : undefined;
  const [weekday, setWeekday] = useState(rule?.weekday ?? "friday"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null),
    removeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirm) keepRef.current?.focus();
  }, [confirm]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const input: RecurringInput = {
      name: String(values.get("title")).trim(),
      weekday,
      anchorDate: String(values.get("anchorDate")),
    };
    const problem = validateRecurring(input);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setBusy(true);
    const saved = id
      ? await updateRecurring(id, input)
      : await createRecurring(input);
    setBusy(false);
    if (saved) onClose();
  }
  async function remove() {
    if (!id) return;
    setBusy(true);
    const saved = await deleteRecurring(id);
    setBusy(false);
    if (saved) onClose();
  }
  return (
    <Modal
      title={id ? "Alternating routine settings" : "Add alternating routine"}
      eyebrow="EVERY OTHER WEEK"
      focusTitle
      onClose={onClose}
      closeLabel="Close alternating routine dialog"
    >
      {id && !rule ? (
        <p className="muted">This alternating routine no longer exists.</p>
      ) : confirm ? (
        <section
          className="delete-confirmation"
          aria-labelledby="remove-alternating-title"
        >
          <h3 id="remove-alternating-title">Remove {rule?.name}?</h3>
          <p>
            The normal weekly routine will return on this cycle. Your date-only
            changes stay.
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
                requestAnimationFrame(() => removeRef.current?.focus());
              }}
            >
              Keep alternating routine
            </button>
            <button
              className="danger-button"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "Removing…" : "Remove alternating routine"}
            </button>
          </div>
        </section>
      ) : (
        <form onSubmit={submit}>
          <label>
            Name
            <input
              name="title"
              required
              maxLength={100}
              placeholder="e.g. Remote Friday"
              defaultValue={rule?.name}
            />
          </label>
          <label>
            Repeats
            <select
              value={weekday}
              disabled={!!id}
              onChange={(event) =>
                setWeekday(event.target.value as RecurringInput["weekday"])
              }
            >
              {weekdays.map((day) => (
                <option key={day} value={day}>
                  Every other {day}
                </option>
              ))}
            </select>
          </label>
          <label>
            Known occurrence
            <input
              name="anchorDate"
              type="date"
              required
              min="0001-01-01"
              max="9999-12-31"
              defaultValue={rule?.anchorDate}
            />
          </label>
          <p className="form-note">
            Choose one {weekday} that follows this version. Dates two weeks
            apart, before or after the anchor, use it too.{" "}
            {rule
              ? `Current anchor: ${formatDate(rule.anchorDate)}.`
              : "After adding it, tap its blocks to change this version of your day."}
          </p>
          {(error || storageError) && (
            <p className="form-error" role="alert">
              {error || storageError}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy
              ? "Saving…"
              : id
                ? "Save alternating routine"
                : "Add alternating routine"}
          </button>
          {id && (
            <button
              ref={removeRef}
              className="text-link delete-button"
              type="button"
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              Remove alternating routine
            </button>
          )}
        </form>
      )}
    </Modal>
  );
}
