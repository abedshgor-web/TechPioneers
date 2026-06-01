import { useLang } from "../LanguageContext";
import { langLabels, Lang } from "../i18n";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

type Page = "dashboard" | "traders" | "my-copies" | "settings";

interface Props {
  page: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { page: Page; icon: string; key: keyof ReturnType<typeof useLang>["tr"] }[] = [
  { page: "dashboard", icon: "📊", key: "dashboard" },
  { page: "traders", icon: "👥", key: "traders" },
  { page: "my-copies", icon: "📋", key: "myCopies" },
  { page: "settings", icon: "⚙️", key: "settings" },
];

export default function Nav({ page, onNavigate }: Props) {
  const { tr, lang, setLang, isRTL } = useLang();
  const { user, logout } = useAuth();
  const [langOpen, setLangOpen] = useState(false);

  return (
    <>
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-900 border-e border-slate-800 h-screen sticky top-0">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              CT
            </div>
            <span className="text-white font-bold text-sm">{tr.appName}</span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = page === item.page;
            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>{item.icon}</span>
                <span>{tr[item.key] as string}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom: language + user */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-3">
          {/* Language picker */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-colors"
            >
              <span>🌐</span>
              <span className="flex-1 text-start">{langLabels[lang]}</span>
              <span className="text-xs">▾</span>
            </button>
            {langOpen && (
              <div className={`absolute bottom-full mb-1 ${isRTL ? "end-0" : "start-0"} w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden`}>
                {(Object.entries(langLabels) as [Lang, string][]).map(([l, label]) => (
                  <button
                    key={l}
                    onClick={() => { setLang(l); setLangOpen(false); }}
                    className={`w-full px-3 py-2 text-sm text-start hover:bg-slate-700 transition-colors ${lang === l ? "text-blue-400" : "text-slate-300"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User */}
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{user?.name}</div>
              <div className="text-slate-500 text-xs truncate">{user?.email}</div>
            </div>
            <button onClick={logout} className="text-slate-500 hover:text-red-400 transition-colors text-xs" title={tr.logout}>
              ⏏
            </button>
          </div>
        </div>
      </aside>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 flex z-40">
        {navItems.map((item) => {
          const active = page === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs transition-colors ${
                active ? "text-blue-400" : "text-slate-500"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{tr[item.key] as string}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
