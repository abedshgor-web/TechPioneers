import { useRef, useState } from "react";
import { PerformanceSnapshot } from "../types";

interface Props {
  data: PerformanceSnapshot[];
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
}

export default function PerformanceChart({ data, height = 120, showGrid = false, showTooltip = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; val: number; date: string } | null>(null);

  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center bg-[#080c14] rounded-lg text-slate-700 text-xs" style={{ height }}>
        No data
      </div>
    );
  }

  const W = 400;
  const H = height;
  const padL = showGrid ? 50 : 2;
  const padR = 4;
  const padT = 6;
  const padB = showGrid ? 26 : 2;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const equities = data.map((d) => d.equity);
  const minE = Math.min(...equities);
  const maxE = Math.max(...equities);
  const range = maxE - minE || 1;

  const toX = (i: number) => padL + (i / (data.length - 1)) * innerW;
  const toY = (v: number) => padT + (1 - (v - minE) / range) * innerH;

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.equity), equity: d.equity, date: d.date }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(H - padB).toFixed(1)} L${pts[0].x.toFixed(1)},${(H - padB).toFixed(1)} Z`;

  const isPositive = equities[equities.length - 1] >= equities[0];
  const color = isPositive ? "#10b981" : "#ef4444";
  const gradId = `g${data.length}${height}`;

  const formatY = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

  const pctChange = ((equities[equities.length - 1] - equities[0]) / equities[0]) * 100;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!showTooltip || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.min(
      data.length - 1,
      Math.max(0, Math.round(((mouseX - padL) / innerW) * (data.length - 1)))
    );
    const p = pts[idx];
    setTooltip({ x: p.x, y: p.y, val: p.equity, date: p.date });
  };

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Change badge */}
      <div className={`absolute top-1 end-1 text-[10px] font-bold px-1.5 py-0.5 rounded z-10 ${isPositive ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>
        {isPositive ? "+" : ""}{pctChange.toFixed(1)}%
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="70%" stopColor={color} stopOpacity="0.04" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {showGrid && (
          <>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const y = padT + f * innerH;
              const v = maxE - f * range;
              return (
                <g key={f}>
                  <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#1a2235" strokeWidth="0.5" />
                  <text x={padL - 4} y={y + 3.5} textAnchor="end" fill="#475569" fontSize="9">{formatY(v)}</text>
                </g>
              );
            })}
            {[0, 0.5, 1].map((f) => {
              const i = Math.floor(f * (data.length - 1));
              return (
                <text key={f} x={toX(i)} y={H - 4} textAnchor="middle" fill="#475569" fontSize="9">
                  {data[i]?.date?.slice(5) ?? ""}
                </text>
              );
            })}
          </>
        )}

        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />

        {/* Tooltip crosshair */}
        {tooltip && showTooltip && (
          <>
            <line x1={tooltip.x} y1={padT} x2={tooltip.x} y2={H - padB} stroke={color} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.6" />
            <circle cx={tooltip.x} cy={tooltip.y} r="3.5" fill={color} opacity="0.9" />
          </>
        )}

        {/* Last point */}
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={color} />
      </svg>

      {/* Tooltip box */}
      {tooltip && showTooltip && (
        <div
          className="absolute top-2 pointer-events-none z-20 bg-surface-overlay border border-border rounded-lg px-2.5 py-1.5 text-xs shadow-xl"
          style={{ left: `clamp(10px, ${(tooltip.x / W) * 100}%, calc(100% - 80px))`, transform: "translateX(-50%)" }}
        >
          <div className="text-slate-400">{tooltip.date}</div>
          <div className={`font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            ${tooltip.val.toLocaleString("en", { maximumFractionDigits: 0 })}
          </div>
        </div>
      )}
    </div>
  );
}
