import { useEffect, useState } from "react";
import { Trader, CopySubscription } from "../types";
import { useLang } from "../LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import TraderCard from "../components/TraderCard";
import CopyModal from "../components/CopyModal";

interface Props {
  onViewProfile: (trader: Trader) => void;
}

export default function TradersPage({ onViewProfile }: Props) {
  const { tr } = useLang();
  const { token } = useAuth();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [subscriptions, setSubscriptions] = useState<CopySubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [sortBy, setSortBy] = useState("total_profit_pct");
  const [copyTarget, setCopyTarget] = useState<Trader | null>(null);

  const authHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/traders").then((r) => r.json()),
      fetch("/api/copy/subscriptions", { headers: authHeaders() }).then((r) => r.json()),
    ])
      .then(([t, s]: [Trader[], CopySubscription[]]) => {
        setTraders(t);
        setSubscriptions(s.filter((sub) => sub.status === "active"));
      })
      .finally(() => setLoading(false));
  }, []);

  const strategies = [...new Set(traders.map((t) => t.strategy))];
  const copyingIds = new Set(subscriptions.map((s) => s.trader_id));

  const filtered = traders
    .filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.strategy.toLowerCase().includes(search.toLowerCase())) return false;
      if (strategyFilter && t.strategy !== strategyFilter) return false;
      if (riskFilter && t.risk_level !== riskFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const key = sortBy as keyof Trader;
      const av = a[key] as number;
      const bv = b[key] as number;
      return bv - av;
    });

  const handleCopy = async (lotMultiplier: number, riskPct: number) => {
    if (!copyTarget) return;
    const res = await fetch("/api/copy/subscribe", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ trader_id: copyTarget.id, lot_multiplier: lotMultiplier, risk_pct: riskPct }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? tr.error);
    }
    const sub = (await res.json()) as CopySubscription;
    setSubscriptions((prev) => [...prev, sub]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">{tr.discoverTraders}</h1>
        <p className="text-slate-400 text-sm mt-1">{tr.discoverSubtitle}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder={tr.searchTraders}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <select
          value={strategyFilter}
          onChange={(e) => setStrategyFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">{tr.allStrategies}</option>
          {strategies.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">{tr.allRisks}</option>
          <option value="low">{tr.low}</option>
          <option value="medium">{tr.medium}</option>
          <option value="high">{tr.high}</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="total_profit_pct">{tr.totalProfit}</option>
          <option value="monthly_profit_pct">{tr.monthlyProfit}</option>
          <option value="win_rate">{tr.winRate}</option>
          <option value="followers">{tr.followers}</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No traders found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((trader) => (
            <TraderCard
              key={trader.id}
              trader={trader}
              isCopying={copyingIds.has(trader.id)}
              onCopy={(t) => setCopyTarget(t)}
              onViewProfile={onViewProfile}
            />
          ))}
        </div>
      )}

      {copyTarget && (
        <CopyModal
          trader={copyTarget}
          onConfirm={handleCopy}
          onClose={() => setCopyTarget(null)}
        />
      )}
    </div>
  );
}
