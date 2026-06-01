import { useState, useEffect } from "react";
import { Task, Status } from "./types";
import Header from "./components/Header";
import KanbanBoard from "./components/KanbanBoard";
import AddTaskModal from "./components/AddTaskModal";
import AIAssistant from "./components/AIAssistant";
import UpgradeBanner from "./components/UpgradeBanner";
import AuthPage from "./pages/AuthPage";
import PricingPage from "./pages/PricingPage";
import { useAuth } from "./contexts/AuthContext";
import { useLang } from "./LanguageContext";

type Page = "app" | "pricing";

function AppInner() {
  const { isRTL } = useLang();
  const { user, token, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [page, setPage] = useState<Page>("app");

  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token]);

  // Check for Stripe redirect query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade") === "success") {
      // Clean URL and show app
      window.history.replaceState({}, "", "/");
      setPage("app");
    } else if (params.get("upgrade") === "cancelled") {
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const authHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const fetchTasks = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as Task[];
        setTasks(data);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (title: string, description: string, priority: Task["priority"]) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title, description, priority }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      if (data.error === "limit") {
        setPage("pricing");
        return;
      }
      throw new Error(data.message || data.error || "Failed to add task");
    }

    const newTask = (await res.json()) as Task;
    setTasks((prev) => [...prev, newTask]);
  };

  const updateTaskStatus = async (id: string, status: Status) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Task;
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  };

  const deleteTask = async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token ?? ""}` },
    });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  if (page === "pricing") {
    return <PricingPage onBack={() => setPage("app")} />;
  }

  const showUpgradeBanner = user?.plan === "free" && tasks.length >= 4;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
      <Header
        taskCount={tasks.length}
        onAddTask={() => setShowAddModal(true)}
        aiOpen={aiOpen}
        onToggleAI={() => setAiOpen((v) => !v)}
        onPricing={() => setPage("pricing")}
        onLogout={logout}
        userName={user?.name ?? ""}
        userPlan={user?.plan ?? "free"}
      />

      {showUpgradeBanner && (
        <UpgradeBanner
          taskCount={tasks.length}
          onUpgrade={() => setPage("pricing")}
        />
      )}

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
          <aside className="w-96 border-l border-slate-700 flex flex-col bg-slate-900 animate-slide-in-right">
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

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <AppInner />;
}

export default App;
