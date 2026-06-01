import { useState } from "react";

interface UpgradeBannerProps {
  taskCount: number;
  onUpgrade: () => void;
}

const UpgradeBanner = ({ taskCount, onUpgrade }: UpgradeBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border-b border-indigo-500/30 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 bg-indigo-500/20 border border-indigo-500/40 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p className="text-sm text-slate-300 truncate">
          <span className="text-white font-semibold">
            You're using {taskCount}/5 free tasks.
          </span>{" "}
          <span className="hidden sm:inline">Upgrade to Pro for unlimited tasks and AI assistant.</span>
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onUpgrade}
          className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all shadow-md shadow-indigo-500/20"
        >
          Upgrade
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-700/50"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default UpgradeBanner;
