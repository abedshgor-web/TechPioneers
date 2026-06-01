import { useState } from "react";
import { Trader } from "../types";
import { useLang } from "../LanguageContext";

interface Props {
  trader: Trader;
  onConfirm: (lotMultiplier: number, riskPct: number) => Promise<void>;
  onClose: () => void;
}

export default function CopyModal({ trader, onConfirm, onClose }: Props) {
  const { tr } = useLang();
  const [lotMultiplier, setLotMultiplier] = useState(0.01);
  const [riskPct, setRiskPct] = useState(2.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
            {trader.avatar}
          </div>
          <div>
            <div className="text-white font-semibold">{trader.name}</div>
            <div className="text-slate-400 text-sm">{trader.strategy}</div>
          </div>
        </div>

        <h3 className="text-white font-semibold text-lg mb-4">{tr.copySettings}</h3>

        {/* Stats preview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-emerald-400 font-bold">+{trader.total_profit_pct.toFixed(1)}%</div>
            <div className="text-slate-500 text-xs mt-0.5">{tr.totalProfit}</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-white font-bold">{trader.win_rate.toFixed(1)}%</div>
            <div className="text-slate-500 text-xs mt-0.5">{tr.winRate}</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-red-400 font-bold">-{trader.max_drawdown.toFixed(1)}%</div>
            <div className="text-slate-500 text-xs mt-0.5">{tr.maxDrawdown}</div>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-slate-300 text-sm block mb-1.5">{tr.lotMultiplier}</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={lotMultiplier}
                onChange={(e) => setLotMultiplier(parseFloat(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-white font-mono w-12 text-right">{lotMultiplier.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="text-slate-300 text-sm block mb-1.5">{tr.riskPerTrade}</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={riskPct}
                onChange={(e) => setRiskPct(parseFloat(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-white font-mono w-12 text-right">{riskPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <p className="text-slate-500 text-xs mb-4">{tr.copyDisclaimer}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            {tr.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "..." : tr.startCopyingBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
