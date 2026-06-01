import { Trader } from "../types";
import PerformanceChart from "./PerformanceChart";
import { useLang } from "../LanguageContext";

interface Props {
  trader: Trader;
  rank?: number;
  isCopying: boolean;
  onCopy: (trader: Trader) => void;
  onViewProfile: (trader: Trader) => void;
}

const AVATAR_GRADS = [
  "from-blue-500 to-indigo-700",
  "from-emerald-500 to-teal-700",
  "from-violet-500 to-purple-700",
  "from-amber-500 to-orange-700",
  "from-cyan-500 to-blue-700",
  "from-rose-500 to-red-700",
  "from-pink-500 to-fuchsia-700",
  "from-teal-500 to-emerald-700",
];

const RANK_STYLES: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-yellow-500/20 border-yellow-500/40", text: "text-yellow-400", label: "🥇" },
  2: { bg: "bg-slate-400/20 border-slate-400/40", text: "text-slate-300", label: "🥈" },
  3: { bg: "bg-amber-700/20 border-amber-700/40", text: "text-amber-600", label: "🥉" },
};

const RISK_STYLES: Record<string, string> = {
  low:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  medium: "text-amber-400  bg-amber-400/10  border-amber-400/20",
  high:   "text-red-400    bg-red-400/10    border-red-400/20",
};

const BADGES: { check: (t: Trader) => boolean; label: string; cls: string }[] = [
  { check: (t) => t.win_rate > 70,         label: "High WR",   cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  { check: (t) => t.max_drawdown < 10,     label: "Low DD",    cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { check: (t) => t.monthly_profit_pct > 15, label: "Top Earner", cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
];

export default function TraderCard({ trader, rank, isCopying, onCopy, onViewProfile }: Props) {
  const { tr } = useLang();
  const num = parseInt(trader.id.replace(/\D/g, "").slice(-1)) || 0;
  const grad = AVATAR_GRADS[num % AVATAR_GRADS.length];
  const profit = trader.total_profit_pct;
  const isPos = profit >= 0;
  const rankStyle = rank && rank <= 3 ? RANK_STYLES[rank] : null;
  const badge = BADGES.find((b) => b.check(trader));

  return (
    <div className="card-hover flex flex-col gap-0 overflow-hidden group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40">
      {/* Header stripe */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {/* Avatar with rank badge */}
            <div className="relative flex-shrink-0">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-sm shadow-lg`}>
                {trader.avatar}
              </div>
              {rankStyle && (
                <div className={`absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${rankStyle.bg} ${rankStyle.text} font-black`}>
                  {rankStyle.label}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold text-sm leading-tight">{trader.name}</span>
                {trader.verified ? <span className="text-blue-400 text-xs">✓</span> : null}
              </div>
              <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                <span>{trader.country_flag}</span>
                <span>·</span>
                <span>{trader.strategy}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${RISK_STYLES[trader.risk_level]}`}>
              {tr[trader.risk_level as "low" | "medium" | "high"]}
            </span>
            {badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${badge.cls}`}>
                {badge.label}
              </span>
            )}
          </div>
        </div>

        {/* Big profit number */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className={`text-2xl font-black ${isPos ? "text-emerald-400" : "text-red-400"}`}>
            {isPos ? "+" : ""}{profit.toFixed(1)}%
          </span>
          <span className="text-slate-500 text-xs">{tr.totalProfit}</span>
          <span className={`ms-auto text-xs font-semibold ${trader.monthly_profit_pct >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            +{trader.monthly_profit_pct.toFixed(1)}% / mo
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[72px] mx-4 mb-3 rounded-lg overflow-hidden bg-[#080c14]">
        {trader.snapshots && trader.snapshots.length > 1 ? (
          <PerformanceChart data={trader.snapshots} height={72} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-700 text-xs">—</div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-0 border-t border-border/60 mx-0">
        {[
          { val: `${trader.win_rate.toFixed(0)}%`, lbl: tr.winRate },
          { val: `-${trader.max_drawdown.toFixed(1)}%`, lbl: tr.maxDrawdown, red: true },
          { val: trader.total_trades.toLocaleString(), lbl: tr.trades },
        ].map((s, i) => (
          <div key={i} className={`py-2.5 text-center ${i < 2 ? "border-e border-border/40" : ""}`}>
            <div className={`text-sm font-bold ${s.red ? "text-red-400" : "text-white"}`}>{s.val}</div>
            <div className="text-slate-600 text-[10px] mt-0.5">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Followers */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/40">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span>👥</span>
          <span className="font-medium text-slate-400">{trader.followers.toLocaleString()}</span>
          <span>{tr.followers}</span>
        </div>
        <div className="text-xs text-slate-500">⏱ {trader.avg_trade_duration}</div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4 pt-2">
        <button
          onClick={() => onViewProfile(trader)}
          className="flex-1 py-2 rounded-lg border border-border-strong text-slate-400 hover:text-white hover:bg-surface-overlay text-xs font-medium transition-all"
        >
          {tr.viewProfile}
        </button>
        {isCopying ? (
          <button
            disabled
            className="flex-1 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/25 cursor-default"
          >
            ✓ {tr.copying}
          </button>
        ) : (
          <button
            onClick={() => onCopy(trader)}
            className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all hover:shadow-md hover:shadow-brand-600/30"
          >
            {tr.copyTrader}
          </button>
        )}
      </div>
    </div>
  );
}
