"use client";
import { Plus, Layers } from "lucide-react";
import { useDay } from "./task-provider";
import { SchedulePage } from "./schedule-page";
import { TaskManager } from "./task-manager";
import { Panel, TaskRow } from "./task-components";
const categoryMap: Record<string, string> = {
  Work: "work",
  Fitness: "fitness",
  Content: "content",
  Projects: "projects",
  Money: "money",
  Home: "home",
};
export function SectionPage({ section }: { section: string }) {
  const { tasks, capture, ready, storageError } = useDay();
  const filtered =
    section === "Tasks"
      ? tasks
      : tasks.filter((t) => t.category === categoryMap[section]);
  if (section === "Schedule") return <SchedulePage />;
  return (
    <>
      <div className="day-heading">
        <div>
          <span className="eyebrow">YOUR SPACE</span>
          <h1>
            {section}
            <span>.</span>
          </h1>
          <p>
            {section === "Tasks"
              ? "A little clarity for everything on your plate."
              : section === "Journal"
                ? "A space to reflect, coming in a future version."
                : `Your ${section.toLowerCase()} tasks, all in one place.`}
          </p>
        </div>
        {section !== "Journal" && (
          <button
            className="primary-button"
            onClick={capture}
            disabled={!ready}
          >
            <Plus size={18} /> Quick capture
          </button>
        )}
      </div>
      {section === "Tasks" ? (
        <TaskManager />
      ) : (
        <Panel
          title={section === "Journal" ? "Room for reflection" : "Your tasks"}
          className="section-list"
        >
          {!ready && section !== "Journal" ? (
            <p className="muted" role="status">
              {storageError
                ? "Your tasks are unavailable until storage is restored."
                : "Loading your tasks…"}
            </p>
          ) : filtered.length ? (
            filtered.map((t) => <TaskRow key={t.id} task={t} showSchedule />)
          ) : (
            <div className="empty-state">
              <Layers size={32} />
              <h3>
                {section === "Journal"
                  ? "Your journal is on the horizon."
                  : "A little room to breathe."}
              </h3>
              <p>
                {section === "Journal"
                  ? "Daywell’s first builds focus on tasks and Today. Journaling will have its own space as Daywell grows."
                  : "No tasks in this space. Capture one whenever you’re ready."}
              </p>
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
