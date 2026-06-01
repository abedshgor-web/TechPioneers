import { useEffect, useState } from "react";
import { Trader, CopySubscription, Trade } from "../types";
import { useLang } from "../LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import PerformanceChart from "../components/PerformanceChart";
import CopyModal from "../components/CopyModal";

interface Props {
  traderId: string;
  onBack: () => void;
}

const riskColors: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  high: "text-red-400 bg-red-400/10 border-red-400/20",
};

export default function TraderProfilePage({ traderId, onBack }: Props) {
  const { tr } = useLang();
  const { token } = useAuth();
  const [trader, setTrader] = useState<Trader | null>(null);
  const [subscriptions, setSubscriptions] = useState<CopySubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const authHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/traders/${traderId}`).then((r) => r.json()),
      fetch("/api/copy/subscriptions", { headers: authHeaders() }).then((r) => r.json()),
    ])
      .then(([t, s]: [Trader, CopySubscription[]]) => {
        setTrader(t);
        setSubscriptions(s.filter((sub) => sub.status === "active"));
      })
      .finally(() => setLoading(false));
  }, [traderId]);

  const isCopying = subscriptions.some((s) => s.trader_id === traderId);
  const activeSubId = subscriptions.find((s) => s.trader_id === traderId)?.id;

  const handleCopy = async (lotMultiplier: number, riskPct: number) => {
    const res = await fetch("/api/copy/subscribe", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ trader_id: traderId, lot_multiplier: lotMultiplier, risk_pct: riskPct }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? tr.error);
    }
    const sub = (await res.json()) as CopySubscription;
    setSubscriptions((prev) => [...prev, sub]);
  };

  const handleStop = async () => {
    if (!activeSubId) return;
    await fetch(`/api/copy/${activeSubId}`, { method: "DELETE", headers: authHeaders() });
    setSubscriptions((prev) => prev.filter((s) => s.id !== activeSubId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!trader) return <div className="text-slate-400 p-8">{tr.error}</div>;

  const avatarColors = ["from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600", "from-purple-500 to-pink-600", "from-orange-500 to-amber-600", "from-cyan-500 to-blue-600", "from-rose-500 to-red-600"];
  const grad = avatarColors[parseInt(trader.id.replace(/\D/g, "").slice(-1)) % avatarColors.length];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
        ← {tr.back}
      </button>

      {/* Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}>
              {trader.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white">{trader.name}</h1>
                {trader.verified ? (
                  <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full px-2 py-0.5">
                    ✓ {tr.verified}
                  </span>
                ) : null}
                <span className={`text-xs px-2 py-0.5 rounded-full border ${riskColors[trader.risk_level]}`}>
                  {tr[trader.risk_level as "low" | "medium" | "high"]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-sm mt-1 flex-wrap">
                <span>{trader.country_flag} {trader.country}</span>
                <span>·</span>
                <span>{trader.strategy}</span>
                <span>·</span>
                <span>👥 {trader.followers.toLocaleString()} {tr.followers}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {isCopying ? (
              <button
                onClick={handleStop}
                className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-sm transition-colors"
              >
                {tr.stopCopying}
              </button>
            ) : (
              <button
                onClick={() => setShowCopyModal(true)}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
              >
                {tr.startCopying}
              </button>
            )}
          </div>
        </div>

        {/* About */}
        <p className="text-slate-400 text-sm mt-4 leading-relaxed">{trader.description}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: tr.totalProfit, value: `+${trader.total_profit_pct.toFixed(1)}%`, cls: "text-emerald-400" },
          { label: tr.monthlyProfit, value: `+${trader.monthly_profit_pct.toFixed(1)}%`, cls: "text-emerald-400" },
          { label: tr.winRate, value: `${trader.win_rate.toFixed(1)}%`, cls: "text-white" },
          { label: tr.maxDrawdown, value: `-${trader.max_drawdown.toFixed(1)}%`, cls: "text-red-400" },
          { label: tr.trades, value: trader.total_trades.toLocaleString(), cls: "text-white" },
          { label: tr.avgDuration, value: trader.avg_trade_duration, cls: "text-white" },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <div className={`text-lg font-bold ${s.cls}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Performance chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">{tr.performanceChart}</h2>
        <div style={{ height: 200 }}>
          {trader.snapshots && trader.snapshots.length > 0 ? (
            <PerformanceChart data={trader.snapshots} height={200} showGrid={true} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">No chart data</div>
          )}
        </div>
      </div>

      {/* Recent trades */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-white font-semibold">{tr.recentTrades}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs border-b border-slate-800">
                <th className="px-4 py-3 text-start">{tr.symbol}</th>
                <th className="px-4 py-3 text-start">{tr.direction}</th>
                <th className="px-4 py-3 text-end">{tr.openPrice}</th>
                <th className="px-4 py-3 text-end">{tr.closePrice}</th>
                <th className="px-4 py-3 text-end">{tr.pips}</th>
                <th className="px-4 py-3 text-end">{tr.date}</th>
              </tr>
            </thead>
            <tbody>
              {(trader.recentTrades ?? []).map((trade: Trade) => {
                const positive = trade.profit_pips >= 0;
                return (
                  <tr key={trade.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-white font-mono font-medium">{trade.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        trade.direction === "buy"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {trade.direction === "buy" ? tr.buy : tr.sell}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-end font-mono">{trade.open_price.toFixed(4)}</td>
                    <td className="px-4 py-3 text-slate-300 text-end font-mono">{trade.close_price?.toFixed(4) ?? "—"}</td>
                    <td className={`px-4 py-3 text-end font-mono font-semibold ${positive ? "text-emerald-400" : "text-red-400"}`}>
                      {positive ? "+" : ""}{trade.profit_pips?.toFixed(1) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-end text-xs">
                      {trade.closed_at ? new Date(trade.closed_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCopyModal && (
        <CopyModal
          trader={trader}
          onConfirm={handleCopy}
          onClose={() => setShowCopyModal(false)}
        />
      )}
    </div>
  );
}
