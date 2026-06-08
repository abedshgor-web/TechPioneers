import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'ads.db');

// تأكد من وجود مجلد قاعدة البيانات
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * تهيئة المخطط. مبسّط لنطاق MVP (راجع docs/ads-platform/06 للمخطط الكامل).
 * مصدر الحقيقة للرصيد هو مجموع قيود wallet_ledger (append-only).
 */
export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'advertiser',
      status        TEXT NOT NULL DEFAULT 'active',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wallet_ledger (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type        TEXT NOT NULL,            -- topup | spend | refund | adjustment
      amount      INTEGER NOT NULL,         -- بالسنت (موجب=إضافة، سالب=خصم)
      ref         TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_user ON wallet_ledger(user_id);

    CREATE TABLE IF NOT EXISTS campaigns (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      objective    TEXT NOT NULL DEFAULT 'clicks',
      status       TEXT NOT NULL DEFAULT 'draft',   -- draft|in_review|active|paused|ended
      budget_daily INTEGER NOT NULL DEFAULT 0,       -- بالسنت
      budget_total INTEGER NOT NULL DEFAULT 0,       -- بالسنت
      bid_amount   INTEGER NOT NULL DEFAULT 0,       -- CPC الأقصى بالسنت
      targeting    TEXT NOT NULL DEFAULT '{}',       -- JSON: geo/lang/device
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);

    CREATE TABLE IF NOT EXISTS ads (
      id          TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      headline    TEXT NOT NULL,
      body        TEXT NOT NULL DEFAULT '',
      image_url   TEXT,
      dest_url    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'active',   -- active | paused
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ads_campaign ON ads(campaign_id);

    CREATE TABLE IF NOT EXISTS ad_events (
      id          TEXT PRIMARY KEY,
      ad_id       TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      type        TEXT NOT NULL,            -- impression | click
      user_hash   TEXT,                     -- تجزئة لا تكشف الهوية
      geo         TEXT,
      device      TEXT,
      cost        INTEGER NOT NULL DEFAULT 0, -- المخصوم بالسنت (للنقرات)
      ts          TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_events_campaign ON ad_events(campaign_id, type);
    CREATE INDEX IF NOT EXISTS idx_events_ad ON ad_events(ad_id, type);

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      auto_recharge INTEGER NOT NULL DEFAULT 0,   -- 0 | 1
      ar_threshold  INTEGER NOT NULL DEFAULT 500,  -- يحفّز الشحن عند النزول دونه (سنت)
      ar_amount     INTEGER NOT NULL DEFAULT 2000  -- مبلغ الشحن التلقائي (سنت)
    );
  `);
}
