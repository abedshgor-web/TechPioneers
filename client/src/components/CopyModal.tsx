import { useState } from "react";
import { Trader } from "../types";
import { useLang } from "../LanguageContext";

interface Props {
  trader: Trader;
  onConfirm: (lotMultiplier: number, riskPct: number) => Promise<void>;
  onClose: () => void;
}

const INVEST_AMOUNTS = [1000, 5000, 10000, 25000];

export default function CopyModal({ trader, onConfirm, onClose }: Props) {
  const { tr } = useLang();
  const [lotMultiplier, setLotMultiplier] = useState(0.01);
  const [riskPct, setRiskPct] = useState(2.0);
  const [investAmount, setInvestAmount] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const est1m = (investAmount * trader.monthly_profit_pct) / 100;
  const est3m = investAmount * (Math.pow(1 + trader.monthly_profit_pct / 100, 3) - 1);
  const est12m = investAmount * (Math.pow(1 + trader.monthly_profit_pct / 100, 12) - 1);

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      await onConfirm(lotMultiplier, riskPct);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-[#0f1520] border border-[#1a2235] rounded-2xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2235]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white font-black text-sm">
              {trader.avatar}
            </div>
            <div>
              <div className="text-white font-bold text-sm">{trader.name}</div>
              <div className="text-slate-500 text-xs">{trader.strategy}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-overlay">
            ×
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh] scrollbar-thin">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: `+${trader.total_profit_pct.toFixed(1)}%`, lbl: tr.totalProfit, cls: "text-emerald-400" },
              { val: `${trader.win_rate.toFixed(1)}%`,          lbl: tr.winRate,     cls: "text-white" },
              { val: `-${trader.max_drawdown.toFixed(1)}%`,     lbl: tr.maxDrawdown, cls: "text-red-400" },
            ].map((s) => (
              <div key={s.lbl} className="bg-[#080c14] rounded-xl p-3 text-center border border-[#1a2235]">
                <div className={`text-base font-black ${s.cls}`}>{s.val}</div>
                <div className="text-slate-600 text-[10px] mt-0.5">{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* ROI Calculator */}
          <div className="bg-[#080c14] border border-[#1a2235] rounded-xl p-4">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">ROI Estimator</div>
            <div className="flex gap-1.5 mb-4">
              {INVEST_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setInvestAmount(amt)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    investAmount === amt
                      ? "bg-brand-600 text-white"
                      : "bg-surface-overlay text-slate-500 hover:text-slate-300"
                  }`}
                >
                  ${amt >= 1000 ? `${amt/1000}k` : amt}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { period: "1 Month",  val: est1m },
                { period: "3 Months", val: est3m },
                { period: "1 Year",   val: est12m },
              ].map((e) => (
                <div key={e.period} className="text-center">
                  <div className={`text-sm font-black ${e.val >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {e.val >= 0 ? "+" : ""}${Math.abs(e.val).toFixed(0)}
                  </div>
                  <div className="text-slate-600 text-[10px] mt-0.5">{e.period}</div>
                </div>
              ))}
            </div>
            <p className="text-slate-700 text-[10px] mt-3 text-center">Based on {trader.monthly_profit_pct.toFixed(1)}%/mo avg • Compound</p>
          </div>

          {/* Copy settings */}
          <div className="space-y-4">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{tr.copySettings}</div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-slate-300 text-sm">{tr.lotMultiplier}</label>
                <span className="text-white text-sm font-mono font-bold">{lotMultiplier.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0.01" max="1" step="0.01" value={lotMultiplier}
                onChange={(e) => setLotMultiplier(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-[#1a2235] accent-brand-500 cursor-pointer"
              />
              <div className="flex justify-between text-slate-700 text-[10px] mt-1">
                <span>0.01</span><span>1.00</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-slate-300 text-sm">{tr.riskPerTrade}</label>
                <span className={`text-sm font-mono font-bold ${riskPct > 5 ? "text-red-400" : riskPct > 3 ? "text-amber-400" : "text-emerald-400"}`}>
                  {riskPct.toFixed(1)}%
                </span>
              </div>
              <input
                type="range" min="0.5" max="10" step="0.5" value={riskPct}
                onChange={(e) => setRiskPct(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-[#1a2235] accent-brand-500 cursor-pointer"
              />
              <div className="flex justify-between text-slate-700 text-[10px] mt-1">
                <span>0.5%</span>
                <span className={riskPct > 5 ? "text-red-500" : "text-slate-700"}>
                  {riskPct > 5 ? "⚠ High risk" : "10%"}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <p className="text-slate-700 text-[10px] text-center">{tr.copyDisclaimer}</p>
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 px-5 py-4 border-t border-[#1a2235]">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border-strong text-slate-400 hover:text-white hover:bg-surface-overlay text-sm font-medium transition-all"
          >
            {tr.cancel}
          </button>
          <button
            onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-600/20 hover:shadow-brand-500/30"
          >
            {loading ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : tr.startCopyingBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
