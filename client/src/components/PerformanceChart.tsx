import { PerformanceSnapshot } from "../types";

interface Props {
  data: PerformanceSnapshot[];
  height?: number;
  showGrid?: boolean;
}

export default function PerformanceChart({ data, height = 120, showGrid = false }: Props) {
  if (!data || data.length < 2) {
    return (
      <div
        className="flex items-center justify-center bg-slate-800 rounded-lg text-slate-500 text-sm"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const W = 400;
  const H = height;
  const padL = showGrid ? 48 : 4;
  const padR = 4;
  const padT = 4;
  const padB = showGrid ? 24 : 4;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const equities = data.map((d) => d.equity);
  const minE = Math.min(...equities);
  const maxE = Math.max(...equities);
  const range = maxE - minE || 1;

  const toX = (i: number) => padL + (i / (data.length - 1)) * innerW;
  const toY = (v: number) => padT + (1 - (v - minE) / range) * innerH;

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.equity) }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(H - padB).toFixed(1)} L${pts[0].x.toFixed(1)},${(H - padB).toFixed(1)} Z`;

  const isPositive = equities[equities.length - 1] >= equities[0];
  const color = isPositive ? "#10b981" : "#ef4444";
  const gradId = `grad_${Math.random().toString(36).slice(2, 7)}`;

  const formatY = (v: number) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {showGrid && (
        <>
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = padT + frac * innerH;
            const val = maxE - frac * range;
            return (
              <g key={frac}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#334155" strokeWidth="0.5" />
                <text x={padL - 4} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10">
                  {formatY(val)}
                </text>
              </g>
            );
          })}
          {[0, 0.5, 1].map((frac) => {
            const i = Math.floor(frac * (data.length - 1));
            const x = toX(i);
            const label = data[i]?.date?.slice(5) ?? "";
            return (
              <text key={frac} x={x} y={H - 4} textAnchor="middle" fill="#64748b" fontSize="10">
                {label}
              </text>
            );
          })}
        </>
      )}

      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />

      {/* Last point dot */}
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
    </svg>
  );
}
