"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  categories,
  formatDate,
  localDate,
  validateTaskInput,
  type Task,
  type TaskInput,
} from "@/lib/tasks";
import { useDay } from "./task-provider";
import { CategoryTag, formatTime } from "./task-components";

function TaskModal({
  title,
  eyebrow,
  children,
  onClose,
  focusTitle = false,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  onClose: () => void;
  focusTitle?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = ref.current;
    element?.showModal();
    if (focusTitle)
      element?.querySelector<HTMLInputElement>('input[name="title"]')?.focus();
    return () => {
      element?.close();
      if (previous?.isConnected) previous.focus();
      else
        document.querySelector<HTMLButtonElement>(".capture-button")?.focus();
    };
  }, [focusTitle]);
  return (
    <div className="modal-backdrop">
      <dialog
        ref={ref}
        className="capture-dialog"
        aria-labelledby="task-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 id="task-dialog-title">{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close task dialog"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
      </dialog>
    </div>
  );
}
function TaskEditor({ task, onSaved }: { task?: Task; onSaved: () => void }) {
  const { createTask, updateTask, storageError } = useDay();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const input: TaskInput = {
      title: String(data.get("title")).trim(),
      description: String(data.get("description")).trim(),
      category: data.get("category") as TaskInput["category"],
      priority: data.get("priority") as TaskInput["priority"],
      scheduledDate: String(data.get("date")),
      scheduledTime: String(data.get("time")) || null,
      estimatedMinutes: Number(data.get("duration")),
    };
    const problem = validateTaskInput(input);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setBusy(true);
    const saved = task
      ? await updateTask(task.id, input)
      : await createTask(input);
    setBusy(false);
    if (saved) onSaved();
  }
  return (
    <form onSubmit={submit}>
      <label>
        What needs doing?
        <input
          name="title"
          defaultValue={task?.title}
          required
          maxLength={160}
          placeholder="Give it a name…"
          aria-describedby={error ? "task-form-error" : undefined}
        />
      </label>
      <label>
        A little context
        <textarea
          name="description"
          defaultValue={task?.description}
          maxLength={4000}
          rows={2}
          placeholder="Optional details"
        />
      </label>
      <div className="form-grid">
        <label>
          Category
          <select name="category" defaultValue={task?.category || "personal"}>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select name="priority" defaultValue={task?.priority || "medium"}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label>
          Scheduled date
          <input
            name="date"
            type="date"
            required
            min="0001-01-01"
            max="9999-12-31"
            defaultValue={task?.scheduledDate || localDate()}
          />
        </label>
        <label>
          Scheduled time
          <input
            name="time"
            type="time"
            defaultValue={task?.scheduledTime || ""}
          />
        </label>
        <label>
          Minutes
          <input
            name="duration"
            type="number"
            min="1"
            max="1440"
            step="1"
            defaultValue={task?.estimatedMinutes || 25}
            required
          />
        </label>
      </div>
      <p className="form-note">
        Saved in this browser. Choose any date, or leave the time open.
      </p>
      {(error || storageError) && (
        <p id="task-form-error" className="form-error" role="alert">
          {error || storageError}
        </p>
      )}
      <button type="submit" className="primary-button" disabled={busy}>
        {busy ? "Saving…" : task ? "Save changes" : "Capture task"}
        {!busy && (task ? <Check size={18} /> : <Plus size={18} />)}
      </button>
    </form>
  );
}
function TaskDetails({
  task,
  onDeleted,
}: {
  task: Task;
  onDeleted: () => void;
}) {
  const { setDialog, deleteTask, toggle, storageError } = useDay();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirm) cancelRef.current?.focus();
  }, [confirm]);
  async function remove() {
    setBusy(true);
    const saved = await deleteTask(task.id);
    setBusy(false);
    if (saved) onDeleted();
  }
  async function complete() {
    setBusy(true);
    await toggle(task.id);
    setBusy(false);
  }
  return (
    <>
      <div className="task-detail-title">
        <CategoryTag category={task.category} />
        <h3>{task.title}</h3>
        <p>{task.description || "No description added."}</p>
      </div>
      <dl className="task-details-grid">
        <div>
          <dt>Priority</dt>
          <dd>{task.priority}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{task.completed ? "Completed" : "Open"}</dd>
        </div>
        <div>
          <dt>Scheduled date</dt>
          <dd>{formatDate(task.scheduledDate)}</dd>
        </div>
        <div>
          <dt>Scheduled time</dt>
          <dd>{formatTime(task.scheduledTime)}</dd>
        </div>
        <div>
          <dt>Estimated duration</dt>
          <dd>{task.estimatedMinutes} minutes</dd>
        </div>
        <div>
          <dt>Recurring</dt>
          <dd>{task.recurring ? "Yes" : "No"}</dd>
        </div>
        <div className="detail-wide">
          <dt>Created</dt>
          <dd>{new Date(task.createdAt).toLocaleString()}</dd>
        </div>
      </dl>
      {storageError && (
        <p className="form-error" role="alert">
          {storageError}
        </p>
      )}
      {confirm ? (
        <section className="delete-confirmation" aria-labelledby="delete-title">
          <h3 id="delete-title">Delete this task?</h3>
          <p>“{task.title}” will be permanently removed.</p>
          <div className="dialog-actions">
            <button
              ref={cancelRef}
              className="outline-button"
              disabled={busy}
              onClick={() => {
                setConfirm(false);
                requestAnimationFrame(() => deleteRef.current?.focus());
              }}
            >
              Keep task
            </button>
            <button
              className="danger-button"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </section>
      ) : (
        <div className="dialog-actions">
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => setDialog({ mode: "edit", id: task.id })}
          >
            <Pencil size={18} /> Edit task
          </button>
          <button
            className="outline-button"
            disabled={busy}
            onClick={() => void complete()}
          >
            {busy
              ? "Saving…"
              : task.completed
                ? "Reopen task"
                : "Mark complete"}
          </button>
          <button
            ref={deleteRef}
            className="icon-button delete-button"
            disabled={busy}
            aria-label="Delete task"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={20} />
          </button>
        </div>
      )}
    </>
  );
}
export function TaskDialogs() {
  const { dialog, setDialog, tasks } = useDay();
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const task =
    dialog && dialog.mode !== "create"
      ? tasks.find((t) => t.id === dialog.id)
      : undefined;
  const close = () => setDialog(null);
  return (
    <>
      {dialog && (
        <TaskModal
          key={`${dialog.mode}-${dialog.mode === "create" ? "new" : dialog.id}`}
          title={
            dialog.mode === "create"
              ? "Quick capture"
              : dialog.mode === "edit"
                ? "Edit task"
                : "Task details"
          }
          eyebrow={
            dialog.mode === "create"
              ? "GET IT OFF YOUR MIND"
              : "YOUR PERSONAL SPACE"
          }
          onClose={close}
          focusTitle={dialog.mode !== "details"}
        >
          {dialog.mode === "create" ? (
            <TaskEditor
              onSaved={() => {
                close();
                setNotice("Captured. A little less on your mind.");
              }}
            />
          ) : task ? (
            dialog.mode === "edit" ? (
              <TaskEditor
                task={task}
                onSaved={() => {
                  setDialog({ mode: "details", id: task.id });
                  setNotice("Changes saved.");
                }}
              />
            ) : (
              <TaskDetails
                task={task}
                onDeleted={() => {
                  close();
                  setNotice("Task deleted.");
                }}
              />
            )
          ) : (
            <p className="muted">
              This task no longer exists. Close this view to continue.
            </p>
          )}
        </TaskModal>
      )}
      <div className="toast" role="status" aria-live="polite">
        {notice}
      </div>
    </>
  );
}
