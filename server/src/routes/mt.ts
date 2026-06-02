import { Router, Request, Response } from "express";
const uuid = () => crypto.randomUUID();
import db from "../db";
import { requireAuth as authMiddleware } from "../middleware/auth";

const router = Router();

// ── Helper: generate short EA token ──────────────────────────────────
function genToken(): string {
  return "CT-" + Math.random().toString(36).slice(2, 10).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ── GET /api/mt/connection  (logged-in user) ──────────────────────────
router.get("/connection", authMiddleware, (req: Request, res: Response) => {
  const conn = db.prepare("SELECT * FROM mt_connections WHERE user_id = ?").get((req as any).user.id);
  res.json(conn ?? null);
});

// ── POST /api/mt/connect  — create or refresh connection ──────────────
router.post("/connect", authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { mode, mt_version, account_number, broker } = req.body as {
    mode?: string; mt_version?: string; account_number?: string; broker?: string;
  };

  const existing = db.prepare("SELECT * FROM mt_connections WHERE user_id = ?").get(userId) as any;

  if (existing) {
    db.prepare(`
      UPDATE mt_connections SET mode=?, mt_version=?, account_number=?, broker=? WHERE user_id=?
    `).run(mode ?? existing.mode, mt_version ?? existing.mt_version,
           account_number ?? existing.account_number, broker ?? existing.broker, userId);
    return res.json(db.prepare("SELECT * FROM mt_connections WHERE user_id = ?").get(userId));
  }

  const conn = {
    id: uuid(),
    user_id: userId,
    ea_token: genToken(),
    mode: mode ?? "copier",
    account_number: account_number ?? null,
    broker: broker ?? null,
    mt_version: mt_version ?? "MT4",
    status: "pending",
    last_ping: null,
    created_at: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO mt_connections (id,user_id,ea_token,mode,account_number,broker,mt_version,status,last_ping,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(conn.id, conn.user_id, conn.ea_token, conn.mode, conn.account_number,
         conn.broker, conn.mt_version, conn.status, conn.last_ping, conn.created_at);

  res.json(conn);
});

// ── DELETE /api/mt/connection ─────────────────────────────────────────
router.delete("/connection", authMiddleware, (req: Request, res: Response) => {
  db.prepare("DELETE FROM mt_connections WHERE user_id = ?").run((req as any).user.id);
  res.json({ ok: true });
});

// ── POST /api/mt/regenerate-token ────────────────────────────────────
router.post("/regenerate-token", authMiddleware, (req: Request, res: Response) => {
  const newToken = genToken();
  db.prepare("UPDATE mt_connections SET ea_token = ? WHERE user_id = ?")
    .run(newToken, (req as any).user.id);
  res.json({ ea_token: newToken });
});

// ════════════════════════════════════════════════════════════════════
//  EA-facing endpoints (auth by ea_token header, no JWT)
// ════════════════════════════════════════════════════════════════════

function getConnByToken(token: string) {
  return db.prepare("SELECT * FROM mt_connections WHERE ea_token = ?").get(token) as any;
}

// ── POST /api/mt/ea/ping  — EA heartbeat ─────────────────────────────
router.post("/ea/ping", (req: Request, res: Response) => {
  const token = req.headers["x-ea-token"] as string;
  if (!token) return res.status(401).json({ error: "Missing token" });
  const conn = getConnByToken(token);
  if (!conn) return res.status(403).json({ error: "Invalid token" });

  db.prepare("UPDATE mt_connections SET status='connected', last_ping=? WHERE ea_token=?")
    .run(new Date().toISOString(), token);
  res.json({ ok: true, mode: conn.mode, server_time: new Date().toISOString() });
});

// ── POST /api/mt/ea/signal  — EA sends a new trade (provider) ────────
router.post("/ea/signal", (req: Request, res: Response) => {
  const token = req.headers["x-ea-token"] as string;
  if (!token) return res.status(401).json({ error: "Missing token" });
  const conn = getConnByToken(token);
  if (!conn || conn.mode !== "provider") return res.status(403).json({ error: "Provider only" });

  const { symbol, direction, open_price, lot_size, sl, tp, ticket } = req.body;
  if (!symbol || !direction || !open_price) return res.status(400).json({ error: "Missing fields" });

  const signal: any = {
    id: uuid(),
    provider_user_id: conn.user_id,
    symbol, direction,
    open_price: parseFloat(open_price),
    lot_size: parseFloat(lot_size) || 0.1,
    sl: sl ? parseFloat(sl) : null,
    tp: tp ? parseFloat(tp) : null,
    ticket: ticket ? parseInt(ticket) : null,
    status: "open",
    closed_price: null,
    profit: null,
    opened_at: new Date().toISOString(),
    closed_at: null,
  };

  db.prepare(`
    INSERT INTO mt_signals (id,provider_user_id,symbol,direction,open_price,lot_size,sl,tp,ticket,status,closed_price,profit,opened_at,closed_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(signal.id, signal.provider_user_id, signal.symbol, signal.direction,
         signal.open_price, signal.lot_size, signal.sl, signal.tp, signal.ticket,
         signal.status, signal.closed_price, signal.profit, signal.opened_at, signal.closed_at);

  // Create pending copy executions for all subscribers
  const subs = db.prepare(`
    SELECT cs.user_id, cs.lot_multiplier FROM copy_subscriptions cs
    JOIN users u ON u.id = cs.user_id
    JOIN traders t ON t.id = cs.trader_id
    JOIN mt_connections mc ON mc.user_id = cs.user_id
    WHERE cs.user_id IN (
      SELECT user_id FROM mt_connections WHERE mode='copier' AND status='connected'
    )
  `).all() as any[];

  for (const sub of subs) {
    db.prepare(`
      INSERT INTO mt_copy_executions (id,signal_id,copier_user_id,lot_size,status)
      VALUES (?,?,?,?,'pending')
    `).run(uuid(), signal.id, sub.user_id, Math.max(0.01, signal.lot_size * (sub.lot_multiplier || 1)));
  }

  res.json({ ok: true, signal_id: signal.id, copies_queued: subs.length });
});

// ── POST /api/mt/ea/signal/:id/close  — EA closes a trade ────────────
router.post("/ea/signal/:id/close", (req: Request, res: Response) => {
  const token = req.headers["x-ea-token"] as string;
  if (!token) return res.status(401).json({ error: "Missing token" });
  const conn = getConnByToken(token);
  if (!conn || conn.mode !== "provider") return res.status(403).json({ error: "Provider only" });

  const { closed_price, profit } = req.body;
  db.prepare(`
    UPDATE mt_signals SET status='closed', closed_price=?, profit=?, closed_at=? WHERE id=? AND provider_user_id=?
  `).run(closed_price ? parseFloat(closed_price) : null,
         profit ? parseFloat(profit) : null,
         new Date().toISOString(), req.params.id, conn.user_id);

  // Mark all pending copy executions as close_pending
  db.prepare(`UPDATE mt_copy_executions SET status='close_pending' WHERE signal_id=? AND status='executed'`)
    .run(req.params.id);

  res.json({ ok: true });
});

// ── GET /api/mt/ea/pending  — Copier EA polls for new signals ────────
router.get("/ea/pending", (req: Request, res: Response) => {
  const token = req.headers["x-ea-token"] as string;
  if (!token) return res.status(401).json({ error: "Missing token" });
  const conn = getConnByToken(token);
  if (!conn || conn.mode !== "copier") return res.status(403).json({ error: "Copier only" });

  // Update ping
  db.prepare("UPDATE mt_connections SET last_ping=? WHERE ea_token=?")
    .run(new Date().toISOString(), token);

  const pending = db.prepare(`
    SELECT e.id as exec_id, e.lot_size, e.status as exec_status,
           s.id as signal_id, s.symbol, s.direction, s.open_price, s.sl, s.tp, s.status as signal_status
    FROM mt_copy_executions e
    JOIN mt_signals s ON s.id = e.signal_id
    WHERE e.copier_user_id = ? AND e.status IN ('pending','close_pending')
  `).all(conn.user_id) as any[];

  res.json(pending);
});

// ── POST /api/mt/ea/executed  — Copier EA confirms execution ─────────
router.post("/ea/executed", (req: Request, res: Response) => {
  const token = req.headers["x-ea-token"] as string;
  if (!token) return res.status(401).json({ error: "Missing token" });
  const conn = getConnByToken(token);
  if (!conn || conn.mode !== "copier") return res.status(403).json({ error: "Copier only" });

  const { exec_id, ticket } = req.body;
  db.prepare(`
    UPDATE mt_copy_executions SET status='executed', ticket=?, executed_at=? WHERE id=? AND copier_user_id=?
  `).run(ticket ? parseInt(ticket) : null, new Date().toISOString(), exec_id, conn.user_id);

  res.json({ ok: true });
});

// ── GET /api/mt/signals  (logged-in user, see their signals) ─────────
router.get("/signals", authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const signals = db.prepare(
    "SELECT * FROM mt_signals WHERE provider_user_id = ? ORDER BY opened_at DESC LIMIT 50"
  ).all(userId);
  res.json(signals);
});

// ── GET /api/mt/executions  (copier sees their executed copies) ───────
router.get("/executions", authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const execs = db.prepare(`
    SELECT e.*, s.symbol, s.direction, s.open_price, s.status as signal_status
    FROM mt_copy_executions e
    JOIN mt_signals s ON s.id = e.signal_id
    WHERE e.copier_user_id = ?
    ORDER BY e.executed_at DESC LIMIT 50
  `).all(userId);
  res.json(execs);
});

export default router;
