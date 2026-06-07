import { useEffect, useState, useCallback, ChangeEvent } from "react";
import { useLang } from "../../LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { AdCampaign, Advertiser, User } from "../../types";

const inputCls =
  "w-full bg-[#0b1119] border border-[#1a2235] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-500 outline-none transition-colors";
const labelCls = "block text-slate-400 text-xs font-medium mb-1.5";

const STATUS_STYLES: Record<string, string> = {
  draft: "text-slate-400 bg-slate-500/10",
  pending_review: "text-amber-300 bg-amber-500/10",
  active: "text-emerald-300 bg-emerald-500/10",
  paused: "text-slate-300 bg-slate-500/10",
  completed: "text-blue-300 bg-blue-500/10",
  rejected: "text-red-300 bg-red-500/10",
};

type Tab = "overview" | "create" | "wallet" | "reports";

export default function AdsConsolePage() {
  const { tr } = useLang();
  const { token, setSession } = useAuth();
  const authH = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [loading, setLoading] = useState(true);
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const loadAdvertiser = useCallback(async () => {
    const res = await fetch("/api/ads/advertisers/me", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { setAdvertiser((await res.json()).advertiser); setNeedsOnboarding(false); }
    else { setNeedsOnboarding(true); }
    setLoading(false);
  }, [token]);

  useEffect(() => { loadAdvertiser(); }, [loadAdvertiser]);

  // Handle Stripe top-up return (?ads_topup=success&session_id=)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("ads_topup") === "success" && p.get("session_id")) {
      fetch(`/api/ads/wallet/confirm?session_id=${p.get("session_id")}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then(() => { flash(tr.funded); loadAdvertiser(); });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [token, tr.funded, loadAdvertiser]);

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-surface rounded" /><div className="h-40 bg-surface rounded-xl" /></div>;
  }

  if (needsOnboarding) {
    return <Onboarding onDone={(adv, t, u) => { setSession(t, u); setAdvertiser(adv); setNeedsOnboarding(false); }} />;
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: tr.tabOverview },
    { id: "create", label: tr.tabCreate },
    { id: "wallet", label: tr.tabWallet },
    { id: "reports", label: tr.tabReports },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-black text-xl">{tr.adsTitle}</h1>
          <p className="text-slate-500 text-sm">{tr.adsSubtitle}</p>
        </div>
        <div className="card px-4 py-2.5 flex items-center gap-3">
          <span className="text-slate-500 text-xs">{tr.walletBalance}</span>
          <span className="text-emerald-400 font-black text-lg">${(advertiser?.wallet_balance ?? 0).toFixed(2)}</span>
          <button onClick={() => setTab("wallet")} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors">
            {tr.topUp}
          </button>
        </div>
      </div>

      {/* Risk / compliance note */}
      <div className="flex items-start gap-2 text-[11px] text-amber-300/80 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
        <span>⚠️</span><span>{tr.adRiskWarning}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#0b1119] border border-[#1a2235] rounded-xl w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === t.id ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20" : "text-slate-400 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <CampaignsTab token={token!} flash={flash} onGoCreate={() => setTab("create")} onGoWallet={() => setTab("wallet")} />}
      {tab === "create" && <CreateTab authH={authH} flash={flash} onCreated={() => setTab("overview")} onNeedFunds={() => setTab("wallet")} />}
      {tab === "wallet" && <WalletTab token={token!} advertiser={advertiser} onChange={loadAdvertiser} flash={flash} />}
      {tab === "reports" && <ReportsTab token={token!} />}

      {toast && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 animate-slide-up">
          <div className="bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-2xl">{toast}</div>
        </div>
      )}
    </div>
  );
}

// ── Onboarding ──
function Onboarding({ onDone }: { onDone: (adv: Advertiser, token: string, user: User) => void }) {
  const { tr } = useLang();
  const { token } = useAuth();
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const res = await fetch("/api/ads/advertisers", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: company || "My Company", website }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok && data.token) onDone(data.advertiser, data.token, data.user);
  };

  return (
    <div className="max-w-md mx-auto mt-6 animate-scale-in">
      <div className="card p-7 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-600/15 border border-brand-600/25 flex items-center justify-center mx-auto mb-4 text-2xl">📣</div>
        <h1 className="text-white font-black text-xl mb-1">{tr.becomeAdvertiserTitle}</h1>
        <p className="text-slate-500 text-sm mb-6">{tr.becomeAdvertiserDesc}</p>
        <div className="space-y-3 text-start">
          <div>
            <label className={labelCls}>{tr.companyName}</label>
            <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Capital" />
          </div>
          <div>
            <label className={labelCls}>{tr.websiteOptional}</label>
            <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
          </div>
        </div>
        <button onClick={submit} disabled={busy}
          className="mt-5 w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-600/20">
          {busy ? "…" : tr.becomeAdvertiserBtn}
        </button>
      </div>
    </div>
  );
}

// ── Campaigns tab ──
function CampaignsTab({ token, flash, onGoCreate, onGoWallet }: { token: string; flash: (m: string) => void; onGoCreate: () => void; onGoWallet: () => void }) {
  const { tr } = useLang();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/ads/campaigns", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => setCampaigns(d.campaigns || [])).finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, path: string, body?: object) => {
    const res = await fetch(`/api/ads/campaigns/${id}/${path}`, {
      method: path === "submit" ? "POST" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { flash(data.error || tr.error); if ((data.error || "").toLowerCase().includes("wallet")) onGoWallet(); return; }
    load();
  };

  const patch = async (id: string, action: "pause" | "resume") => {
    await fetch(`/api/ads/campaigns/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    load();
  };

  if (loading) return <div className="h-32 bg-surface rounded-xl animate-pulse" />;

  if (campaigns.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="text-3xl mb-3">🚀</div>
        <p className="text-white font-bold mb-1">{tr.noCampaignsYet}</p>
        <p className="text-slate-500 text-sm mb-5">{tr.createFirstCampaign}</p>
        <button onClick={onGoCreate} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-600/20">{tr.createCampaign}</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((c) => (
        <div key={c.id} className="card p-4 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">{c.name}</span>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_STYLES[c.status]}`}>
                {tr[`status${c.status.replace(/(^|_)([a-z])/g, (_, __, l) => l.toUpperCase())}` as keyof typeof tr] as string || c.status}
              </span>
            </div>
            <div className="text-slate-500 text-xs mt-0.5">
              {c.pricing_model.toUpperCase()} · ${c.bid_amount} {c.pricing_model === "cpc" ? tr.perClick : tr.per1000}
            </div>
          </div>
          <Metric label={tr.impressionsLabel} value={String(c.impressions ?? 0)} />
          <Metric label={tr.clicksLabel} value={String(c.clicks ?? 0)} />
          <Metric label={tr.ctrLabel} value={`${((c.ctr ?? 0) * 100).toFixed(1)}%`} />
          <Metric label={tr.spendLabel} value={`$${(c.spent ?? 0).toFixed(2)}`} />
          <div className="flex gap-2">
            {(c.status === "draft" || c.status === "rejected") && (
              <button onClick={() => act(c.id, "submit")} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors">{tr.goLive}</button>
            )}
            {c.status === "active" && (
              <button onClick={() => patch(c.id, "pause")} className="px-3 py-1.5 rounded-lg bg-[#1a2235] hover:bg-[#22304a] text-slate-300 text-xs font-bold transition-colors">{tr.pause}</button>
            )}
            {c.status === "paused" && (
              <button onClick={() => patch(c.id, "resume")} className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-colors">{tr.resume}</button>
            )}
          </div>
          {c.status === "rejected" && c.review_notes && (
            <div className="w-full text-red-300/80 text-xs bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-1.5">{c.review_notes}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center px-2">
      <div className="text-white font-black text-sm">{value}</div>
      <div className="text-slate-600 text-[10px] uppercase tracking-wide">{label}</div>
    </div>
  );
}

// ── Create tab ──
function CreateTab({ authH, flash, onCreated, onNeedFunds }: { authH: HeadersInit; flash: (m: string) => void; onCreated: () => void; onNeedFunds: () => void }) {
  const { tr } = useLang();
  const [f, setF] = useState({
    name: "", objective: "traffic", pricing_model: "cpc" as "cpc" | "cpm", bid_amount: 0.5,
    daily_budget: 25, total_budget: 200, placement: "dashboard_top_banner",
    headline: "", body: "", cta_label: "Learn More", landing_url: "https://", accent: "blue",
    image_url: "", t_plans: [] as string[], t_locales: [] as string[], t_countries: "", t_interests: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));
  const togglePlan = (v: string) => setF((s) => ({ ...s, t_plans: s.t_plans.includes(v) ? s.t_plans.filter((x) => x !== v) : [...s.t_plans, v] }));
  const toggleLocale = (v: string) => setF((s) => ({ ...s, t_locales: s.t_locales.includes(v) ? s.t_locales.filter((x) => x !== v) : [...s.t_locales, v] }));

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400_000) { flash(tr.imageTooLarge); return; }
    const reader = new FileReader();
    reader.onload = () => set("image_url", String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    setBusy(true);
    const targeting: Record<string, unknown> = {};
    if (f.t_plans.length) targeting.plans = f.t_plans;
    if (f.t_locales.length) targeting.locales = f.t_locales;
    const countries = f.t_countries.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (countries.length) targeting.countries = countries;
    const interests = f.t_interests.split(",").map((s) => s.trim()).filter(Boolean);
    if (interests.length) targeting.interests = interests;

    const res = await fetch("/api/ads/campaigns", {
      method: "POST", headers: authH,
      body: JSON.stringify({
        name: f.name, objective: f.objective, pricing_model: f.pricing_model, bid_amount: Number(f.bid_amount),
        daily_budget: Number(f.daily_budget), total_budget: Number(f.total_budget), placement: f.placement,
        targeting: Object.keys(targeting).length ? targeting : undefined,
        creative: { headline: f.headline, body: f.body, cta_label: f.cta_label, landing_url: f.landing_url, accent: f.accent, locale: "en", image_url: f.image_url || undefined },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); flash(data.error || tr.error); return; }
    // Try to go live immediately.
    const sub = await fetch(`/api/ads/campaigns/${data.campaign.id}/submit`, { method: "POST", headers: authH });
    const subData = await sub.json().catch(() => ({}));
    setBusy(false);
    if (!sub.ok) {
      flash(subData.error || tr.campaignCreated);
      if ((subData.error || "").toLowerCase().includes("wallet")) onNeedFunds();
      else onCreated();
      return;
    }
    flash(subData.autoApproved ? tr.statusActive : tr.statusPending);
    onCreated();
  };

  const accents = ["blue", "emerald", "violet", "amber"];
  const accentBg: Record<string, string> = { blue: "bg-blue-500", emerald: "bg-emerald-500", violet: "bg-violet-500", amber: "bg-amber-500" };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5">
      {/* Form */}
      <div className="card p-5 space-y-4">
        <div>
          <label className={labelCls}>{tr.campaignNameLabel}</label>
          <input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Spring Broker Promo" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{tr.objective}</label>
            <select className={inputCls} value={f.objective} onChange={(e) => set("objective", e.target.value)}>
              <option value="traffic">{tr.objTraffic}</option>
              <option value="awareness">{tr.objAwareness}</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{tr.placement}</label>
            <select className={inputCls} value={f.placement} onChange={(e) => set("placement", e.target.value)}>
              <option value="dashboard_top_banner">{tr.placeBanner}</option>
              <option value="traders_native_card">{tr.placeNative}</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>{tr.pricingModel}</label>
            <select className={inputCls} value={f.pricing_model} onChange={(e) => set("pricing_model", e.target.value)}>
              <option value="cpc">CPC</option>
              <option value="cpm">CPM</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{tr.bidLabel} ($)</label>
            <input type="number" step="0.05" min="0.05" className={inputCls} value={f.bid_amount} onChange={(e) => set("bid_amount", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{tr.totalBudget} ($)</label>
            <input type="number" step="10" min="0" className={inputCls} value={f.total_budget} onChange={(e) => set("total_budget", e.target.value)} />
          </div>
        </div>

        <div className="h-px bg-[#1a2235]" />

        <div>
          <label className={labelCls}>{tr.adHeadline}</label>
          <input className={inputCls} value={f.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Trade with 0.0 spreads" maxLength={80} />
        </div>
        <div>
          <label className={labelCls}>{tr.adBody}</label>
          <input className={inputCls} value={f.body} onChange={(e) => set("body", e.target.value)} placeholder="Regulated broker. Open an account in minutes." maxLength={160} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{tr.ctaLabel}</label>
            <input className={inputCls} value={f.cta_label} onChange={(e) => set("cta_label", e.target.value)} maxLength={24} />
          </div>
          <div>
            <label className={labelCls}>{tr.landingUrl}</label>
            <input className={inputCls} value={f.landing_url} onChange={(e) => set("landing_url", e.target.value)} placeholder="https://" />
          </div>
        </div>
        <div>
          <label className={labelCls}>{tr.accentColor}</label>
          <div className="flex gap-2">
            {accents.map((a) => (
              <button key={a} onClick={() => set("accent", a)}
                className={`w-8 h-8 rounded-lg ${accentBg[a]} transition-all ${f.accent === a ? "ring-2 ring-white ring-offset-2 ring-offset-[#0f1520]" : "opacity-60 hover:opacity-100"}`} />
            ))}
          </div>
        </div>

        {/* Image */}
        <div>
          <label className={labelCls}>{tr.adImage}</label>
          {f.image_url ? (
            <div className="flex items-center gap-3">
              <img src={f.image_url} alt="" className="w-16 h-16 rounded-lg object-cover border border-[#1a2235]" />
              <button onClick={() => set("image_url", "")} className="text-red-400 hover:text-red-300 text-xs font-bold">{tr.removeImage}</button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border border-dashed border-[#2a3a55] rounded-lg py-3 text-slate-500 text-xs cursor-pointer hover:border-brand-500 hover:text-slate-300 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {tr.imageHint}
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
          )}
        </div>

        <div className="h-px bg-[#1a2235]" />

        {/* Targeting */}
        <div className="space-y-3">
          <div>
            <div className="text-white font-bold text-sm">{tr.targetingTitle}</div>
            <div className="text-slate-600 text-xs">{tr.targetingHint}</div>
          </div>
          <div>
            <label className={labelCls}>{tr.plansLabel}</label>
            <div className="flex gap-2">
              {["free", "pro"].map((p) => (
                <button key={p} onClick={() => togglePlan(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${f.t_plans.includes(p) ? "bg-brand-600 text-white" : "bg-[#0b1119] border border-[#1a2235] text-slate-400 hover:text-white"}`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>{tr.languagesLabel}</label>
            <div className="flex flex-wrap gap-1.5">
              {["en", "ar", "fr", "es", "tr", "de", "zh", "he"].map((l) => (
                <button key={l} onClick={() => toggleLocale(l)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-all ${f.t_locales.includes(l) ? "bg-brand-600 text-white" : "bg-[#0b1119] border border-[#1a2235] text-slate-400 hover:text-white"}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{tr.countriesLabel}</label>
              <input className={inputCls} value={f.t_countries} onChange={(e) => set("t_countries", e.target.value)} placeholder="AE, SA, EG" />
            </div>
            <div>
              <label className={labelCls}>{tr.interestsLabel}</label>
              <input className={inputCls} value={f.t_interests} onChange={(e) => set("t_interests", e.target.value)} placeholder="Scalping, high" />
            </div>
          </div>
        </div>

        <button onClick={submit} disabled={busy}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20">
          {busy ? "…" : tr.submitForReview}
        </button>
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <div className="text-slate-500 text-xs font-medium">{tr.livePreview}</div>
        <PreviewCard accent={f.accent} headline={f.headline || tr.adHeadline} body={f.body} cta={f.cta_label} placement={f.placement} image={f.image_url} />
      </div>
    </div>
  );
}

function PreviewCard({ accent, headline, body, cta, placement, image }: { accent: string; headline: string; body: string; cta: string; placement: string; image?: string }) {
  const { tr } = useLang();
  const chip: Record<string, string> = { blue: "text-blue-300 bg-blue-500/10", emerald: "text-emerald-300 bg-emerald-500/10", violet: "text-violet-300 bg-violet-500/10", amber: "text-amber-300 bg-amber-500/10" };
  const btn: Record<string, string> = { blue: "bg-blue-600", emerald: "bg-emerald-600", violet: "bg-violet-600", amber: "bg-amber-600" };
  const isBanner = placement === "dashboard_top_banner";
  return (
    <div className={`card p-4 border ${accent === "blue" ? "border-blue-500/25" : accent === "emerald" ? "border-emerald-500/25" : accent === "violet" ? "border-violet-500/25" : "border-amber-500/25"} ${isBanner ? "" : "max-w-[260px]"}`}>
      {image && <img src={image} alt="" className="w-full h-24 object-cover rounded-lg mb-3" />}
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-xl ${btn[accent]} flex items-center justify-center text-white font-black text-sm`}>A</div>
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${chip[accent]}`}>{tr.sponsored}</span>
      </div>
      <div className="text-white font-bold text-sm leading-tight">{headline}</div>
      {body && <div className="text-slate-400 text-xs mt-1.5">{body}</div>}
      <button className={`mt-3 w-full py-2 rounded-lg text-white text-xs font-bold ${btn[accent]}`}>{cta || "Learn More"}</button>
    </div>
  );
}

// ── Wallet tab ──
function WalletTab({ token, advertiser, onChange, flash }: { token: string; advertiser: Advertiser | null; onChange: () => void; flash: (m: string) => void }) {
  const { tr } = useLang();
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const [ledger, setLedger] = useState<Array<{ id: string; type: string; amount: number; balance_after: number; created_at: string }>>([]);

  useEffect(() => {
    fetch("/api/ads/advertisers/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => setLedger(d.ledger || []));
  }, [token, advertiser?.wallet_balance]);

  const topUp = async (amt: number) => {
    setBusy(true);
    const res = await fetch("/api/ads/wallet/topup", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { flash(data.error || tr.error); return; }
    if (data.url) { window.location.href = data.url; return; } // Stripe checkout
    flash(tr.funded); onChange();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card p-6">
        <div className="text-slate-500 text-xs">{tr.walletBalance}</div>
        <div className="text-emerald-400 font-black text-4xl mt-1">${(advertiser?.wallet_balance ?? 0).toFixed(2)}</div>
        <div className="h-px bg-[#1a2235] my-5" />
        <label className={labelCls}>{tr.topUpAmount}</label>
        <div className="flex gap-2 mb-3">
          {[50, 100, 250, 500].map((a) => (
            <button key={a} onClick={() => setAmount(a)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${amount === a ? "bg-brand-600 text-white" : "bg-[#0b1119] border border-[#1a2235] text-slate-400 hover:text-white"}`}>${a}</button>
          ))}
        </div>
        <input type="number" min="1" className={inputCls} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <button onClick={() => topUp(amount)} disabled={busy}
          className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20">
          {busy ? "…" : `${tr.addFunds} · $${amount}`}
        </button>
      </div>

      <div className="card p-5">
        <div className="text-white font-bold text-sm mb-3">{tr.tabWallet}</div>
        {ledger.length === 0 ? (
          <div className="text-slate-600 text-sm py-6 text-center">—</div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
            {ledger.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{l.type === "topup" ? "＋ " + tr.addFunds : l.type === "spend" ? tr.spendLabel : l.type}</span>
                <span className={l.amount >= 0 ? "text-emerald-400 font-bold" : "text-slate-400"}>{l.amount >= 0 ? "+" : ""}${Math.abs(l.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reports tab ──
function ReportsTab({ token }: { token: string }) {
  const { tr } = useLang();
  const [data, setData] = useState<{ campaigns: AdCampaign[]; totals: { impressions: number; clicks: number; spent: number } } | null>(null);

  useEffect(() => {
    fetch("/api/ads/reports", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then(setData);
  }, [token]);

  if (!data) return <div className="h-32 bg-surface rounded-xl animate-pulse" />;

  const totals = data.totals;
  const ctr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Summary label={tr.impressionsLabel} value={totals.impressions.toLocaleString()} />
        <Summary label={tr.clicksLabel} value={totals.clicks.toLocaleString()} />
        <Summary label={tr.ctrLabel} value={`${ctr.toFixed(2)}%`} />
        <Summary label={tr.spendLabel} value={`$${totals.spent.toFixed(2)}`} />
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-xs border-b border-[#1a2235]">
              <th className="text-start font-medium px-4 py-2.5">{tr.campaignNameLabel}</th>
              <th className="text-end font-medium px-3 py-2.5">{tr.impressionsLabel}</th>
              <th className="text-end font-medium px-3 py-2.5">{tr.clicksLabel}</th>
              <th className="text-end font-medium px-3 py-2.5">{tr.ctrLabel}</th>
              <th className="text-end font-medium px-4 py-2.5">{tr.spendLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.campaigns.map((c) => (
              <tr key={c.id} className="border-b border-[#11182a] last:border-0">
                <td className="px-4 py-2.5 text-white font-medium">{c.name}</td>
                <td className="px-3 py-2.5 text-end text-slate-300">{(c.impressions ?? 0).toLocaleString()}</td>
                <td className="px-3 py-2.5 text-end text-slate-300">{(c.clicks ?? 0).toLocaleString()}</td>
                <td className="px-3 py-2.5 text-end text-slate-300">{((c.ctr ?? 0) * 100).toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-end text-emerald-400 font-bold">${(c.spent ?? 0).toFixed(2)}</td>
              </tr>
            ))}
            {data.campaigns.length === 0 && (
              <tr><td colSpan={5} className="text-center text-slate-600 py-8">{tr.noCampaignsYet}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-slate-500 text-xs mb-1">{label}</div>
      <div className="text-white font-black text-xl">{value}</div>
    </div>
  );
}
