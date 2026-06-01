import { FC } from "react";
import { useLang } from "../LanguageContext";
import { Lang, langLabels } from "../i18n";

interface HeaderProps {
  taskCount: number;
  onAddTask: () => void;
  aiOpen: boolean;
  onToggleAI: () => void;
  onPricing: () => void;
  onLogout: () => void;
  userName: string;
  userPlan: "free" | "pro";
}

const Header: FC<HeaderProps> = ({
  taskCount, onAddTask, aiOpen, onToggleAI, onPricing, onLogout, userName, userPlan,
}) => {
  const { tr, lang, setLang } = useLang();

  return (
    <header className="bg-slate-900/95 backdrop-blur border-b border-slate-700/60 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-lg sticky top-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight leading-none">
            TaskFlow <span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{tr.tasksTotal(taskCount)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Language */}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="h-9 px-2 rounded-xl text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 outline-none cursor-pointer"
        >
          {(Object.keys(langLabels) as Lang[]).map((l) => (
            <option key={l} value={l}>{langLabels[l]}</option>
          ))}
        </select>

        {/* Plan badge */}
        {userPlan === "free" ? (
          <button
            onClick={onPricing}
            className="h-9 hidden sm:flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white border border-slate-700 hover:border-indigo-500 active:scale-95 transition-all"
          >
            ⚡ Pro
          </button>
        ) : (
          <span className="h-9 hidden sm:flex items-center px-3 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            ⭐ Pro
          </span>
        )}

        {/* Add Task */}
        <button
          onClick={onAddTask}
          className="h-9 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-3 sm:px-4 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">{tr.addTask}</span>
        </button>

        {/* AI toggle */}
        <button
          onClick={onToggleAI}
          className={`h-9 flex items-center gap-1.5 px-3 sm:px-4 rounded-xl text-sm font-semibold active:scale-95 ${
            aiOpen
              ? "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/20"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          }`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="hidden sm:inline">{tr.aiAssistant}</span>
        </button>

        {/* User menu */}
        <button
          onClick={onLogout}
          title={`${userName} — Logout`}
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 border border-slate-700 active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
