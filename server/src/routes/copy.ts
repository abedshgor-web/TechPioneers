import { Router, Response } from "express";
import db from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/subscriptions", (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const subs = db
    .prepare(`
      SELECT cs.*, t.name AS trader_name, t.avatar, t.country_flag, t.strategy,
        t.monthly_profit_pct, t.win_rate, t.total_profit_pct, t.risk_level
      FROM copy_subscriptions cs
      JOIN traders t ON cs.trader_id = t.id
      WHERE cs.user_id = ?
      ORDER BY cs.started_at DESC
    `)
    .all(userId);
  res.json(subs);
});

router.post("/subscribe", (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const { trader_id, lot_multiplier = 0.01, risk_pct = 2.0 } = req.body as {
    trader_id?: string;
    lot_multiplier?: number;
    risk_pct?: number;
  };

  if (!trader_id) {
    res.status(400).json({ error: "trader_id required" });
    return;
  }

  const trader = db.prepare("SELECT id FROM traders WHERE id = ?").get(trader_id);
  if (!trader) {
    res.status(404).json({ error: "Trader not found" });
    return;
  }

  const existing = db
    .prepare("SELECT id FROM copy_subscriptions WHERE user_id = ? AND trader_id = ? AND status = 'active'")
    .get(userId, trader_id);

  if (existing) {
    res.status(409).json({ error: "Already copying this trader" });
    return;
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO copy_subscriptions (id, user_id, trader_id, lot_multiplier, risk_pct, status, started_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?)
  `).run(id, userId, trader_id, lot_multiplier, risk_pct, new Date().toISOString());

  db.prepare("UPDATE traders SET followers = followers + 1 WHERE id = ?").run(trader_id);

  const sub = db
    .prepare(`
      SELECT cs.*, t.name AS trader_name, t.avatar, t.country_flag, t.strategy,
        t.monthly_profit_pct, t.win_rate, t.total_profit_pct, t.risk_level
      FROM copy_subscriptions cs
      JOIN traders t ON cs.trader_id = t.id
      WHERE cs.id = ?
    `)
    .get(id);

  res.status(201).json(sub);
});

router.delete("/:id", (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const sub = db
    .prepare("SELECT * FROM copy_subscriptions WHERE id = ? AND user_id = ?")
    .get(req.params.id, userId) as { trader_id: string } | undefined;

  if (!sub) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }

  db.prepare("UPDATE copy_subscriptions SET status = 'stopped' WHERE id = ?").run(req.params.id);
  db.prepare("UPDATE traders SET followers = MAX(0, followers - 1) WHERE id = ?").run(sub.trader_id);

  res.json({ message: "Stopped copying trader" });
});

router.get("/portfolio", (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const user = db.prepare("SELECT balance FROM users WHERE id = ?").get(userId) as { balance: number } | undefined;
  const balance = user?.balance ?? 10000;

  const activeCount = (
    db.prepare("SELECT COUNT(*) as c FROM copy_subscriptions WHERE user_id = ? AND status = 'active'").get(userId) as { c: number }
  ).c;

  // Deterministic P&L based on userId hash for demo consistency
  const hash = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pnl = ((hash % 300) - 50) + (activeCount * 12.5);
  const rounded = Math.round(pnl * 100) / 100;

  res.json({
    balance,
    equity: Math.round((balance + rounded) * 100) / 100,
    pnl: rounded,
    pnl_pct: Math.round((rounded / balance) * 10000) / 100,
    active_copies: activeCount,
    open_trades: activeCount * 2,
  });
});

export default router;
