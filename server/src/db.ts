import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "tradecopy.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    stripe_customer_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    balance REAL NOT NULL DEFAULT 10000.0,
    created_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS traders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    country TEXT NOT NULL,
    country_flag TEXT NOT NULL,
    strategy TEXT NOT NULL,
    description TEXT NOT NULL,
    followers INTEGER NOT NULL DEFAULT 0,
    total_profit_pct REAL NOT NULL DEFAULT 0,
    monthly_profit_pct REAL NOT NULL DEFAULT 0,
    win_rate REAL NOT NULL DEFAULT 0,
    max_drawdown REAL NOT NULL DEFAULT 0,
    avg_trade_duration TEXT NOT NULL DEFAULT '4h',
    total_trades INTEGER NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'medium',
    verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    trader_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL,
    open_price REAL NOT NULL,
    close_price REAL,
    lot_size REAL NOT NULL,
    profit_pips REAL,
    profit_pct REAL,
    status TEXT NOT NULL DEFAULT 'closed',
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    FOREIGN KEY (trader_id) REFERENCES traders(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS copy_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    trader_id TEXT NOT NULL,
    lot_multiplier REAL NOT NULL DEFAULT 0.01,
    risk_pct REAL NOT NULL DEFAULT 2.0,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TEXT NOT NULL,
    UNIQUE(user_id, trader_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trader_id) REFERENCES traders(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS performance_snapshots (
    id TEXT PRIMARY KEY,
    trader_id TEXT NOT NULL,
    date TEXT NOT NULL,
    equity REAL NOT NULL,
    FOREIGN KEY (trader_id) REFERENCES traders(id) ON DELETE CASCADE
  )
`);

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function seedData() {
  const count = (db.prepare("SELECT COUNT(*) as c FROM traders").get() as { c: number }).c;
  if (count > 0) return;

  const traderDefs = [
    {
      id: "trader_001",
      name: "Ahmed Al-Rashidi",
      avatar: "A",
      country: "UAE",
      country_flag: "🇦🇪",
      strategy: "Swing Trading",
      description: "Experienced forex trader with 8+ years in currency markets. Specializes in major pairs using technical analysis and price action setups.",
      followers: 2847,
      total_profit_pct: 187.4,
      monthly_profit_pct: 12.3,
      win_rate: 73.2,
      max_drawdown: 8.5,
      avg_trade_duration: "2-3 days",
      total_trades: 342,
      risk_level: "medium",
      verified: 1,
      seed: 42,
    },
    {
      id: "trader_002",
      name: "Sophia Chen",
      avatar: "S",
      country: "Singapore",
      country_flag: "🇸🇬",
      strategy: "Scalping",
      description: "Professional scalper focused on XAUUSD and EURUSD. Lightning-fast execution with strict risk management and consistent daily targets.",
      followers: 5123,
      total_profit_pct: 312.8,
      monthly_profit_pct: 18.7,
      win_rate: 68.5,
      max_drawdown: 12.3,
      avg_trade_duration: "15-45 min",
      total_trades: 1256,
      risk_level: "high",
      verified: 1,
      seed: 77,
    },
    {
      id: "trader_003",
      name: "Marcus Weber",
      avatar: "M",
      country: "Germany",
      country_flag: "🇩🇪",
      strategy: "Trend Following",
      description: "Algorithmic trend follower using proprietary indicators. Systematic approach to identify and ride long-term market momentum.",
      followers: 3941,
      total_profit_pct: 145.2,
      monthly_profit_pct: 8.9,
      win_rate: 61.8,
      max_drawdown: 15.2,
      avg_trade_duration: "1-2 weeks",
      total_trades: 187,
      risk_level: "medium",
      verified: 1,
      seed: 13,
    },
    {
      id: "trader_004",
      name: "Yuki Tanaka",
      avatar: "Y",
      country: "Japan",
      country_flag: "🇯🇵",
      strategy: "News Trading",
      description: "Expert in trading major economic events: NFP, CPI, and central bank decisions. High-probability setups with tight stop-losses.",
      followers: 1872,
      total_profit_pct: 98.6,
      monthly_profit_pct: 6.4,
      win_rate: 71.4,
      max_drawdown: 7.1,
      avg_trade_duration: "30 min - 2h",
      total_trades: 423,
      risk_level: "low",
      verified: 1,
      seed: 55,
    },
    {
      id: "trader_005",
      name: "Isabella Rossi",
      avatar: "I",
      country: "Italy",
      country_flag: "🇮🇹",
      strategy: "Position Trading",
      description: "Macro-driven position trader analyzing global economic trends. Builds long-term positions in commodities, indices, and major currencies.",
      followers: 2231,
      total_profit_pct: 224.5,
      monthly_profit_pct: 14.8,
      win_rate: 65.3,
      max_drawdown: 18.7,
      avg_trade_duration: "2-4 weeks",
      total_trades: 134,
      risk_level: "medium",
      verified: 1,
      seed: 91,
    },
    {
      id: "trader_006",
      name: "Omar Hassan",
      avatar: "O",
      country: "Egypt",
      country_flag: "🇪🇬",
      strategy: "Grid Trading",
      description: "Systematic grid trader with 5+ years of consistent returns. Automated grid strategies on ranging markets with low drawdown.",
      followers: 987,
      total_profit_pct: 76.3,
      monthly_profit_pct: 5.1,
      win_rate: 82.1,
      max_drawdown: 9.8,
      avg_trade_duration: "6-24h",
      total_trades: 891,
      risk_level: "low",
      verified: 0,
      seed: 33,
    },
    {
      id: "trader_007",
      name: "Elena Kovacs",
      avatar: "E",
      country: "Hungary",
      country_flag: "🇭🇺",
      strategy: "Price Action",
      description: "Pure price action trader focused on key support and resistance. No indicators — just clean chart reading with disciplined risk management.",
      followers: 4567,
      total_profit_pct: 267.9,
      monthly_profit_pct: 16.2,
      win_rate: 69.7,
      max_drawdown: 11.4,
      avg_trade_duration: "4-8h",
      total_trades: 567,
      risk_level: "medium",
      verified: 1,
      seed: 68,
    },
    {
      id: "trader_008",
      name: "James Williams",
      avatar: "J",
      country: "UK",
      country_flag: "🇬🇧",
      strategy: "Breakout Trading",
      description: "London session specialist targeting breakout patterns in GBP pairs. Consistent performer during high-volume market open hours.",
      followers: 3102,
      total_profit_pct: 156.7,
      monthly_profit_pct: 10.4,
      win_rate: 66.2,
      max_drawdown: 13.6,
      avg_trade_duration: "2-6h",
      total_trades: 298,
      risk_level: "medium",
      verified: 1,
      seed: 29,
    },
  ];

  const insertTrader = db.prepare(`
    INSERT INTO traders (id, name, avatar, country, country_flag, strategy, description,
      followers, total_profit_pct, monthly_profit_pct, win_rate, max_drawdown,
      avg_trade_duration, total_trades, risk_level, verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSnapshot = db.prepare(`
    INSERT OR IGNORE INTO performance_snapshots (id, trader_id, date, equity)
    VALUES (?, ?, ?, ?)
  `);

  const insertTrade = db.prepare(`
    INSERT INTO trades (id, trader_id, symbol, direction, open_price, close_price,
      lot_size, profit_pips, profit_pct, status, opened_at, closed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'closed', ?, ?)
  `);

  const symbols = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "GBPJPY", "AUDUSD", "USDCHF", "BTCUSD"];
  const basePrices: Record<string, number> = {
    EURUSD: 1.0850, GBPUSD: 1.2650, USDJPY: 149.50, XAUUSD: 2350.0,
    GBPJPY: 189.20, AUDUSD: 0.6520, USDCHF: 0.8980, BTCUSD: 67000,
  };
  const pipValues: Record<string, number> = {
    EURUSD: 0.0001, GBPUSD: 0.0001, USDJPY: 0.01, XAUUSD: 0.1,
    GBPJPY: 0.01, AUDUSD: 0.0001, USDCHF: 0.0001, BTCUSD: 10,
  };

  for (const t of traderDefs) {
    const rand = rng(t.seed);

    insertTrader.run(
      t.id, t.name, t.avatar, t.country, t.country_flag, t.strategy, t.description,
      t.followers, t.total_profit_pct, t.monthly_profit_pct, t.win_rate, t.max_drawdown,
      t.avg_trade_duration, t.total_trades, t.risk_level, t.verified,
      new Date(Date.now() - 400 * 86400000).toISOString()
    );

    // 90-day equity curve
    let equity = 10000;
    const volatility = t.risk_level === "high" ? 0.022 : t.risk_level === "low" ? 0.007 : 0.013;
    const dailyDrift = t.monthly_profit_pct / 100 / 30;

    for (let i = 89; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0];
      const noise = (rand() - 0.47) * volatility;
      equity = equity * (1 + dailyDrift + noise);
      insertSnapshot.run(`snap_${t.id}_${90 - i}`, t.id, dateStr, Math.round(equity * 100) / 100);
    }

    // 40 trades
    for (let i = 0; i < 40; i++) {
      const symbol = symbols[Math.floor(rand() * symbols.length)];
      const direction = rand() > 0.5 ? "buy" : "sell";
      const isWin = rand() * 100 < t.win_rate;
      const base = basePrices[symbol];
      const pip = pipValues[symbol];
      const priceNoise = (rand() - 0.5) * base * 0.005;
      const openPrice = base + priceNoise;
      const pips = isWin ? rand() * 45 + 8 : -(rand() * 28 + 5);
      const closePrice = direction === "buy"
        ? openPrice + pips * pip
        : openPrice - pips * pip;
      const daysAgo = Math.floor(rand() * 87) + 1;
      const openedAt = new Date(Date.now() - (daysAgo + 1) * 86400000).toISOString();
      const closedAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

      insertTrade.run(
        `trade_${t.id}_${i}`, t.id, symbol, direction,
        Math.round(openPrice * 10000) / 10000,
        Math.round(closePrice * 10000) / 10000,
        0.1,
        Math.round(pips * 10) / 10,
        Math.round((pips / 100) * 100) / 100,
        openedAt, closedAt
      );
    }
  }
}

seedData();

export default db;
