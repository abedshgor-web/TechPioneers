import { useState, useEffect } from "react";
import { Task, Status } from "./types";
import Header from "./components/Header";
import KanbanBoard from "./components/KanbanBoard";
import AddTaskModal from "./components/AddTaskModal";
import AIAssistant from "./components/AIAssistant";
import { useLang } from "./LanguageContext";

function App() {
  const { lang } = useLang();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (title: string, description: string, priority: Task["priority"]) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority }),
    });
    if (res.ok) {
      const newTask = await res.json();
      setTasks((prev) => [...prev, newTask]);
    }
  };

  const updateTaskStatus = async (id: string, status: Status) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  };

  const deleteTask = async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"}>
      <Header
        taskCount={tasks.length}
        onAddTask={() => setShowAddModal(true)}
        aiOpen={aiOpen}
        onToggleAI={() => setAiOpen((v) => !v)}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <KanbanBoard
              tasks={tasks}
              onStatusChange={updateTaskStatus}
              onDelete={deleteTask}
            />
          )}
        </main>

        {aiOpen && (
          <aside className="w-96 border-l border-slate-700 flex flex-col bg-slate-900">
            <AIAssistant tasks={tasks} />
          </aside>
        )}
      </div>

      {showAddModal && (
        <AddTaskModal
          onAdd={addTask}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

export default App;
