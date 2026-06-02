import { useEffect, useState } from "react";
import { MTConnection } from "../types";
import { useAuth } from "../contexts/AuthContext";

const SERVER_URL = window.location.origin;

const MQL4_CODE = (token: string, serverUrl: string) => `//+------------------------------------------------------------------+
//|                                      CopyTradePro_EA.mq4          |
//|                         CopyTrade Pro - Auto Copy EA              |
//+------------------------------------------------------------------+
#property strict

extern string EA_Token    = "${token}";
extern string Server_URL  = "${serverUrl}";
extern string EA_Mode     = "copier";   // "copier" or "provider"
extern double Lot_Multiplier = 1.0;
extern int    Poll_Seconds   = 3;

int    lastTicket = 0;
datetime lastPoll = 0;

//+------------------------------------------------------------------+
int OnInit() {
   Print("CopyTradePro EA started | Mode: ", EA_Mode);
   SendPing();
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnTick() {
   if (TimeCurrent() - lastPoll < Poll_Seconds) return;
   lastPoll = TimeCurrent();

   if (EA_Mode == "copier") {
      PollAndCopy();
   } else if (EA_Mode == "provider") {
      CheckAndSendSignals();
   }
}

//+------------------------------------------------------------------+
void SendPing() {
   string headers = "Content-Type: application/json\\r\\nX-EA-Token: " + EA_Token;
   string result;
   int res = WebRequest("POST", Server_URL + "/api/mt/ea/ping", headers, 5000, "{}", result, headers);
   Print("Ping: ", result);
}

//+------------------------------------------------------------------+
void PollAndCopy() {
   string headers = "X-EA-Token: " + EA_Token;
   string result, resHeaders;
   int res = WebRequest("GET", Server_URL + "/api/mt/ea/pending", headers, 5000, "", result, resHeaders);
   if (res != 200 || StringLen(result) < 5) return;

   // Parse JSON array (simplified — use a JSON lib for production)
   // For each pending signal, open a trade
   Print("Pending signals: ", result);
}

//+------------------------------------------------------------------+
void CheckAndSendSignals() {
   int total = OrdersTotal();
   for (int i = 0; i < total; i++) {
      if (!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if (OrderTicket() == lastTicket) continue;
      lastTicket = OrderTicket();

      string body = StringFormat(
         "{\\"symbol\\":\\"%s\\",\\"direction\\":\\"%s\\",\\"open_price\\":%.5f,\\"lot_size\\":%.2f,\\"ticket\\":%d}",
         OrderSymbol(),
         OrderType() == OP_BUY ? "buy" : "sell",
         OrderOpenPrice(),
         OrderLots(),
         OrderTicket()
      );

      string headers = "Content-Type: application/json\\r\\nX-EA-Token: " + EA_Token;
      string result, resHeaders;
      WebRequest("POST", Server_URL + "/api/mt/ea/signal", headers, 5000, body, result, resHeaders);
      Print("Signal sent: ", result);
   }
}`;

