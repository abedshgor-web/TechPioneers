import { PerformanceSnapshot } from "../types";

interface MonthEntry {
  key: string;
  label: string;
  pct: number;
}

function computeMonthly(snapshots: PerformanceSnapshot[]): MonthEntry[] {
  const byMonth: Record<string, number[]> = {};
  for (const s of snapshots) {
    const m = s.date.slice(0, 7);
    (byMonth[m] ??= []).push(s.equity);
  }
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => {
      const pct = ((vals[vals.length - 1] - vals[0]) / vals[0]) * 100;
      const mIdx = parseInt(key.slice(5, 7)) - 1;
      return { key, label: MONTH_NAMES[mIdx], pct: Math.round(pct * 10) / 10 };
    });
}

function cellColor(pct: number): string {
  if (pct >= 10)  return "bg-emerald-500/30 text-emerald-300 border-emerald-500/30";
  if (pct >= 5)   return "bg-emerald-500/20 text-emerald-400 border-emerald-500/20";
  if (pct > 0)    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/10";
  if (pct > -5)   return "bg-red-500/10 text-red-400 border-red-500/10";
  return            "bg-red-500/20 text-red-300 border-red-500/20";
}

interface Props {
  snapshots: PerformanceSnapshot[];
  label?: string;
}

export default function MonthlyReturnsGrid({ snapshots, label = "Monthly Returns" }: Props) {
  const months = computeMonthly(snapshots);
  if (months.length === 0) return null;

  const totalPct = months.reduce((acc, m) => acc + m.pct, 0);
  const positive = months.filter((m) => m.pct > 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">{label}</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="text-emerald-400 font-medium">{positive}/{months.length} pos</span>
          <span className={totalPct >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
            {totalPct >= 0 ? "+" : ""}{totalPct.toFixed(1)}% total
          </span>
        </div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {months.map((m) => (
          <div
            key={m.key}
            className={`rounded-lg border px-2 py-2 text-center ${cellColor(m.pct)}`}
            title={`${m.label} ${m.key.slice(0, 4)}: ${m.pct >= 0 ? "+" : ""}${m.pct}%`}
          >
            <div className="text-[10px] opacity-70 mb-0.5">{m.label}</div>
            <div className="text-xs font-bold">{m.pct >= 0 ? "+" : ""}{m.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
