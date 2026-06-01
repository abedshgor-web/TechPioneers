export interface User {
  id: string;
  email: string;
  name: string;
  plan: "free" | "pro";
}

export interface Trader {
  id: string;
  name: string;
  avatar: string;
  country: string;
  country_flag: string;
  strategy: string;
  description: string;
  followers: number;
  total_profit_pct: number;
  monthly_profit_pct: number;
  win_rate: number;
  max_drawdown: number;
  avg_trade_duration: string;
  total_trades: number;
  risk_level: "low" | "medium" | "high";
  verified: number;
  created_at: string;
  snapshots?: PerformanceSnapshot[];
  recentTrades?: Trade[];
}

export interface PerformanceSnapshot {
  date: string;
  equity: number;
}

export interface Trade {
  id: string;
  trader_id: string;
  symbol: string;
  direction: "buy" | "sell";
  open_price: number;
  close_price: number;
  lot_size: number;
  profit_pips: number;
  profit_pct: number;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string;
}

export interface CopySubscription {
  id: string;
  user_id: string;
  trader_id: string;
  trader_name: string;
  avatar: string;
  country_flag: string;
  strategy: string;
  monthly_profit_pct: number;
  win_rate: number;
  total_profit_pct: number;
  risk_level: string;
  lot_multiplier: number;
  risk_pct: number;
  status: "active" | "stopped";
  started_at: string;
}

export interface Portfolio {
  balance: number;
  equity: number;
  pnl: number;
  pnl_pct: number;
  active_copies: number;
  open_trades: number;
}
