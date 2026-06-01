import { useEffect, useState } from "react";
import { CopySubscription } from "../types";
import { useLang } from "../LanguageContext";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  onNavigateToTraders: () => void;
}

export default function MyCopiesPage({ onNavigateToTraders }: Props) {
  const { tr } = useLang();
  const { token } = useAuth();
  const [subscriptions, setSubscriptions] = useState<CopySubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  useEffect(() => {
    fetch("/api/copy/subscriptions", { headers: authHeaders() })
      .then((r) => r.json())
      .then((data: CopySubscription[]) => setSubscriptions(data))
      .finally(() => setLoading(false));
  }, []);

  const handleStop = async (subId: string) => {
    await fetch(`/api/copy/${subId}`, { method: "DELETE", headers: authHeaders() });
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status: "stopped" as const } : s))
    );
  };

  const active = subscriptions.filter((s) => s.status === "active");
  const stopped = subscriptions.filter((s) => s.status === "stopped");

  const avatarColors = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-purple-500 to-pink-600",
    "from-orange-500 to-amber-600",
    "from-cyan-500 to-blue-600",
    "from-rose-500 to-red-600",
  ];

  const riskColors: Record<string, string> = {
    low: "text-emerald-400",
    medium: "text-yellow-400",
    high: "text-red-400",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const SubCard = ({ sub, showStop }: { sub: CopySubscription; showStop: boolean }) => {
    const grad = avatarColors[parseInt(sub.trader_id?.replace(/\D/g, "").slice(-1) ?? "0") % avatarColors.length];
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-colors animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold flex-shrink-0`}>
              {sub.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{sub.trader_name}</span>
                <span className="text-lg">{sub.country_flag}</span>
              </div>
              <div className="text-slate-400 text-sm">{sub.strategy}</div>
            </div>
          </div>

          {showStop && (
            <button
              onClick={() => handleStop(sub.id)}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              {tr.stopCopyingConfirm}
            </button>
          )}

          {!showStop && (
            <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-400">Stopped</span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div>
            <div className="text-slate-500 text-xs">{tr.totalProfit}</div>
            <div className="text-emerald-400 font-semibold text-sm">+{sub.total_profit_pct.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">{tr.winRate}</div>
            <div className="text-white font-semibold text-sm">{sub.win_rate.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">{tr.risk}</div>
            <div className={`font-semibold text-sm ${riskColors[sub.risk_level] ?? "text-white"}`}>
              {tr[sub.risk_level as "low" | "medium" | "high"]}
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">{tr.since}</div>
            <div className="text-slate-300 text-sm">{new Date(sub.started_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Copy settings */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500">
          <span>Lot: <span className="text-slate-300">{sub.lot_multiplier.toFixed(2)}</span></span>
          <span>{tr.risk}: <span className="text-slate-300">{sub.risk_pct.toFixed(1)}% {tr.perTrade}</span></span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">{tr.myCopiesTitle}</h1>
        <p className="text-slate-400 text-sm mt-1">{tr.myCopiesSubtitle}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">{tr.activeCopies}</div>
          <div className="text-2xl font-bold text-blue-400">{active.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">Total Subscriptions</div>
          <div className="text-2xl font-bold text-white">{subscriptions.length}</div>
        </div>
      </div>

      {/* Active */}
      {active.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-white font-medium mb-1">{tr.noActiveCopies}</p>
          <p className="text-slate-400 text-sm mb-4">{tr.startCopyingPrompt}</p>
          <button
            onClick={onNavigateToTraders}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
          >
            {tr.exploreTradersBtn}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((sub) => (
            <SubCard key={sub.id} sub={sub} showStop={true} />
          ))}
        </div>
      )}

      {/* Stopped */}
      {stopped.length > 0 && (
        <div>
          <h2 className="text-slate-400 text-sm font-medium mb-3">Stopped</h2>
          <div className="space-y-3">
            {stopped.map((sub) => (
              <SubCard key={sub.id} sub={sub} showStop={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
