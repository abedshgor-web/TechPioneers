import { useState, FC, FormEvent } from "react";
import { Priority } from "../types";
import { useLang } from "../LanguageContext";

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (title: string, description: string, priority: Priority) => void;
}

const AddTaskModal: FC<AddTaskModalProps> = ({ onClose, onAdd }) => {
  const { tr } = useLang();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(tr.titleRequired);
      return;
    }
    onAdd(title.trim(), description.trim(), priority);
    onClose();
  };

  const priorityLabels: Record<Priority, string> = {
    high: tr.high,
    medium: tr.medium,
    low: tr.low,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{tr.addNewTask}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {tr.title} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder={tr.titlePlaceholder}
              className="w-full bg-slate-700 border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-400 outline-none transition-colors"
              autoFocus
            />
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">{tr.description}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr.descPlaceholder}
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-400 outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">{tr.priority}</label>
            <div className="grid grid-cols-3 gap-2">
              {(["high", "medium", "low"] as Priority[]).map((p) => {
                const colors = {
                  high: { active: "bg-red-500/20 border-red-500 text-red-300", inactive: "bg-slate-700 border-slate-600 text-slate-400 hover:border-red-500/50" },
                  medium: { active: "bg-yellow-500/20 border-yellow-500 text-yellow-300", inactive: "bg-slate-700 border-slate-600 text-slate-400 hover:border-yellow-500/50" },
                  low: { active: "bg-green-500/20 border-green-500 text-green-300", inactive: "bg-slate-700 border-slate-600 text-slate-400 hover:border-green-500/50" },
                };
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`border rounded-lg py-2 text-sm font-medium transition-all duration-150 ${priority === p ? colors[p].active : colors[p].inactive}`}
                  >
                    {priorityLabels[p]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {tr.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {tr.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
