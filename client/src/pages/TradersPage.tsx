import { useEffect, useState } from "react";
import { Trader, CopySubscription } from "../types";
import { useLang } from "../LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import TraderCard from "../components/TraderCard";
import CopyModal from "../components/CopyModal";
import AdSlot from "../components/ads/AdSlot";

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

  const authH: HeadersInit = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch("/api/traders").then((r) => r.json()),
      fetch("/api/copy/subscriptions", { headers: authH }).then((r) => r.json()),
    ])
      .then(([t, s]: [Trader[], CopySubscription[]]) => {
        setTraders(t);
        setSubscriptions(s.filter((sub) => sub.status === "active"));
      })
      .finally(() => setLoading(false));
  }, []);

  const strategies = [...new Set(traders.map((t) => t.strategy))].sort();
  const copyingIds = new Set(subscriptions.map((s) => s.trader_id));

  const filtered = traders
    .filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.strategy.toLowerCase().includes(search.toLowerCase())) return false;
      if (strategyFilter && t.strategy !== strategyFilter) return false;
      if (riskFilter && t.risk_level !== riskFilter) return false;
      return true;
    })
    .sort((a, b) => (b[sortBy as keyof Trader] as number) - (a[sortBy as keyof Trader] as number));

  const handleCopy = async (lotMultiplier: number, riskPct: number) => {
    if (!copyTarget) return;
    const res = await fetch("/api/copy/subscribe", {
      method: "POST",
      headers: authH,
      body: JSON.stringify({ trader_id: copyTarget.id, lot_multiplier: lotMultiplier, risk_pct: riskPct }),
    });
    if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? tr.error);
    const sub = (await res.json()) as CopySubscription;
    setSubscriptions((prev) => [...prev, sub]);
  };

  const Skeleton = () => (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-overlay" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-surface-overlay rounded w-3/4" />
          <div className="h-2.5 bg-surface-overlay rounded w-1/2" />
        </div>
      </div>
      <div className="h-16 bg-surface-overlay rounded-lg" />
      <div className="h-6 bg-surface-overlay rounded w-1/3" />
      <div className="grid grid-cols-3 gap-2">
        {[0,1,2].map(i => <div key={i} className="h-8 bg-surface-overlay rounded" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-black text-white">{tr.discoverTraders}</h1>
        <p className="text-slate-500 text-sm mt-1">{tr.discoverSubtitle}</p>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[150px]">
          <svg className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={tr.searchTraders}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#080c14] border border-[#1a2235] text-white placeholder-slate-600 rounded-lg ps-8 pe-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        {[
          {
            val: strategyFilter, set: setStrategyFilter, def: tr.allStrategies,
            opts: strategies.map((s) => ({ v: s, l: s })),
          },
          {
            val: riskFilter, set: setRiskFilter, def: tr.allRisks,
            opts: ["low","medium","high"].map((r) => ({ v: r, l: tr[r as "low"|"medium"|"high"] })),
          },
          {
            val: sortBy, set: setSortBy, def: null,
            opts: [
              { v: "total_profit_pct", l: tr.totalProfit },
              { v: "monthly_profit_pct", l: tr.monthlyProfit },
              { v: "win_rate", l: tr.winRate },
              { v: "followers", l: tr.followers },
              { v: "max_drawdown", l: tr.maxDrawdown },
            ],
          },
        ].map((f, fi) => (
          <select
            key={fi}
            value={f.val}
            onChange={(e) => f.set(e.target.value)}
            className="bg-[#080c14] border border-[#1a2235] text-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors cursor-pointer"
          >
            {f.def && <option value="">{f.def}</option>}
            {f.opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}
      </div>

      {/* Results count */}
      {!loading && (
        <div className="flex items-center justify-between">
          <div className="text-slate-500 text-xs">
            {filtered.length} trader{filtered.length !== 1 ? "s" : ""} found
            {copyingIds.size > 0 && <span className="text-emerald-500 ms-2">• {copyingIds.size} copying</span>}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? [...Array(6)].map((_, i) => <Skeleton key={i} />)
          : filtered.length === 0
            ? (
              <div className="col-span-full text-center py-16 card">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-slate-400 text-sm">No traders match your filters</p>
              </div>
            )
            : filtered.flatMap((trader, idx) => {
              const card = (
                <TraderCard
                  key={trader.id}
                  trader={trader}
                  rank={idx + 1}
                  isCopying={copyingIds.has(trader.id)}
                  onCopy={(t) => setCopyTarget(t)}
                  onViewProfile={onViewProfile}
                />
              );
              // Inject one native sponsored card into the feed.
              return idx === 4
                ? [card, <AdSlot key="ad-native" placement="traders_native_card" />]
                : [card];
            })
        }
      </div>

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