export default function MTConnectPage() {
  const { token } = useAuth();
  const [conn, setConn] = useState<MTConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showEA, setShowEA] = useState(false);

  const [mode, setMode] = useState<"copier" | "provider">("copier");
  const [mtVersion, setMtVersion] = useState<"MT4" | "MT5">("MT4");
  const [accountNumber, setAccountNumber] = useState("");
  const [broker, setBroker] = useState("");

  const authH: HeadersInit = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch("/api/mt/connection", { headers: authH })
      .then(r => r.json())
      .then(data => {
        if (data) {
          setConn(data);
          setMode(data.mode);
          setMtVersion(data.mt_version);
          setAccountNumber(data.account_number ?? "");
          setBroker(data.broker ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/mt/connect", {
        method: "POST", headers: authH,
        body: JSON.stringify({ mode, mt_version: mtVersion, account_number: accountNumber, broker }),
      });
      const data = await res.json();
      setConn(data);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch("/api/mt/connection", { method: "DELETE", headers: authH });
    setConn(null);
  };

  const handleRegenToken = async () => {
    const res = await fetch("/api/mt/regenerate-token", { method: "POST", headers: authH });
    const data = await res.json() as { ea_token: string };
    setConn(prev => prev ? { ...prev, ea_token: data.ea_token } : prev);
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const isConnected = conn?.status === "connected";
  const lastPingAgo = conn?.last_ping
    ? Math.floor((Date.now() - new Date(conn.last_ping).getTime()) / 1000)
    : null;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-2xl">
        <div className="h-6 bg-surface-overlay rounded w-48" />
        <div className="card h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-black text-white">MetaTrader Connection</h1>
          <p className="text-slate-500 text-xs">ربط حساب MT4/MT5 بمنصة النسخ</p>
        </div>
      </div>

      {/* Status banner */}
      {conn && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${isConnected ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <div className="flex-1">
            <div className={`text-sm font-bold ${isConnected ? "text-emerald-400" : "text-amber-400"}`}>
              {isConnected ? "EA متصل ويعمل" : "في انتظار اتصال الـ EA"}
            </div>
            {lastPingAgo !== null && (
              <div className="text-slate-500 text-xs">
                آخر اتصال: {lastPingAgo < 60 ? `${lastPingAgo}ث` : `${Math.floor(lastPingAgo / 60)}د`} مضت
              </div>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${conn.mode === "provider" ? "bg-blue-500/20 text-blue-400" : "bg-violet-500/20 text-violet-400"}`}>
            {conn.mode === "provider" ? "مزود إشارات" : "ناسخ"}
          </span>
        </div>
      )}

      {/* Configuration card */}
      <div className="card p-5 space-y-4">
        <h2 className="text-white font-bold text-sm">إعداد الاتصال</h2>

        {/* Mode */}
        <div>
          <label className="text-slate-500 text-xs mb-2 block">دور الحساب</label>
          <div className="grid grid-cols-2 gap-2">
            {(["copier", "provider"] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`p-3 rounded-xl border text-sm font-medium transition-all text-start ${mode === m ? "bg-brand-600 border-brand-600 text-white" : "bg-surface border-border text-slate-400 hover:border-border-strong"}`}
              >
                <div className="font-bold">{m === "copier" ? "ناسخ" : "مزود إشارات"}</div>
                <div className="text-[11px] mt-0.5 opacity-70">
                  {m === "copier" ? "ينسخ صفقات المتداولين" : "يرسل صفقاتك للناسخين"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* MT Version */}
        <div>
          <label className="text-slate-500 text-xs mb-2 block">إصدار MetaTrader</label>
          <div className="grid grid-cols-2 gap-2">
            {(["MT4", "MT5"] as const).map(v => (
              <button
                key={v}
                onClick={() => setMtVersion(v)}
                className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${mtVersion === v ? "bg-brand-600 border-brand-600 text-white" : "bg-surface border-border text-slate-400 hover:border-border-strong"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Account details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-500 text-xs mb-1.5 block">رقم الحساب</label>
            <input
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              placeholder="123456"
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-600 placeholder-slate-600"
            />
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1.5 block">اسم البروكر</label>
            <input
              value={broker}
              onChange={e => setBroker(e.target.value)}
              placeholder="ICMarkets, XM..."
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-600 placeholder-slate-600"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm transition-all disabled:opacity-50"
        >
          {saving ? "جاري الحفظ..." : conn ? "تحديث الإعدادات" : "إنشاء اتصال"}
        </button>
      </div>

      {/* EA Token card */}
      {conn && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-sm">رمز الـ EA (Token)</h2>
            <button
              onClick={handleRegenToken}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              إعادة إنشاء
            </button>
          </div>
          <div className="flex items-center gap-2 bg-[#080c14] rounded-xl px-4 py-3 border border-border font-mono text-sm">
            <span className="flex-1 text-brand-400 select-all">{conn.ea_token}</span>
            <button
              onClick={() => copyText(conn.ea_token, "token")}
              className="text-slate-500 hover:text-white transition-colors shrink-0"
            >
              {copied === "token" ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-slate-600 text-xs">هذا الرمز سري — لا تشاركه. يُستخدم للتحقق من هوية الـ EA.</p>
        </div>
      )}

      {/* EA Code card */}
      {conn && (
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowEA(!showEA)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-overlay/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div className="text-start">
                <div className="text-white font-bold text-sm">كود MQL4 للـ EA</div>
                <div className="text-slate-500 text-xs">انسخ هذا الكود وضعه في MetaEditor</div>
              </div>
            </div>
            <svg className={`w-4 h-4 text-slate-500 transition-transform ${showEA ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showEA && (
            <div className="border-t border-border">
              <div className="flex items-center justify-between px-5 py-3 bg-[#080c14]">
                <span className="text-slate-500 text-xs font-mono">CopyTradePro_EA.mq4</span>
                <button
                  onClick={() => copyText(MQL4_CODE(conn.ea_token, SERVER_URL), "ea")}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {copied === "ea" ? (
                    <><svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg><span className="text-emerald-400">تم النسخ!</span></>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg><span>نسخ الكود</span></>
                  )}
                </button>
              </div>
              <pre className="text-xs text-slate-400 p-4 overflow-x-auto max-h-72 font-mono leading-relaxed bg-[#050810] scrollbar-thin">
                {MQL4_CODE(conn.ea_token, SERVER_URL)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Steps guide */}
      {conn && (
        <div className="card p-5">
          <h2 className="text-white font-bold text-sm mb-4">كيفية الربط — خطوة بخطوة</h2>
          <div className="space-y-3">
            {[
              { n: 1, title: "افتح MetaEditor", desc: "داخل MetaTrader → Tools → MetaQuotes Language Editor" },
              { n: 2, title: "أنشئ ملف EA جديد", desc: "File → New → Expert Advisor → اختر اسماً" },
              { n: 3, title: "الصق الكود", desc: "احذف المحتوى الافتراضي والصق كود CopyTradePro أعلاه" },
              { n: 4, title: "اضبط العنوان المسموح", desc: `Tools → Options → Expert Advisors → أضف:\n${SERVER_URL}` },
              { n: 5, title: "Compile وشغّل على الشارت", desc: "F7 للترجمة، ثم اسحب الـ EA على أي شارت واضغط OK" },
              { n: 6, title: "راقب الاتصال هنا", desc: "ستتحول النقطة للأخضر خلال ثوانٍ عند الاتصال" },
            ].map(s => (
              <div key={s.n} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-600/20 border border-brand-600/30 text-brand-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</div>
                <div>
                  <div className="text-white text-sm font-medium">{s.title}</div>
                  <div className="text-slate-500 text-xs mt-0.5 whitespace-pre-line">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disconnect */}
      {conn && (
        <button
          onClick={handleDisconnect}
          className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-sm font-bold"
        >
          قطع الاتصال وحذف الإعدادات
        </button>
      )}
    </div>
  );
}
