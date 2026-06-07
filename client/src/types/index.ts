export interface User {
  id: string;
  email: string;
  name: string;
  plan: "free" | "pro";
  role: "user" | "advertiser" | "admin";
}

export interface ServedAd {
  creativeId: string;
  campaignId: string;
  format: "native" | "banner";
  headline: string;
  body: string | null;
  ctaLabel: string;
  imageUrl: string | null;
  landingUrl: string;
  accent: "blue" | "emerald" | "violet" | "amber";
  advertiser: string;
  impressionToken: string;
  clickToken: string;
}

export interface AdCreative {
  id: string;
  campaign_id: string;
  format: "native" | "banner";
  headline: string;
  body: string | null;
  cta_label: string;
  image_url: string | null;
  landing_url: string;
  locale: string;
  accent: string;
}

export interface AdCampaign {
  id: string;
  advertiser_id: string;
  name: string;
  objective: string;
  pricing_model: "cpc" | "cpm";
  bid_amount: number;
  daily_budget: number;
  total_budget: number;
  spent: number;
  placement: string;
  status: "draft" | "pending_review" | "active" | "paused" | "completed" | "rejected";
  review_notes: string | null;
  created_at: string;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  creative?: AdCreative;
}

export interface Advertiser {
  id: string;
  user_id: string;
  company_name: string;
  website: string | null;
  status: string;
  wallet_balance: number;
  is_house: number;
  created_at: string;
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

export interface MTConnection {
  id: string;
  user_id: string;
  ea_token: string;
  mode: "provider" | "copier";
  account_number: string | null;
  broker: string | null;
  mt_version: "MT4" | "MT5";
  status: "pending" | "connected" | "disconnected";
  last_ping: string | null;
  created_at: string;
}

export interface Portfolio {
  balance: number;
  equity: number;
  pnl: number;
  pnl_pct: number;
  active_copies: number;
  open_trades: number;
}
