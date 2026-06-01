import { useState, FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../LanguageContext";
import { langLabels, Lang } from "../i18n";

const AuthPage = () => {
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
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
    setName(""); setEmail(""); setPassword("");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
      {/* Language picker top-right */}
      <div className="flex justify-end p-4">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none"
        >
          {(Object.entries(langLabels) as [Lang, string][]).map(([l, label]) => (
            <option key={l} value={l}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/30 mb-4">
              <span className="text-white font-bold text-xl">CT</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{tr.appName}</h1>
            <p className="text-slate-400 text-sm mt-1">{tr.tagline}</p>
          </div>

          {/* Card */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden border border-slate-700 mb-6">
              <button
                type="button"
                onClick={() => mode !== "login" && toggleMode()}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  mode === "login" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tr.signIn}
              </button>
              <button
                type="button"
                onClick={() => mode !== "register" && toggleMode()}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  mode === "register" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tr.signUp}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">{tr.name}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{tr.email}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{tr.password}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Min 6 characters" : "Your password"}
                  required
                  minLength={mode === "register" ? 6 : undefined}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  mode === "login" ? tr.signIn : tr.signUp
                )}
              </button>
            </form>

            <p className="text-center text-slate-500 text-sm mt-6">
              {mode === "login" ? tr.noAccount : tr.hasAccount}{" "}
              <button type="button" onClick={toggleMode} className="text-blue-400 hover:text-blue-300 font-medium">
                {mode === "login" ? tr.signUp : tr.signIn}
              </button>
            </p>
          </div>

          {/* Demo note */}
          <p className="text-center text-slate-600 text-xs mt-4">
            Demo: register with any email and password (min 6 chars)
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
