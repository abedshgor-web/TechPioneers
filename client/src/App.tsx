import { useState } from "react";
import { Trader } from "./types";
import Nav from "./components/Nav";
import Dashboard from "./pages/Dashboard";
import TradersPage from "./pages/TradersPage";
import TraderProfilePage from "./pages/TraderProfilePage";
import MyCopiesPage from "./pages/MyCopiesPage";
import SettingsPage from "./pages/SettingsPage";
import MTConnectPage from "./pages/MTConnectPage";
import AuthPage from "./pages/AuthPage";
import { useAuth } from "./contexts/AuthContext";
import { useLang } from "./LanguageContext";

type Page = "dashboard" | "traders" | "my-copies" | "settings" | "mt-connect";

function AppInner() {
  const { isRTL } = useLang();
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedTraderId, setSelectedTraderId] = useState<string | null>(null);

  const handleViewProfile = (trader: Trader) => {
    setSelectedTraderId(trader.id);
  };

  const handleBackFromProfile = () => {
    setSelectedTraderId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex" dir={isRTL ? "rtl" : "ltr"}>
      <Nav page={page} onNavigate={(p) => { setPage(p); setSelectedTraderId(null); }} />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              CT
            </div>
            <span className="text-white font-bold text-sm">CopyTrade Pro</span>
          </div>
        </div>

        <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
          {selectedTraderId ? (
            <TraderProfilePage
              traderId={selectedTraderId}
              onBack={handleBackFromProfile}
            />
          ) : page === "dashboard" ? (
            <Dashboard
              onNavigateToTraders={() => setPage("traders")}
              onNavigateToMyCopies={() => setPage("my-copies")}
            />
          ) : page === "traders" ? (
            <TradersPage onViewProfile={handleViewProfile} />
          ) : page === "my-copies" ? (
            <MyCopiesPage onNavigateToTraders={() => setPage("traders")} />
          ) : page === "mt-connect" ? (
            <MTConnectPage />
          ) : (
            <SettingsPage />
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <AppInner />;
}

export default App;
