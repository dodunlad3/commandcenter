"use client";
import {
  Check,
  Clock3,
  Coffee,
  Flame,
  Leaf,
  Plus,
  Sunrise,
} from "lucide-react";
import Link from "next/link";
import { useDay } from "./app-shell";
import {
  CategoryTag,
  CompletionButton,
  formatTime,
  Panel,
  TaskRow,
} from "./task-components";
export function TodayDashboard() {
  const { tasks, now, energy, setEnergy, capture, toggle } = useDay();
  if (!now)
    return (
      <div className="loading" role="status">
        Getting your day ready…
      </div>
    );
  const done = tasks.filter((t) => t.completed).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const remaining = tasks
    .filter((t) => !t.completed)
    .sort((a, b) =>
      (a.scheduledTime || "99:99").localeCompare(b.scheduledTime || "99:99"),
    );
  const current = remaining[0];
  const next = remaining[1];
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
          <section className="focus-card">
            <div className="focus-top">
              <span className="eyebrow">
                <span className="pulse-dot" /> RIGHT NOW
              </span>
              <span className="focus-count">FOCUS / 01</span>
            </div>
            {current ? (
              <>
                <CategoryTag category={current.category} />
                <h2>{current.title}</h2>
                <p>
                  {current.description ||
                    "Make a little room and take the next step."}
                </p>
                <div className="focus-bottom">
                  <span>
                    <Clock3 size={17} />
                    {current.estimatedMinutes} min{" "}
                    <span className="meta-divider">/</span>{" "}
                    {formatTime(current.scheduledTime)}
                  </span>
                  <button
                    className="primary-button"
                    onClick={() => toggle(current.id)}
                  >
                    <Check size={18} /> Mark complete
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>A little breathing room.</h2>
                <p>You’ve completed everything for today. Enjoy the space.</p>
                <button className="primary-button" onClick={capture}>
                  <Plus size={18} />
                  Capture something new
                </button>
              </>
            )}
          </section>
          <Panel
            title="Up next"
            aside={<span className="subtle">KEEP THE MOMENTUM</span>}
            className="up-next"
          >
            {next ? (
              <div className="next-content">
                <span className={`next-icon ${next.category}`}>
                  <Clock3 size={24} />
                </span>
                <div>
                  <h3>{next.title}</h3>
                  <div className="task-meta">
                    <CategoryTag category={next.category} />
                    <span>{formatTime(next.scheduledTime)}</span>
                    <span>{next.estimatedMinutes} min</span>
                  </div>
                </div>
                <CompletionButton task={next} />
              </div>
            ) : (
              <p className="muted">
                Nothing waiting. Take a moment for yourself.
              </p>
            )}
          </Panel>
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
            <p className="energy-note">
              {energy === "Low"
                ? "Go gently. Make space for a slower pace."
                : energy === "Locked In"
                  ? "Find your flow. Give one thing your full attention."
                  : "A steady pace is a great place to be."}
            </p>
          </Panel>
          <Panel
            title="The shape of your day"
            aside={
              <Link className="text-link" href="/tasks">
                View tasks
              </Link>
            }
            className="timeline-panel"
          >
            <div className="timeline">
              {[...tasks]
                .sort((a, b) =>
                  (a.scheduledTime || "99:99").localeCompare(
                    b.scheduledTime || "99:99",
                  ),
                )
                .map((task) => (
                  <div
                    key={task.id}
                    className={`timeline-item ${task.completed ? "completed" : ""} ${task.id === current?.id ? "current" : ""}`}
                  >
                    <span className="timeline-time">
                      {formatTime(task.scheduledTime)}
                    </span>
                    <span className="timeline-point">
                      {task.completed && <Check size={10} />}
                    </span>
                    <div className="timeline-copy">
                      <span className={`timeline-category ${task.category}`}>
                        {task.category}
                        {task.id === current?.id && (
                          <span className="now-label">NEXT TO FOCUS</span>
                        )}
                      </span>
                      <h3>{task.title}</h3>
                      <span className="timeline-duration">
                        {task.estimatedMinutes} min
                      </span>
                    </div>
                    <CompletionButton task={task} />
                  </div>
                ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
