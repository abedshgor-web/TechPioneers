import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface PricingPageProps {
  onBack: () => void;
}

const PricingPage = ({ onBack }: PricingPageProps) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to create checkout session");
      }

      const data = (await res.json()) as { url: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const isPro = user?.plan === "pro";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur border-b border-slate-700/60 px-6 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-base font-bold text-white tracking-tight">
            TaskFlow <span className="text-indigo-400">AI</span>
          </h1>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to App
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Choose Your Plan</h2>
          <p className="text-slate-400 text-lg">
            {isPro
              ? "You're on the Pro plan. Enjoy all premium features!"
              : "Upgrade to unlock unlimited tasks and AI assistant."}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 max-w-md w-full">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Pricing cards */}
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
          {/* Free Plan */}
          <div className={`flex-1 rounded-2xl border p-7 ${
            !isPro
              ? "border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/30"
              : "border-slate-700 bg-slate-900"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Free Plan</h3>
              {!isPro && (
                <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-full">
                  Current Plan
                </span>
              )}
            </div>
            <div className="mb-5">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-slate-400 text-sm ml-1">/month</span>
            </div>
            <ul className="space-y-3 mb-7">
              <PlanFeature included text="Up to 5 tasks" />
              <PlanFeature included={false} text="AI assistant" />
              <PlanFeature included text="Basic kanban board" />
              <PlanFeature included={false} text="Priority support" />
            </ul>
            <div className="h-10 flex items-center justify-center text-sm text-slate-500 font-medium">
              {!isPro ? "Your current plan" : "Downgraded plan"}
            </div>
          </div>

          {/* Pro Plan */}
          <div className={`flex-1 rounded-2xl border p-7 relative ${
            isPro
              ? "border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/30"
              : "border-slate-700 bg-slate-900 hover:border-slate-600 transition-colors"
          }`}>
            {/* Popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg">
                RECOMMENDED
              </span>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Pro Plan</h3>
              {isPro && (
                <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-full">
                  Current Plan
                </span>
              )}
            </div>
            <div className="mb-5">
              <span className="text-4xl font-bold text-white">$9</span>
              <span className="text-slate-400 text-sm ml-1">/month</span>
            </div>
            <ul className="space-y-3 mb-7">
              <PlanFeature included text="Unlimited tasks" />
              <PlanFeature included text="AI assistant (Claude AI)" />
              <PlanFeature included text="Full kanban board" />
              <PlanFeature included text="Priority support" />
            </ul>

            {isPro ? (
              <div className="h-10 flex items-center justify-center text-sm text-indigo-400 font-medium">
                You're on Pro
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  "Upgrade to Pro"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Note */}
        <p className="text-slate-600 text-xs mt-8 text-center max-w-md">
          Secure payment powered by Stripe. Cancel anytime from your billing portal.
        </p>
      </div>
    </div>
  );
};

const PlanFeature = ({ included, text }: { included: boolean; text: string }) => (
  <li className="flex items-center gap-2.5 text-sm">
    {included ? (
      <svg className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg className="w-4.5 h-4.5 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )}
    <span className={included ? "text-slate-300" : "text-slate-500"}>{text}</span>
  </li>
);

export default PricingPage;
