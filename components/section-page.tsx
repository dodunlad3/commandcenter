"use client";
import { Plus, Layers } from "lucide-react";
import { useDay } from "./app-shell";
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
  const { tasks, capture } = useDay();
  const filtered =
    section === "Tasks"
      ? tasks
      : tasks.filter((t) => t.category === categoryMap[section]);
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
              ? "Everything on your plate today."
              : section === "Journal"
                ? "A space to reflect, coming in a future version."
                : `Today’s ${section.toLowerCase()} tasks, all in one place.`}
          </p>
        </div>
        {section !== "Journal" && (
          <button className="primary-button" onClick={capture}>
            <Plus size={18} /> Quick capture
          </button>
        )}
      </div>
      <Panel
        title={section === "Journal" ? "Room for reflection" : "Today’s tasks"}
        className="section-list"
      >
        {filtered.length ? (
          filtered.map((t) => <TaskRow key={t.id} task={t} />)
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
                ? "Version 1 focuses on Today. Journaling will have its own space as Daywell grows."
                : "No tasks in this space today. Capture one whenever you’re ready."}
            </p>
          </div>
        )}
      </Panel>
    </>
  );
}
