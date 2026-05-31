import { FC } from "react";
import { useLang } from "../LanguageContext";
import { Lang, langLabels } from "../i18n";

interface HeaderProps {
  taskCount: number;
  onAddTask: () => void;
  aiOpen: boolean;
  onToggleAI: () => void;
}

const Header: FC<HeaderProps> = ({ taskCount, onAddTask, aiOpen, onToggleAI }) => {
  const { tr, lang, setLang } = useLang();

  return (
    <header className="bg-navy-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            TaskFlow <span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400">{tr.tasksTotal(taskCount)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors duration-150 border border-slate-600 outline-none cursor-pointer"
        >
          {(Object.keys(langLabels) as Lang[]).map((l) => (
            <option key={l} value={l}>{langLabels[l]}</option>
          ))}
        </select>

        <button
          onClick={onAddTask}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {tr.addTask}
        </button>

        <button
          onClick={onToggleAI}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
            aiOpen ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {tr.aiAssistant}
        </button>
      </div>
    </header>
  );
};

export default Header;
