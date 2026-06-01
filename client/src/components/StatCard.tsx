interface Props {
  label: string;
  value: string;
  sub?: string;
  color?: "default" | "green" | "red" | "blue";
  icon?: string;
}

const colors = {
  default: "text-white",
  green: "text-emerald-400",
  red: "text-red-400",
  blue: "text-blue-400",
};

export default function StatCard({ label, value, sub, color = "default", icon }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      {sub && <div className="text-slate-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}
