import { useEffect, useState, useCallback } from "react";
import { useLang } from "../../LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { AdCampaign, AdCreative } from "../../types";

interface Revenue {
  revenue: number; impressions: number; clicks: number; ecpm: number;
  advertisers: number; activeCampaigns: number; pendingReview: number;
  topCampaigns: Array<{ name: string; advertiser: string; revenue: number }>;
}

export default function AdsAdminPage() {
  const { tr } = useLang();
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [rev, setRev] = useState<Revenue | null>(null);
  const [queue, setQueue] = useState<(AdCampaign & { advertiser_name: string; creatives: AdCreative[] })[]>([]);

  const load = useCallback(() => {
    fetch("/api/ads/admin/revenue", { headers }).then((r) => r.json()).then(setRev).catch(() => {});
    fetch("/api/ads/admin/moderation?status=pending_review", { headers }).then((r) => r.json()).then((d) => setQueue(d.campaigns || [])).catch(() => {});
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, action: "approve" | "reject") => {
    const body = action === "reject" ? JSON.stringify({ reason: prompt(tr.rejectReason) || "Does not meet ad policy" }) : undefined;
    await fetch(`/api/ads/admin/campaigns/${id}/${action}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body });
    load();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-white font-black text-xl">{tr.adminRevenueTitle}</h1>
        <p className="text-slate-500 text-sm">{tr.adsSubtitle}</p>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={tr.totalRevenue} value={`$${(rev?.revenue ?? 0).toFixed(2)}`} accent="text-emerald-400" />
        <Stat label={tr.impressionsLabel} value={(rev?.impressions ?? 0).toLocaleString()} />
        <Stat label={tr.clicksLabel} value={(rev?.clicks ?? 0).toLocaleString()} />
        <Stat label="eCPM" value={`$${(rev?.ecpm ?? 0).toFixed(2)}`} accent="text-blue-400" />
        <Stat label={tr.advertisersLabel} value={String(rev?.advertisers ?? 0)} />
        <Stat label={tr.activeCampaignsLabel} value={String(rev?.activeCampaigns ?? 0)} accent="text-emerald-400" />
        <Stat label={tr.pendingReviewLabel} value={String(rev?.pendingReview ?? 0)} accent="text-amber-400" />
      </div>

      {/* Top campaigns */}
      {rev && rev.topCampaigns.length > 0 && (
        <div className="card p-5">
          <div className="text-white font-bold text-sm mb-3">{tr.topCampaignsLabel}</div>
          <div className="space-y-2">
            {rev.topCampaigns.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{c.name} <span className="text-slate-600 text-xs">· {c.advertiser}</span></span>
                <span className="text-emerald-400 font-bold">${c.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moderation queue */}
      <div>
        <div className="text-white font-bold text-sm mb-3">{tr.moderationQueue}</div>
        {queue.length === 0 ? (
          <div className="card p-8 text-center text-slate-500 text-sm">{tr.nothingToReview}</div>
        ) : (
          <div className="space-y-3">
            {queue.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-white font-bold text-sm">{c.name} <span className="text-slate-600 text-xs font-normal">· {c.advertiser_name}</span></div>
                    <div className="text-slate-500 text-xs mt-0.5">{c.pricing_model.toUpperCase()} · ${c.bid_amount} · {c.placement}</div>
                    {c.creatives?.[0] && (
                      <div className="mt-2 text-xs">
                        <span className="text-white font-medium">{c.creatives[0].headline}</span>
                        {c.creatives[0].body && <span className="text-slate-400"> — {c.creatives[0].body}</span>}
                        <div className="text-blue-400/70 mt-0.5 break-all">{c.creatives[0].landing_url}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => decide(c.id, "approve")} className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors">{tr.approve}</button>
                    <button onClick={() => decide(c.id, "reject")} className="px-3.5 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold transition-colors">{tr.reject}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent = "text-white" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="text-slate-500 text-xs mb-1">{label}</div>
      <div className={`font-black text-xl ${accent}`}>{value}</div>
    </div>
  );
}
