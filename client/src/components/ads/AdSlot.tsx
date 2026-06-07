import { useEffect, useRef, useState } from "react";
import { ServedAd } from "../../types";
import { useLang } from "../../LanguageContext";
import { useAuth } from "../../contexts/AuthContext";

interface Props {
  placement: "dashboard_top_banner" | "traders_native_card";
  className?: string;
}

// Static class strings so Tailwind keeps them in the build.
const ACCENTS: Record<string, { ring: string; chip: string; btn: string; glow: string }> = {
  blue:    { ring: "border-blue-500/25",    chip: "text-blue-300 bg-blue-500/10",       btn: "bg-blue-600 hover:bg-blue-500",       glow: "from-blue-500/10" },
  emerald: { ring: "border-emerald-500/25", chip: "text-emerald-300 bg-emerald-500/10", btn: "bg-emerald-600 hover:bg-emerald-500", glow: "from-emerald-500/10" },
  violet:  { ring: "border-violet-500/25",  chip: "text-violet-300 bg-violet-500/10",   btn: "bg-violet-600 hover:bg-violet-500",   glow: "from-violet-500/10" },
  amber:   { ring: "border-amber-500/25",   chip: "text-amber-300 bg-amber-500/10",     btn: "bg-amber-600 hover:bg-amber-500",     glow: "from-amber-500/10" },
};

export default function AdSlot({ placement, className = "" }: Props) {
  const { lang, tr } = useLang();
  const { user, token } = useAuth();
  const [ad, setAd] = useState<ServedAd | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ placement, locale: lang, plan: user?.plan ?? "free" });
    fetch(`/api/ads/serve?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((r) => (r.status === 204 || !r.ok ? null : (r.json() as Promise<ServedAd>)))
      .then((data) => { if (alive) setAd(data); })
      .catch(() => { if (alive) setAd(null); }); // fail-safe: empty slot
    return () => { alive = false; };
  }, [placement, lang, user?.plan, token]);

  // Count a viewable impression (>=50% visible) once.
  useEffect(() => {
    if (!ad || !ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !seen.current) {
          seen.current = true;
          track("impression", ad.impressionToken);
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ad]);

  function track(type: "impression" | "click", t: string) {
    fetch("/api/ads/events", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ type, token: t }),
    }).catch(() => {});
  }

  if (!ad) return null;

  const a = ACCENTS[ad.accent] ?? ACCENTS.blue;
  const onClick = () => {
    track("click", ad.clickToken);
    window.open(ad.landingUrl, "_blank", "noopener,noreferrer");
  };

  // Compact horizontal banner
  if (placement === "dashboard_top_banner") {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`group relative card overflow-hidden border ${a.ring} p-3.5 sm:p-4 cursor-pointer animate-fade-in hover:-translate-y-px transition-transform ${className}`}
        role="link"
        aria-label={ad.headline}
      >
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${a.glow} to-transparent opacity-60`} />
        <div className="relative flex items-center gap-3.5">
          {ad.imageUrl ? (
            <img src={ad.imageUrl} alt="" className="shrink-0 w-10 h-10 rounded-xl object-cover shadow-lg" loading="lazy" />
          ) : (
            <div className={`shrink-0 w-10 h-10 rounded-xl ${a.btn} flex items-center justify-center text-white font-black text-base shadow-lg`}>
              {ad.advertiser.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${a.chip}`}>{tr.sponsored}</span>
              <span className="text-slate-500 text-[11px] truncate">{ad.advertiser}</span>
            </div>
            <div className="text-white font-bold text-sm leading-tight mt-1 truncate">{ad.headline}</div>
            {ad.body && <div className="text-slate-400 text-xs truncate hidden sm:block">{ad.body}</div>}
          </div>
          <button className={`shrink-0 px-3.5 py-2 rounded-lg text-white text-xs font-bold ${a.btn} transition-colors`}>
            {ad.ctaLabel}
          </button>
        </div>
      </div>
    );
  }

  // Native card (matches trader cards in the feed)
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`group relative card-hover overflow-hidden border ${a.ring} p-4 cursor-pointer animate-fade-in flex flex-col ${className}`}
      role="link"
      aria-label={ad.headline}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent opacity-50`} />
      {ad.imageUrl && (
        <img src={ad.imageUrl} alt="" className="relative w-full h-28 object-cover rounded-lg mb-3" loading="lazy" />
      )}
      <div className="relative flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${a.btn} flex items-center justify-center text-white font-black text-sm`}>
          {ad.advertiser.charAt(0).toUpperCase()}
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${a.chip}`}>{tr.sponsored}</span>
      </div>
      <div className="relative flex-1">
        <div className="text-white font-bold text-sm leading-tight">{ad.headline}</div>
        {ad.body && <div className="text-slate-400 text-xs mt-1.5 leading-relaxed">{ad.body}</div>}
      </div>
      <button className={`relative mt-4 w-full px-3 py-2 rounded-lg text-white text-xs font-bold ${a.btn} transition-colors`}>
        {ad.ctaLabel}
      </button>
    </div>
  );
}
