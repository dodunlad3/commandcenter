"use client";
import { Coffee, Flame, Leaf, Plus, Sunrise } from "lucide-react";
import { localDate } from "@/lib/tasks";
import {
  RightNowCard,
  UpNextCard,
  StillOpenCard,
  EnergySuggestions,
  TodayTimeline,
} from "./today-agenda";
import { useDay } from "./task-provider";
import { Panel, TaskRow } from "./task-components";
export function TodayDashboard() {
  const {
    tasks: allTasks,
    ready,
    storageError,
    now,
    energy,
    setEnergy,
    capture,
  } = useDay();
  if (!now || !ready)
    return (
      <div className="loading" role="status">
        {storageError
          ? "Your tasks are unavailable until storage is restored."
          : "Getting your day ready…"}
      </div>
    );
  const tasks = allTasks.filter(
    (task) => task.scheduledDate === localDate(now),
  );
  const done = tasks.filter((t) => t.completed).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const priorities = tasks.filter((t) => t.priority === "high").slice(0, 3);
  const hour = now.getHours();
  return (
    <>
      <div className="day-heading">
        <div>
          <div className="date-line">
            <Sunrise size={18} />
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <h1>
            Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}
            <span>.</span>
          </h1>
          <p>One thing at a time. You’ve got this.</p>
        </div>
        <div className="day-badge">
          <span className="small-dot" /> A fresh perspective, every day
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="left-column">
          <RightNowCard />
          <UpNextCard />
          <StillOpenCard />
          <Panel
            title="Top 3 priorities"
            aside={
              <span className="counter">
                {priorities.filter((t) => t.completed).length} /{" "}
                {priorities.length}
              </span>
            }
          >
            {priorities.map((task, i) => (
              <TaskRow key={task.id} task={task} index={i} />
            ))}
            {!priorities.length && (
              <p className="muted">
                No high-priority tasks scheduled for today.
              </p>
            )}
            <div className="panel-footnote">
              A good day starts with what matters most.
            </div>
          </Panel>
          <section className="capture-card">
            <div className="capture-symbol">
              <Plus size={23} />
            </div>
            <div>
              <h3>Something on your mind?</h3>
              <p>A task, an idea, a little reminder.</p>
            </div>
            <button className="outline-button" onClick={capture}>
              Capture it
            </button>
          </section>
        </div>
        <div className="right-column">
          <Panel
            title="Your daily rhythm"
            aside={<span className="subtle">TODAY</span>}
          >
            <div className="progress-content">
              <div
                className="progress-ring"
                style={{
                  background: `conic-gradient(var(--accent) ${progress}%, var(--border) 0)`,
                }}
              >
                <div>
                  <strong>
                    {progress}
                    <span>%</span>
                  </strong>
                  <span>complete</span>
                </div>
              </div>
              <div>
                <h3>
                  {done} of {tasks.length} tasks
                </h3>
                <p>
                  {progress === 100
                    ? "Look at you. All done."
                    : "Small steps add up."}
                </p>
                <div
                  className="progress-blocks"
                  aria-label={`${progress}% complete`}
                >
                  {tasks.map((t) => (
                    <span key={t.id} className={t.completed ? "filled" : ""} />
                  ))}
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="How’s your energy?" className="energy-panel">
            <div
              className="energy-options"
              role="group"
              aria-label="Energy level"
            >
              {[
                { label: "Low", icon: Leaf },
                { label: "Normal", icon: Coffee },
                { label: "Locked In", icon: Flame },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  aria-pressed={energy === label}
                  className={energy === label ? "selected" : ""}
                  onClick={() => setEnergy(label)}
                >
                  <Icon size={19} />
                  {label}
                </button>
              ))}
            </div>
            <EnergySuggestions />
          </Panel>
          <TodayTimeline />
        </div>
      </div>
    </>
  );
}
