import { useEffect, useState } from "react";
import { Portfolio, CopySubscription } from "../types";
import { useLang } from "../LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import StatCard from "../components/StatCard";

interface Props {
  onNavigateToTraders: () => void;
  onNavigateToMyCopies: () => void;
}

export default function Dashboard({ onNavigateToTraders, onNavigateToMyCopies }: Props) {
  const { tr } = useLang();
  const { token } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [copies, setCopies] = useState<CopySubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/copy/portfolio", { headers: authHeaders() }).then((r) => r.json()),
      fetch("/api/copy/subscriptions", { headers: authHeaders() }).then((r) => r.json()),
    ])
      .then(([p, c]: [Portfolio, CopySubscription[]]) => {
        setPortfolio(p);
        setCopies((c as CopySubscription[]).filter((s) => s.status === "active"));
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pnlPositive = (portfolio?.pnl ?? 0) >= 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">{tr.portfolioOverview}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={tr.balance}
          value={`$${(portfolio?.balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon="💰"
        />
        <StatCard
          label={tr.equity}
          value={`$${(portfolio?.equity ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon="📈"
        />
        <StatCard
          label={tr.totalPnl}
          value={`${pnlPositive ? "+" : ""}$${(portfolio?.pnl ?? 0).toFixed(2)}`}
          sub={`${pnlPositive ? "+" : ""}${(portfolio?.pnl_pct ?? 0).toFixed(2)}%`}
          color={pnlPositive ? "green" : "red"}
          icon={pnlPositive ? "🟢" : "🔴"}
        />
        <StatCard
          label={tr.activeCopies}
          value={String(portfolio?.active_copies ?? 0)}
          sub={`${portfolio?.open_trades ?? 0} ${tr.openTrades}`}
          color="blue"
          icon="📋"
        />
      </div>

      {/* Active copies */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">{tr.yourActiveCopies}</h2>
          {copies.length > 0 && (
            <button onClick={onNavigateToMyCopies} className="text-blue-400 text-sm hover:text-blue-300">
              {tr.myCopies} →
            </button>
          )}
        </div>

        {copies.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-slate-400 mb-4">{tr.noCopiesYet}</p>
            <button
              onClick={onNavigateToTraders}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
            >
              {tr.exploreTradersBtn}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {copies.slice(0, 6).map((sub) => {
              const avatarColors = ["from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600", "from-purple-500 to-pink-600", "from-orange-500 to-amber-600"];
              const grad = avatarColors[parseInt(sub.trader_id?.replace(/\D/g, "").slice(-1) ?? "0") % avatarColors.length];
              return (
                <div
                  key={sub.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm`}>
                      {sub.avatar}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{sub.trader_name}</div>
                      <div className="text-slate-500 text-xs">{sub.strategy}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">{tr.monthlyProfit}</div>
                      <div className="text-emerald-400 font-semibold">+{sub.monthly_profit_pct.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-slate-500">{tr.winRate}</div>
                      <div className="text-white font-semibold">{sub.win_rate.toFixed(1)}%</div>
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
