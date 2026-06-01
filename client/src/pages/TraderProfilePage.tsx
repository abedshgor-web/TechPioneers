import { useEffect, useState } from "react";
import { Trader, CopySubscription, Trade } from "../types";
import { useLang } from "../LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import PerformanceChart from "../components/PerformanceChart";
import MonthlyReturnsGrid from "../components/MonthlyReturnsGrid";
import CopyModal from "../components/CopyModal";

interface Props {
  traderId: string;
  onBack: () => void;
}

const RISK_BADGE: Record<string, string> = {
  low:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  medium: "text-amber-400  bg-amber-400/10  border-amber-400/20",
  high:   "text-red-400    bg-red-400/10    border-red-400/20",
};

const AVATAR_GRADS = ["from-blue-500 to-indigo-700","from-emerald-500 to-teal-700","from-violet-500 to-purple-700","from-amber-500 to-orange-700","from-cyan-500 to-blue-700","from-rose-500 to-red-700"];

function sharpe(trader: Trader): string {
  const ratio = (trader.monthly_profit_pct / 100) / ((trader.max_drawdown / 100) * 0.7);
  return ratio.toFixed(2);
}

export default function TraderProfilePage({ traderId, onBack }: Props) {
  const { tr } = useLang();
  const { token } = useAuth();
  const [trader, setTrader] = useState<Trader | null>(null);
  const [subscriptions, setSubscriptions] = useState<CopySubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const authH: HeadersInit = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`/api/traders/${traderId}`).then((r) => r.json()),
      fetch("/api/copy/subscriptions", { headers: authH }).then((r) => r.json()),
    ])
      .then(([t, s]: [Trader, CopySubscription[]]) => { setTrader(t); setSubscriptions(s.filter((s) => s.status === "active")); })
      .finally(() => setLoading(false));
  }, [traderId]);

  const isCopying = subscriptions.some((s) => s.trader_id === traderId);
  const activeSubId = subscriptions.find((s) => s.trader_id === traderId)?.id;

  const handleCopy = async (lotMultiplier: number, riskPct: number) => {
    const res = await fetch("/api/copy/subscribe", {
      method: "POST", headers: authH,
      body: JSON.stringify({ trader_id: traderId, lot_multiplier: lotMultiplier, risk_pct: riskPct }),
    });
    if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? tr.error);
    const sub = (await res.json()) as CopySubscription;
    setSubscriptions((prev) => [...prev, sub]);
    setShowCopyModal(false);
  };

  const handleStop = async () => {
    if (!activeSubId) return;
    await fetch(`/api/copy/${activeSubId}`, { method: "DELETE", headers: authH });
    setSubscriptions((prev) => prev.filter((s) => s.id !== activeSubId));
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 bg-surface-overlay rounded w-20" />
        <div className="card h-36 p-6 space-y-3">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-overlay" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-surface-overlay rounded w-1/3" />
              <div className="h-3 bg-surface-overlay rounded w-1/2" />
            </div>
          </div>
        </div>
        <div className="card h-52" />
      </div>
    );
  }
  if (!trader) return <div className="text-slate-400 p-8">{tr.error}</div>;

  const num = parseInt(trader.id.replace(/\D/g, "").slice(-1)) || 0;
  const grad = AVATAR_GRADS[num % AVATAR_GRADS.length];

  const startEquity = trader.snapshots?.[0]?.equity ?? 10000;
  const endEquity = trader.snapshots?.[trader.snapshots.length - 1]?.equity ?? 10000;
  const absReturn = endEquity - startEquity;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-slate-500 hover:text-white text-sm transition-colors group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path d="M15 19l-7-7 7-7" />
        </svg>
        {tr.back}
      </button>

      {/* Hero card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-2xl shadow-xl shrink-0`}>
              {trader.avatar}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black text-white">{trader.name}</h1>
                {trader.verified ? (
                  <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5">
                    ✓ {tr.verified}
                  </span>
                ) : null}
                <span className={`text-xs px-2 py-0.5 rounded-full border ${RISK_BADGE[trader.risk_level]}`}>
                  {tr[trader.risk_level as "low" | "medium" | "high"]} {tr.risk}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-slate-400 text-sm mt-1.5">
                <span>{trader.country_flag} {trader.country}</span>
                <span className="text-slate-700">·</span>
                <span>{trader.strategy}</span>
                <span className="text-slate-700">·</span>
                <span>👥 {trader.followers.toLocaleString()}</span>
              </div>
              <p className="text-slate-500 text-sm mt-2.5 leading-relaxed max-w-lg">{trader.description}</p>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {isCopying ? (
              <button
                onClick={handleStop}
                className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition-all"
              >
                {tr.stopCopying}
              </button>
            ) : (
              <button
                onClick={() => setShowCopyModal(true)}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm transition-all shadow-lg shadow-brand-600/20 hover:shadow-brand-500/30 hover:-translate-y-px"
              >
                {tr.startCopying}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {[
          { label: tr.totalProfit,   value: `+${trader.total_profit_pct.toFixed(1)}%`, cls: "text-emerald-400" },
          { label: tr.monthlyProfit, value: `+${trader.monthly_profit_pct.toFixed(1)}%`, cls: "text-emerald-400" },
          { label: tr.winRate,       value: `${trader.win_rate.toFixed(1)}%`, cls: "text-white" },
          { label: tr.maxDrawdown,   value: `-${trader.max_drawdown.toFixed(1)}%`, cls: "text-red-400" },
          { label: tr.trades,        value: trader.total_trades.toLocaleString(), cls: "text-white" },
          { label: tr.avgDuration,   value: trader.avg_trade_duration, cls: "text-slate-300" },
          { label: "Sharpe Ratio",   value: sharpe(trader), cls: parseFloat(sharpe(trader)) >= 1.5 ? "text-emerald-400" : "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center hover:border-border-strong transition-all">
            <div className={`text-base font-black ${s.cls}`}>{s.value}</div>
            <div className="text-slate-600 text-[10px] mt-0.5 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Performance chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold">{tr.performanceChart}</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>$10,000 → <span className={endEquity >= startEquity ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>${endEquity.toLocaleString("en", {maximumFractionDigits:0})}</span></span>
            <span className={absReturn >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
              {absReturn >= 0 ? "+" : ""}${absReturn.toFixed(0)}
            </span>
          </div>
        </div>
        <PerformanceChart
          data={trader.snapshots ?? []}
          height={220}
          showGrid={true}
          showTooltip={true}
        />
      </div>

      {/* Monthly returns */}
      {(trader.snapshots?.length ?? 0) > 0 && (
        <div className="card p-5">
          <MonthlyReturnsGrid snapshots={trader.snapshots ?? []} label={tr.monthlyProfit + " Breakdown"} />
        </div>
      )}

      {/* Recent trades */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-white font-bold">{tr.recentTrades}</h2>
          <span className="text-slate-600 text-xs">{(trader.recentTrades?.length ?? 0)} trades shown</span>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[tr.symbol, tr.direction, tr.openPrice, tr.closePrice, tr.pips, tr.date].map((h) => (
                  <th key={h} className="px-4 py-3 text-start text-xs text-slate-600 font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(trader.recentTrades ?? []).map((trade: Trade, i: number) => {
                const pos = trade.profit_pips >= 0;
                return (
                  <tr
                    key={trade.id}
                    className={`border-b border-border/40 hover:bg-surface-overlay/50 transition-colors ${i % 2 === 0 ? "" : "bg-surface-overlay/20"}`}
                  >
                    <td className="px-4 py-3 text-white font-mono font-bold">{trade.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md ${
                        trade.direction === "buy"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                      }`}>
                        {trade.direction === "buy" ? "▲ " + tr.buy : "▼ " + tr.sell}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{trade.open_price.toFixed(4)}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{trade.close_price?.toFixed(4) ?? "—"}</td>
                    <td className={`px-4 py-3 font-mono font-bold text-xs ${pos ? "text-emerald-400" : "text-red-400"}`}>
                      {pos ? "+" : ""}{trade.profit_pips?.toFixed(1) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
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
        <CopyModal trader={trader} onConfirm={handleCopy} onClose={() => setShowCopyModal(false)} />
      )}
    </div>
  );
}
