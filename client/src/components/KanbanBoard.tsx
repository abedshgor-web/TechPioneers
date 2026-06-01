import { useState, FC } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { Task, Status } from "../types";
import TaskCard from "./TaskCard";
import { useLang } from "../LanguageContext";

interface ColumnConfig {
  id: Status;
  title: string;
  headerClass: string;
  borderClass: string;
  bgClass: string;
  badgeClass: string;
  dotClass: string;
}

interface ColumnProps extends ColumnConfig {
  tasks: Task[];
  onDelete: (id: string) => void;
  dropHere: string;
}

const ColumnPanel: FC<ColumnProps> = ({
  id,
  title,
  headerClass,
  borderClass,
  bgClass,
  badgeClass,
  dotClass,
  tasks,
  onDelete,
  dropHere,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={`flex flex-col rounded-xl border ${borderClass} ${bgClass} transition-all duration-150 flex-shrink-0 w-[80vw] sm:w-auto sm:flex-1 snap-center ${
        isOver ? "ring-2 ring-indigo-400" : ""
      }`}
    >
      <div
        className={`px-4 py-3 rounded-t-xl ${headerClass} border-b ${borderClass}`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
          <h2 className="font-semibold text-sm tracking-wide">{title}</h2>
          <span
            className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 p-3 space-y-2 min-h-[200px] overflow-y-auto scrollbar-thin"
      >
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm">
            <svg
              className="w-8 h-8 mb-2 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span className="opacity-50 text-xs italic">{dropHere}</span>
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
};

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: Status) => void;
  onDelete: (id: string) => void;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: "todo",
    title: "",
    headerClass: "bg-slate-700/60 text-slate-200",
    borderClass: "border-slate-600",
    bgClass: "bg-slate-800/40",
    badgeClass: "bg-slate-600 text-slate-200",
    dotClass: "bg-slate-400",
  },
  {
    id: "in-progress",
    title: "",
    headerClass: "bg-blue-900/60 text-blue-200",
    borderClass: "border-blue-700/50",
    bgClass: "bg-blue-950/30",
    badgeClass: "bg-blue-700 text-blue-100",
    dotClass: "bg-blue-400",
  },
  {
    id: "done",
    title: "",
    headerClass: "bg-emerald-900/60 text-emerald-200",
    borderClass: "border-emerald-700/50",
    bgClass: "bg-emerald-950/30",
    badgeClass: "bg-emerald-700 text-emerald-100",
    dotClass: "bg-emerald-400",
  },
];

const KanbanBoard: FC<KanbanBoardProps> = ({
  tasks,
  onStatusChange,
  onDelete,
}) => {
  const { tr } = useLang();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as Status;
    const validStatuses: Status[] = ["todo", "in-progress", "done"];
    if (validStatuses.includes(newStatus)) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== newStatus) {
        onStatusChange(taskId, newStatus);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory" style={{ WebkitOverflowScrolling: "touch" }}>
        {COLUMNS.map((col) => {
          const titles: Record<string, string> = {
            todo: tr.todo,
            "in-progress": tr.inProgress,
            done: tr.done,
          };
          return (
          <ColumnPanel
            key={col.id}
            {...col}
            title={titles[col.id]}
            tasks={tasks.filter((t) => t.status === col.id)}
            onDelete={onDelete}
            dropHere={tr.dropHere}
          />
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 scale-105 opacity-90">
            <TaskCard task={activeTask} onDelete={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
