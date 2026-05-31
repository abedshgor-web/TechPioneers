import { FC } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "../types";
import { useLang } from "../LanguageContext";

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
}

const TaskCard: FC<TaskCardProps> = ({ task, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  const { tr } = useLang();

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const priorityConfig = {
    high: {
      label: tr.high,
      badge: "bg-red-500/15 text-red-300 border border-red-500/25",
      dot: "bg-red-400",
      bar: "bg-red-500",
    },
    medium: {
      label: tr.medium,
      badge: "bg-amber-500/15 text-amber-300 border border-amber-500/25",
      dot: "bg-amber-400",
      bar: "bg-amber-500",
    },
    low: {
      label: tr.low,
      badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
      dot: "bg-emerald-400",
      bar: "bg-emerald-500",
    },
  };

  const priority = priorityConfig[task.priority];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-slate-800/90 rounded-xl border border-slate-700/80 shadow-md overflow-hidden
        hover:border-slate-500/80 hover:shadow-lg hover:-translate-y-0.5
        transition-all duration-200 group select-none animate-slide-up
        ${isDragging ? "shadow-2xl ring-2 ring-indigo-400/60 scale-105" : ""}
      `}
    >
      {/* Priority color bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${priority.bar}`} />

      <div className="p-3.5 pt-4">
        {/* Title row */}
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
            className="opacity-0 group-hover:opacity-100 -mt-0.5 -mr-0.5 p-1 rounded-lg
              text-slate-500 hover:text-red-400 hover:bg-red-500/10
              active:scale-90 transition-all duration-150 flex-shrink-0"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {task.description && (
          <p className="text-xs text-slate-400 mb-3 leading-relaxed line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${priority.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
            {priority.label}
          </span>
          <span className="text-xs text-slate-500">{formatDate(task.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
