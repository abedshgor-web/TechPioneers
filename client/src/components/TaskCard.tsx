import { FC } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "../types";

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
}

const priorityConfig = {
  high: {
    label: "High",
    classes: "bg-red-500/20 text-red-300 border border-red-500/30",
    dot: "bg-red-400",
  },
  medium: {
    label: "Medium",
    classes: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    dot: "bg-yellow-400",
  },
  low: {
    label: "Low",
    classes: "bg-green-500/20 text-green-300 border border-green-500/30",
    dot: "bg-green-400",
  },
};

const TaskCard: FC<TaskCardProps> = ({ task, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const priority = priorityConfig[task.priority];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-800 rounded-lg p-3 shadow-md border border-slate-700 hover:border-slate-500 transition-all duration-150 group select-none ${
        isDragging ? "shadow-2xl ring-2 ring-indigo-500" : ""
      }`}
    >
      {/* Drag handle + delete */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div
          {...attributes}
          {...listeners}
          className="flex-1 cursor-grab active:cursor-grabbing"
        >
          <h3 className="text-sm font-semibold text-slate-100 leading-snug">
            {task.title}
          </h3>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-slate-500 hover:text-red-400 p-0.5 rounded flex-shrink-0"
          title="Delete task"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-slate-400 mb-3 leading-relaxed line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${priority.classes}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
          {priority.label}
        </span>
        <span className="text-xs text-slate-500">{formatDate(task.createdAt)}</span>
      </div>
    </div>
  );
};

export default TaskCard;
