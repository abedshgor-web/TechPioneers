import { useEffect, useState, useMemo } from "react";
import { Portfolio, CopySubscription, PerformanceSnapshot } from "../types";
import { useLang } from "../LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import PerformanceChart from "../components/PerformanceChart";
import AdSlot from "../components/ads/AdSlot";

interface Props {
  onNavigateToTraders: () => void;
  onNavigateToMyCopies: () => void;
}

const TICKERS = [
  { sym: "EUR/USD", price: "1.0852", chg: "+0.12%", up: true },
  { sym: "GBP/USD", price: "1.2651", chg: "-0.08%", up: false },
  { sym: "USD/JPY", price: "149.52", chg: "+0.24%", up: true },
  { sym: "XAU/USD", price: "2,352.4", chg: "+0.67%", up: true },
  { sym: "BTC/USD", price: "67,241", chg: "+1.24%", up: true },
  { sym: "EUR/GBP", price: "0.8573", chg: "-0.03%", up: false },
  { sym: "AUD/USD", price: "0.6524", chg: "+0.18%", up: true },
  { sym: "USD/CHF", price: "0.8979", chg: "-0.11%", up: false },
];

function generatePortfolioSnapshots(copies: CopySubscription[]): PerformanceSnapshot[] {
  if (copies.length === 0) return [];
  const avgMonthly = copies.reduce((a, c) => a + c.monthly_profit_pct, 0) / copies.length;
  const result: PerformanceSnapshot[] = [];
  let equity = 10000;
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    const drift = avgMonthly / 100 / 30;
    const noise = (((i * 17 + 43) % 100) / 100 - 0.46) * 0.012;
    equity = equity * (1 + drift + noise);
    result.push({ date, equity: Math.round(equity * 100) / 100 });
  }
  return result;
}

export default function Dashboard({ onNavigateToTraders, onNavigateToMyCopies }: Props) {
  const { tr } = useLang();
  const { token } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [copies, setCopies] = useState<CopySubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const authH: HeadersInit = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch("/api/copy/portfolio", { headers: authH }).then((r) => r.json()),
      fetch("/api/copy/subscriptions", { headers: authH }).then((r) => r.json()),
    ])
      .then(([p, c]: [Portfolio, CopySubscription[]]) => {
        setPortfolio(p);
        setCopies((c as CopySubscription[]).filter((s) => s.status === "active"));
      })
      .finally(() => setLoading(false));
  }, [token]);

  const portfolioChart = useMemo(() => generatePortfolioSnapshots(copies), [copies]);
  const pnlPos = (portfolio?.pnl ?? 0) >= 0;

  const AVATAR_GRADS = ["from-blue-500 to-indigo-700","from-emerald-500 to-teal-700","from-violet-500 to-purple-700","from-amber-500 to-orange-700","from-cyan-500 to-blue-700","from-rose-500 to-red-700"];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-surface-overlay rounded w-1/4" />
        <div className="h-40 bg-surface rounded-xl" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-surface rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Live ticker */}
      <div className="card overflow-hidden py-2">
        <div className="flex overflow-hidden">
          <div className="flex ticker-scroll gap-6 whitespace-nowrap">
            {[...TICKERS, ...TICKERS].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs shrink-0">
                <span className="text-slate-400 font-medium">{t.sym}</span>
                <span className="text-white font-mono">{t.price}</span>
                <span className={t.up ? "text-emerald-400" : "text-red-400"}>{t.chg}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sponsored placement */}
      <AdSlot placement="dashboard_top_banner" />

      {/* Portfolio chart */}
      {portfolioChart.length > 1 ? (
        <div className="card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider">Portfolio Performance (30d)</h2>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-white">
                  ${(portfolio?.equity ?? 10000).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
                <span className={`text-sm font-bold ${pnlPos ? "text-emerald-400" : "text-red-400"}`}>
                  {pnlPos ? "+" : ""}${(portfolio?.pnl ?? 0).toFixed(2)}{" "}
                  ({pnlPos ? "+" : ""}{(portfolio?.pnl_pct ?? 0).toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="text-end">
              <div className="text-slate-500 text-xs">Balance</div>
              <div className="text-white font-bold text-sm">${(portfolio?.balance ?? 0).toLocaleString()}</div>
            </div>
          </div>
          <PerformanceChart data={portfolioChart} height={160} showGrid={true} showTooltip={true} />
        </div>
      ) : null}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: tr.balance, icon: "💰", color: "text-white",
            val: `$${(portfolio?.balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            sub: "Account balance",
          },
          {
            label: tr.equity, icon: "📊", color: "text-blue-400",
            val: `$${(portfolio?.equity ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            sub: "Floating equity",
          },
          {
            label: tr.totalPnl, icon: pnlPos ? "📈" : "📉",
            color: pnlPos ? "text-emerald-400" : "text-red-400",
            val: `${pnlPos ? "+" : ""}$${Math.abs(portfolio?.pnl ?? 0).toFixed(2)}`,
            sub: `${pnlPos ? "+" : ""}${(portfolio?.pnl_pct ?? 0).toFixed(2)}%`,
          },
          {
            label: tr.activeCopies, icon: "🔗", color: "text-violet-400",
            val: String(portfolio?.active_copies ?? 0),
            sub: `${portfolio?.open_trades ?? 0} open trades`,
          },
        ].map((s) => (
          <div key={s.label} className="card p-4 hover:border-border-strong transition-all">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{s.icon}</span>
              <span className="text-slate-500 text-xs">{s.label}</span>
            </div>
            <div className={`text-xl font-black ${s.color} animate-count-up`}>{s.val}</div>
            {s.sub && <div className="text-slate-600 text-xs mt-1">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Active copies */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-sm">{tr.yourActiveCopies}</h2>
          {copies.length > 0 && (
            <button
              onClick={onNavigateToMyCopies}
              className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors flex items-center gap-1"
            >
              {tr.myCopies}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {copies.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center mx-auto mb-4 text-2xl">
              📊
            </div>
            <p className="text-white font-semibold mb-1">{tr.noCopiesYet}</p>
            <p className="text-slate-500 text-sm mb-5">Start copying professional traders to grow your portfolio</p>
            <button
              onClick={onNavigateToTraders}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-600/20 hover:-translate-y-px"
            >
              {tr.exploreTradersBtn}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {copies.slice(0, 6).map((sub, idx) => {
              const grad = AVATAR_GRADS[idx % AVATAR_GRADS.length];
              return (
                <div key={sub.id} className="card-hover p-4 animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-sm`}>
                      {sub.avatar}
                    </div>
                    <div>
                      <div className="text-white text-sm font-bold leading-tight">{sub.trader_name}</div>
                      <div className="text-slate-500 text-xs">{sub.strategy}</div>
                    </div>
                    <div className="ms-auto">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Active" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#080c14] rounded-lg p-2">
                      <div className="text-[10px] text-slate-600 mb-0.5">{tr.monthlyProfit}</div>
                      <div className="text-emerald-400 font-black text-sm">+{sub.monthly_profit_pct.toFixed(1)}%</div>
                    </div>
                    <div className="bg-[#080c14] rounded-lg p-2">
                      <div className="text-[10px] text-slate-600 mb-0.5">{tr.winRate}</div>
                      <div className="text-white font-black text-sm">{sub.win_rate.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
