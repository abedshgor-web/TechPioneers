import { useLang } from "../LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { langLabels, Lang } from "../i18n";

export default function SettingsPage() {
  const { tr, lang, setLang } = useLang();
  const { user, logout } = useAuth();

  return (
    <div className="space-y-5 animate-fade-in max-w-lg">
      <h1 className="text-xl font-black text-white">{tr.accountSettings}</h1>

      {/* Account info */}
      <div className="card p-5">
        <h2 className="text-white font-bold text-sm mb-4">{tr.accountInfo}</h2>
        <div className="space-y-3">
          {[
            { label: tr.name,     val: user?.name },
            { label: tr.email,    val: user?.email },
            { label: tr.planInfo, val: user?.plan === "pro" ? tr.proPlan : tr.freePlan, cls: user?.plan === "pro" ? "text-yellow-400 font-bold" : "" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-slate-500 text-sm">{row.label}</span>
              <span className={`text-sm ${row.cls ?? "text-white"}`}>{row.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="card p-5">
        <h2 className="text-white font-bold text-sm mb-4">Language / اللغة</h2>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(langLabels) as [Lang, string][]).map(([l, label]) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-2.5 rounded-xl text-sm text-start font-medium transition-all ${
                lang === l
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20"
                  : "bg-surface border border-border text-slate-400 hover:text-white hover:border-border-strong"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Broker connection */}
      <div className="card p-5">
        <h2 className="text-white font-bold text-sm mb-1">{tr.brokerConnection}</h2>
        <p className="text-slate-500 text-sm mb-4">{tr.brokerNote}</p>
        <div className="space-y-2">
          {["MetaTrader 4", "MetaTrader 5", "cTrader", "FIX API"].map((broker) => (
            <div key={broker} className="flex items-center justify-between p-3 bg-[#080c14] border border-[#1a2235] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-overlay border border-border flex items-center justify-center text-slate-400 text-xs font-bold">
                  {broker.slice(0, 2)}
                </div>
                <span className="text-slate-300 text-sm font-medium">{broker}</span>
              </div>
              <button className="text-xs px-3 py-1.5 rounded-lg bg-brand-600/15 border border-brand-600/25 text-blue-400 hover:bg-brand-600/25 transition-colors font-medium">
                {tr.connectBroker}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="card p-5">
        <h2 className="text-white font-bold text-sm mb-4">Security</h2>
        <div className="space-y-2">
          {[
            { label: "Two-Factor Authentication", badge: "Disabled", badgeCls: "text-red-400 bg-red-400/10" },
            { label: "API Access Logs",            badge: "Available", badgeCls: "text-emerald-400 bg-emerald-400/10" },
            { label: "Active Sessions",            badge: "1 Device", badgeCls: "text-blue-400 bg-blue-400/10" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
              <span className="text-slate-400 text-sm">{row.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.badgeCls}`}>{row.badge}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all text-sm font-bold flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        {tr.logout}
      </button>
    </div>
  );
}
