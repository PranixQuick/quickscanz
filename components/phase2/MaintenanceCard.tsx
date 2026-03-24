"use client";

import { useState, useTransition } from "react";
import {
  addMaintenanceTask,
  markMaintenanceDone,
  deleteMaintenanceTask,
  type MaintenanceTask,
} from "@/lib/actions/phase2";
import toast from "react-hot-toast";

// Common maintenance tasks by category (suggestions)
const TASK_SUGGESTIONS: Record<string, { task: string; intervalDays: number }[]> = {
  "Air Conditioner":  [
    { task: "Clean filters", intervalDays: 30 },
    { task: "Service (full)", intervalDays: 180 },
  ],
  "Refrigerator":     [{ task: "Clean coils", intervalDays: 180 }, { task: "Check door seals", intervalDays: 90 }],
  "Washing Machine":  [{ task: "Clean drum", intervalDays: 30 }, { task: "Service", intervalDays: 365 }],
  "Laptop":           [{ task: "Clean vents", intervalDays: 180 }, { task: "Battery calibration", intervalDays: 90 }],
  "Smartphone":       [{ task: "Software update", intervalDays: 30 }],
  "Television":       [{ task: "Clean vents", intervalDays: 90 }],
  "Geyser":           [{ task: "Annual service", intervalDays: 365 }],
};

interface Props {
  productId: string;
  category: string | null;
  tasks: MaintenanceTask[];
}

export default function MaintenanceCard({ productId, category, tasks }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newInterval, setNewInterval] = useState("90");

  const suggestions = category ? (TASK_SUGGESTIONS[category] || []) : [];

  function getDaysUntilDue(nextDue: string | null): number | null {
    if (!nextDue) return null;
    return Math.ceil((new Date(nextDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  function handleAdd() {
    if (!newTask.trim()) return;
    startTransition(async () => {
      const r = await addMaintenanceTask(productId, newTask.trim(), parseInt(newInterval));
      if (r.success) { toast.success("Maintenance task added"); setShowAdd(false); setNewTask(""); }
      else toast.error(r.error || "Failed to add");
    });
  }

  function handleAddSuggestion(task: string, intervalDays: number) {
    startTransition(async () => {
      const r = await addMaintenanceTask(productId, task, intervalDays);
      if (r.success) toast.success(`Added: ${task}`);
      else toast.error(r.error || "Failed to add");
    });
  }

  function handleDone(taskId: string) {
    startTransition(async () => {
      const r = await markMaintenanceDone(taskId, productId);
      if (r.success) toast.success("Marked as done ✓");
      else toast.error(r.error || "Failed");
    });
  }

  function handleDelete(taskId: string) {
    startTransition(async () => {
      const r = await deleteMaintenanceTask(taskId, productId);
      if (r.success) toast.success("Task removed");
      else toast.error(r.error || "Failed");
    });
  }

  const overdue = tasks.filter((t) => {
    const d = getDaysUntilDue(t.next_due_at);
    return d !== null && d < 0;
  });
  const upcoming = tasks.filter((t) => {
    const d = getDaysUntilDue(t.next_due_at);
    return d !== null && d >= 0;
  });

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Maintenance</p>
          {overdue.length > 0 && (
            <span className="text-[10px] bg-blush-100 text-blush-600 px-2 py-0.5 rounded-full font-medium">
              {overdue.length} overdue
            </span>
          )}
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="text-[11px] text-sand-500 hover:text-sand-400 transition-colors">
          + Add task
        </button>
      </div>

      {/* Suggestions for empty state */}
      {tasks.length === 0 && suggestions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-ink-400 mb-2">Suggested for {category}:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.task}
                onClick={() => handleAddSuggestion(s.task, s.intervalDays)}
                disabled={isPending}
                className="text-[11px] bg-cream-100 hover:bg-cream-200 text-ink-600 px-2.5 py-1 rounded-lg transition-colors border border-cream-200"
              >
                + {s.task} (every {s.intervalDays}d)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 bg-cream-100 rounded-xl space-y-2">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Task name (e.g. Clean filters)"
            className="w-full px-3 py-2 bg-white border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-ink-500 whitespace-nowrap">Every</label>
            <select
              value={newInterval}
              onChange={(e) => setNewInterval(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-cream-200 rounded-xl text-sm focus:outline-none"
            >
              {[30, 60, 90, 180, 365].map((d) => (
                <option key={d} value={d}>{d} days{d === 365 ? " (1 year)" : ""}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 btn-secondary py-2 text-xs">Cancel</button>
            <button onClick={handleAdd} disabled={!newTask || isPending}
              className="flex-1 btn-primary py-2 text-xs disabled:opacity-40">
              {isPending ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <p className="text-xs text-ink-300 text-center py-3">
          No maintenance tasks. Add tasks to track service schedules.
        </p>
      ) : (
        <div className="space-y-2">
          {[...overdue, ...upcoming].map((task) => {
            const daysUntil = getDaysUntilDue(task.next_due_at);
            const isOverdue = daysUntil !== null && daysUntil < 0;

            return (
              <div key={task.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                isOverdue ? "bg-blush-50 border-blush-200" : "bg-cream-50 border-cream-200"
              }`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isOverdue ? "text-blush-700" : "text-ink-800"}`}>
                    {task.task_name}
                  </p>
                  <p className="text-[10px] text-ink-400">
                    {isOverdue
                      ? `Overdue by ${Math.abs(daysUntil!)} days`
                      : daysUntil !== null
                      ? `Due in ${daysUntil} days`
                      : `Every ${task.interval_days} days`}
                    {task.last_done_at ? ` · Last done: ${new Date(task.last_done_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleDone(task.id)}
                    disabled={isPending}
                    className="text-[11px] bg-sage-100 text-sage-700 px-2 py-1 rounded-lg hover:bg-sage-200 transition-colors"
                  >
                    ✓ Done
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    disabled={isPending}
                    className="text-[11px] text-ink-300 hover:text-blush-500 px-1.5 py-1 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
                                         }
