import { useLang } from "../LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { langLabels, Lang } from "../i18n";

export default function SettingsPage() {
  const { tr, lang, setLang } = useLang();
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in max-w-lg">
      <h1 className="text-xl font-bold text-white">{tr.accountSettings}</h1>

      {/* Account info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-white font-medium mb-4">{tr.accountInfo}</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">{tr.name}</span>
            <span className="text-white text-sm">{user?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">{tr.email}</span>
            <span className="text-white text-sm">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">{tr.planInfo}</span>
            <span className={`text-sm font-medium ${user?.plan === "pro" ? "text-yellow-400" : "text-slate-300"}`}>
              {user?.plan === "pro" ? tr.proPlan : tr.freePlan}
            </span>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-white font-medium mb-4">Language / اللغة</h2>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(langLabels) as [Lang, string][]).map(([l, label]) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-2 rounded-lg text-sm text-start transition-colors ${
                lang === l
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Broker connection */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-white font-medium mb-1">{tr.brokerConnection}</h2>
        <p className="text-slate-400 text-sm mb-4">{tr.brokerNote}</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-500 text-sm">
            MT4 / MT5 API Key...
          </div>
          <button className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors whitespace-nowrap">
            {tr.connectBroker}
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
      >
        {tr.logout}
      </button>
    </div>
  );
}
