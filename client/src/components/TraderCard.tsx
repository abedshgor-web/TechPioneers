import { Trader } from "../types";
import PerformanceChart from "./PerformanceChart";
import { useLang } from "../LanguageContext";

interface Props {
  trader: Trader;
  isCopying: boolean;
  onCopy: (trader: Trader) => void;
  onViewProfile: (trader: Trader) => void;
}

const riskColors: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  high: "text-red-400 bg-red-400/10 border-red-400/20",
};

export default function TraderCard({ trader, isCopying, onCopy, onViewProfile }: Props) {
  const { tr } = useLang();
  const profit = trader.total_profit_pct;
  const isPositive = profit >= 0;
  const avatarColors = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-purple-500 to-pink-600",
    "from-orange-500 to-amber-600",
    "from-cyan-500 to-blue-600",
    "from-rose-500 to-red-600",
    "from-violet-500 to-purple-600",
    "from-teal-500 to-emerald-600",
  ];
  const avatarGrad = avatarColors[parseInt(trader.id.replace(/\D/g, "").slice(-1)) % avatarColors.length];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
            {trader.avatar}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-semibold text-sm">{trader.name}</span>
              {trader.verified ? (
                <span className="text-blue-400" title={tr.verified}>✓</span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>{trader.country_flag}</span>
              <span>{trader.country}</span>
              <span>·</span>
              <span>{trader.strategy}</span>
            </div>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${riskColors[trader.risk_level]}`}>
          {tr[trader.risk_level as "low" | "medium" | "high"]}
        </span>
      </div>

      {/* Chart */}
      <div className="h-16 rounded-lg overflow-hidden bg-slate-950/50">
        {trader.snapshots && trader.snapshots.length > 0 ? (
          <PerformanceChart data={trader.snapshots} height={64} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-600 text-xs">—</div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className={`text-base font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{profit.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500">{tr.totalProfit}</div>
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-white">{trader.win_rate.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">{tr.winRate}</div>
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-red-400">-{trader.max_drawdown.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">{tr.maxDrawdown}</div>
        </div>
      </div>

      {/* Followers + trades */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>👥 {trader.followers.toLocaleString()} {tr.followers}</span>
        <span>📊 {trader.total_trades.toLocaleString()} {tr.trades}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewProfile(trader)}
          className="flex-1 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
        >
          {tr.viewProfile}
        </button>
        {isCopying ? (
          <button
            disabled
            className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm border border-emerald-500/30 cursor-default"
          >
            ✓ {tr.copying}
          </button>
        ) : (
          <button
            onClick={() => onCopy(trader)}
            className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
          >
            {tr.copyTrader}
          </button>
        )}
      </div>
    </div>
  );
}
