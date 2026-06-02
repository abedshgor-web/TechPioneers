import { useLang } from "../LanguageContext";
import { langLabels, Lang } from "../i18n";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

type Page = "dashboard" | "traders" | "my-copies" | "settings" | "mt-connect";

interface Props {
  page: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { page: Page; icon: JSX.Element; key: "dashboard" | "traders" | "myCopies" | "settings" | "mtConnect" }[] = [
  {
    page: "dashboard",
    key: "dashboard",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    page: "traders",
    key: "traders",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    page: "my-copies",
    key: "myCopies",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    page: "mt-connect",
    key: "mtConnect",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    page: "settings",
    key: "settings",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Nav({ page, onNavigate }: Props) {
  const { tr, lang, setLang, isRTL } = useLang();
  const { user, logout } = useAuth();
  const [langOpen, setLangOpen] = useState(false);

  return (
    <>
      {/* ── Sidebar: desktop ── */}
      <aside className="hidden md:flex flex-col w-56 bg-[#0a0f1a] border-e border-[#1a2235] min-h-screen sticky top-0 shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#1a2235] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-500/20">
            CT
          </div>
          <div>
            <div className="text-white font-black text-sm leading-none">{tr.appName}</div>
            <div className="text-slate-600 text-[10px] mt-0.5">Professional Copy Trading</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = page === item.page;
            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-brand-600/20 text-blue-400 border border-brand-600/30"
                    : "text-slate-500 hover:text-slate-200 hover:bg-[#111827]"
                }`}
              >
                <span className={active ? "text-blue-400" : "text-slate-500"}>{item.icon}</span>
                <span>{tr[item.key] as string}</span>
                {active && <span className="ms-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-[#1a2235] space-y-2">
          {/* Language */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-[#111827] text-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span className="flex-1 text-start text-xs">{langLabels[lang]}</span>
              <span className="text-xs text-slate-700">▾</span>
            </button>
            {langOpen && (
              <div className={`absolute bottom-full mb-1 ${isRTL ? "end-0" : "start-0"} w-44 bg-[#111827] border border-[#1a2235] rounded-xl shadow-2xl z-50 overflow-hidden py-1`}>
                {(Object.entries(langLabels) as [Lang, string][]).map(([l, label]) => (
                  <button
                    key={l}
                    onClick={() => { setLang(l); setLangOpen(false); }}
                    className={`w-full px-3 py-2 text-xs text-start transition-colors hover:bg-[#1a2540] ${lang === l ? "text-blue-400 font-medium" : "text-slate-400"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User card */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#111827] transition-colors group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white text-xs font-black shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate leading-none">{user?.name}</div>
              <div className="text-slate-600 text-[10px] truncate mt-0.5">{user?.plan === "pro" ? "Pro" : "Free"}</div>
            </div>
            <button
              onClick={logout}
              title={tr.logout}
              className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Bottom nav: mobile ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#0a0f1a]/95 backdrop-blur-md border-t border-[#1a2235] flex z-40">
        {NAV_ITEMS.map((item) => {
          const active = page === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-all ${
                active ? "text-blue-400" : "text-slate-600"
              }`}
            >
              <span className={`${active ? "text-blue-400" : "text-slate-600"}`}>{item.icon}</span>
              <span>{tr[item.key] as string}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
