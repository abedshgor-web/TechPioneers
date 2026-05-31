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

  const priorityConfig: Record<Priority, { label: string; active: string; inactive: string; dot: string }> = {
    high: {
      label: tr.high,
      dot: "bg-red-400",
      active: "bg-red-500/20 border-red-400 text-red-300 shadow-red-500/20 shadow-inner",
      inactive: "bg-slate-700/80 border-slate-600 text-slate-400 hover:border-red-500/50 hover:text-red-300/70",
    },
    medium: {
      label: tr.medium,
      dot: "bg-amber-400",
      active: "bg-amber-500/20 border-amber-400 text-amber-300 shadow-amber-500/20 shadow-inner",
      inactive: "bg-slate-700/80 border-slate-600 text-slate-400 hover:border-amber-500/50 hover:text-amber-300/70",
    },
    low: {
      label: tr.low,
      dot: "bg-emerald-400",
      active: "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-emerald-500/20 shadow-inner",
      inactive: "bg-slate-700/80 border-slate-600 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-300/70",
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-600/80 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-500/20 border border-indigo-500/40 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-white">{tr.addNewTask}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 active:scale-90 transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {tr.title} <span className="text-red-400 normal-case tracking-normal">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder={tr.titlePlaceholder}
              className="w-full bg-slate-700/80 border border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-150"
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {tr.description}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr.descPlaceholder}
              rows={3}
              className="w-full bg-slate-700/80 border border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-150 resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {tr.priority}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["high", "medium", "low"] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`border rounded-xl py-2.5 text-sm font-medium transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5
                    ${priority === p ? priorityConfig[p].active : priorityConfig[p].inactive}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig[p].dot}`} />
                  {priorityConfig[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
            >
              {tr.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white py-3 rounded-xl text-sm font-semibold transition-all duration-150 shadow-lg shadow-indigo-500/25"
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
