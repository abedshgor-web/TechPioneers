import { useState, FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../LanguageContext";
import { langLabels, Lang } from "../i18n";

const DEMO_TRADERS = [
  { name: "Sophia Chen", flag: "🇸🇬", profit: "+312.8%", wr: "68.5%", risk: "High", color: "from-violet-500 to-purple-700" },
  { name: "Elena Kovacs", flag: "🇭🇺", profit: "+267.9%", wr: "69.7%", risk: "Medium", color: "from-emerald-500 to-teal-700" },
  { name: "Ahmed Al-Rashidi", flag: "🇦🇪", profit: "+187.4%", wr: "73.2%", risk: "Medium", color: "from-blue-500 to-indigo-700" },
];

const STATS = [
  { value: "8", label: "Expert Traders", icon: "👑" },
  { value: "$2.4M+", label: "Assets Copied", icon: "💰" },
  { value: "17,671", label: "Active Copiers", icon: "👥" },
  { value: "+312%", label: "Best Return", icon: "📈" },
];

export default function AuthPage() {
  const { login, register } = useAuth();
  const { tr, lang, setLang, isRTL } = useLang();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      mode === "login" ? await login(email, password) : await register(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.error);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null); setName(""); setEmail(""); setPassword("");
  };

  return (
    <div className="min-h-screen bg-[#080c14] flex" dir={isRTL ? "rtl" : "ltr"}>
      {/* ─── Left panel — showcase ─── */}
      <div className="hidden lg:flex flex-col flex-1 bg-hero-gradient p-10 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/30">
            CT
          </div>
          <span className="text-white font-bold text-lg">{tr.appName}</span>
        </div>

        {/* Hero text */}
        <div className="mt-16 relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 text-blue-300 text-xs mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Copy Trading Platform
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Copy The Best<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Trade Automatically
            </span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            {tr.discoverSubtitle}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mt-10 relative z-10">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 backdrop-blur-sm">
              <div className="text-xl font-black text-white">{s.value}</div>
              <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                <span>{s.icon}</span> {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Trader preview cards */}
        <div className="mt-10 space-y-3 relative z-10">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Top Performers</div>
          {DEMO_TRADERS.map((t, i) => (
            <div key={t.name}
              className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 backdrop-blur-sm"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="relative">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm`}>
                  {t.name[0]}
                </div>
                <div className="absolute -top-1 -start-1 w-4 h-4 rounded-full bg-[#0a0e1a] border border-[#1a2235] flex items-center justify-center text-[9px] font-black text-yellow-400">
                  {i + 1}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">{t.name} <span>{t.flag}</span></div>
                <div className="text-slate-500 text-xs">{t.risk} Risk</div>
              </div>
              <div className="text-end">
                <div className="text-emerald-400 font-bold text-sm">{t.profit}</div>
                <div className="text-slate-500 text-xs">{t.wr} WR</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom disclaimer */}
        <p className="mt-auto pt-8 text-slate-700 text-xs relative z-10">
          Past performance does not guarantee future results. Trading involves risk.
        </p>
      </div>

      {/* ─── Right panel — form ─── */}
      <div className="flex-1 lg:max-w-md flex flex-col">
        {/* Language + mobile logo */}
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs">
              CT
            </div>
            <span className="text-white font-bold text-sm">{tr.appName}</span>
          </div>
          <div className="ms-auto">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="bg-surface border border-border text-slate-400 rounded-lg px-2.5 py-1.5 text-xs outline-none hover:border-border-strong focus:border-brand-500 cursor-pointer"
            >
              {(Object.entries(langLabels) as [Lang, string][]).map(([l, label]) => (
                <option key={l} value={l}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-6 pb-8">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-black text-white">
                {mode === "login" ? tr.loginTitle : tr.registerTitle}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {mode === "login" ? tr.loginSubtitle : tr.registerSubtitle}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border mb-6">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => mode !== m && toggle()}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    mode === m
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {m === "login" ? tr.signIn : tr.signUp}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">{tr.name}</label>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe" required
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">{tr.email}</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">{tr.password}</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Min 6 characters" : "Your password"} required
                  minLength={mode === "register" ? 6 : undefined}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-brand-600/20 hover:shadow-brand-500/30 hover:-translate-y-px active:translate-y-0 flex items-center justify-center gap-2 mt-2"
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : mode === "login" ? tr.signIn : tr.signUp
                }
              </button>
            </form>

            <p className="text-center text-slate-600 text-sm mt-5">
              {mode === "login" ? tr.noAccount : tr.hasAccount}{" "}
              <button type="button" onClick={toggle} className="text-brand-500 hover:text-blue-400 font-medium transition-colors">
                {mode === "login" ? tr.signUp : tr.signIn}
              </button>
            </p>

            {/* Trust signals */}
            <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-border">
              {["🔒 Secure", "✓ Free Account", "⚡ Instant Setup"].map((badge) => (
                <span key={badge} className="text-slate-600 text-xs">{badge}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
