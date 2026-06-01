import { useEffect, useState } from "react";
import { CopySubscription } from "../types";
import { useLang } from "../LanguageContext";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  onNavigateToTraders: () => void;
}

const RISK_CLS: Record<string, string> = {
  low:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  medium: "text-amber-400  bg-amber-400/10  border-amber-400/20",
  high:   "text-red-400    bg-red-400/10    border-red-400/20",
};

const GRADS = ["from-blue-500 to-indigo-700","from-emerald-500 to-teal-700","from-violet-500 to-purple-700","from-amber-500 to-orange-700","from-cyan-500 to-blue-700","from-rose-500 to-red-700"];

export default function MyCopiesPage({ onNavigateToTraders }: Props) {
  const { tr } = useLang();
  const { token } = useAuth();
  const [subscriptions, setSubscriptions] = useState<CopySubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState<string | null>(null);

  const authH: HeadersInit = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch("/api/copy/subscriptions", { headers: authH })
      .then((r) => r.json())
      .then((d: CopySubscription[]) => setSubscriptions(d))
      .finally(() => setLoading(false));
  }, []);

  const handleStop = async (subId: string) => {
    setStopping(subId);
    await fetch(`/api/copy/${subId}`, { method: "DELETE", headers: authH });
    setSubscriptions((prev) => prev.map((s) => s.id === subId ? { ...s, status: "stopped" as const } : s));
    setStopping(null);
  };

  const active  = subscriptions.filter((s) => s.status === "active");
  const stopped = subscriptions.filter((s) => s.status === "stopped");

  const avgMonthly = active.length ? active.reduce((a, s) => a + s.monthly_profit_pct, 0) / active.length : 0;
  const avgWR = active.length ? active.reduce((a, s) => a + s.win_rate, 0) / active.length : 0;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card h-28" />
        ))}
      </div>
    );
  }

  const SubCard = ({ sub, showStop }: { sub: CopySubscription; showStop: boolean }) => {
    const idx = parseInt(sub.trader_id.replace(/\D/g, "").slice(-1)) || 0;
    const grad = GRADS[idx % GRADS.length];
    const daysSince = Math.floor((Date.now() - new Date(sub.started_at).getTime()) / 86400000);
    return (
      <div className={`card-hover p-5 animate-slide-up ${!showStop ? "opacity-60" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black flex-shrink-0 shadow-lg`}>
              {sub.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-bold">{sub.trader_name}</span>
                <span className="text-lg">{sub.country_flag}</span>
                {showStop && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-slate-500 text-xs">{sub.strategy}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${RISK_CLS[sub.risk_level]}`}>
                  {tr[sub.risk_level as "low" | "medium" | "high"]}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!showStop && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-overlay text-slate-500 border border-border">
                Stopped
              </span>
            )}
            {showStop && (
              <button
                onClick={() => handleStop(sub.id)}
                disabled={stopping === sub.id}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 font-medium"
              >
                {stopping === sub.id ? "..." : tr.stopCopyingConfirm}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          {[
            { label: tr.totalProfit,   val: `+${sub.total_profit_pct.toFixed(1)}%`, cls: "text-emerald-400" },
            { label: tr.monthlyProfit, val: `+${sub.monthly_profit_pct.toFixed(1)}%`, cls: "text-emerald-400" },
            { label: tr.winRate,       val: `${sub.win_rate.toFixed(1)}%`, cls: "text-white" },
            { label: tr.since,
              val: daysSince === 0 ? "Today" : `${daysSince}d ago`,
              cls: "text-slate-300" },
          ].map((s) => (
            <div key={s.label} className="bg-[#080c14] border border-[#1a2235] rounded-lg p-2.5">
              <div className="text-slate-600 text-[10px] mb-0.5">{s.label}</div>
              <div className={`font-black text-sm ${s.cls}`}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Copy config */}
        <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-border/40 text-xs text-slate-600">
          <span>Lot: <span className="text-slate-400 font-medium">{sub.lot_multiplier.toFixed(2)}</span></span>
          <span>{tr.risk}: <span className="text-slate-400 font-medium">{sub.risk_pct.toFixed(1)}% {tr.perTrade}</span></span>
          <span>Started: <span className="text-slate-400 font-medium">{new Date(sub.started_at).toLocaleDateString()}</span></span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-black text-white">{tr.myCopiesTitle}</h1>
        <p className="text-slate-500 text-sm mt-1">{tr.myCopiesSubtitle}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: tr.activeCopies, val: active.length, cls: "text-blue-400" },
          { label: "Avg Monthly",   val: active.length ? `+${avgMonthly.toFixed(1)}%` : "—", cls: "text-emerald-400" },
          { label: "Avg Win Rate",  val: active.length ? `${avgWR.toFixed(1)}%` : "—", cls: "text-white" },
          { label: "Total History", val: subscriptions.length, cls: "text-slate-300" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-slate-500 text-xs mb-2">{s.label}</div>
            <div className={`text-2xl font-black ${s.cls}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Active */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-white font-bold text-sm">{tr.activeCopies}</h2>
          <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">{active.length}</span>
        </div>

        {active.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center mx-auto mb-4 text-2xl">
              📋
            </div>
            <p className="text-white font-bold mb-1">{tr.noActiveCopies}</p>
            <p className="text-slate-500 text-sm mb-5">{tr.startCopyingPrompt}</p>
            <button
              onClick={onNavigateToTraders}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-600/20 hover:-translate-y-px"
            >
              {tr.exploreTradersBtn}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((sub) => <SubCard key={sub.id} sub={sub} showStop={true} />)}
          </div>
        )}
      </div>

      {/* Stopped */}
      {stopped.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-slate-500 font-medium text-sm">Stopped</h2>
            <span className="text-xs text-slate-700">{stopped.length}</span>
          </div>
          <div className="space-y-3">
            {stopped.map((sub) => <SubCard key={sub.id} sub={sub} showStop={false} />)}
          </div>
        </div>
      )}
    </div>
  );
}
