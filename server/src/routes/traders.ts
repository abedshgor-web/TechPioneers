import { Router, Request, Response } from "express";
import db from "../db";

const router = Router();

router.get("/", (_req: Request, res: Response): void => {
  const traders = db.prepare("SELECT * FROM traders ORDER BY total_profit_pct DESC").all();
  res.json(traders);
});

router.get("/:id", (req: Request, res: Response): void => {
  const trader = db.prepare("SELECT * FROM traders WHERE id = ?").get(req.params.id);
  if (!trader) {
    res.status(404).json({ error: "Trader not found" });
    return;
  }

  const snapshots = db
    .prepare("SELECT date, equity FROM performance_snapshots WHERE trader_id = ? ORDER BY date ASC")
    .all(req.params.id);

  const recentTrades = db
    .prepare("SELECT * FROM trades WHERE trader_id = ? ORDER BY opened_at DESC LIMIT 20")
    .all(req.params.id);

  res.json({ ...(trader as object), snapshots, recentTrades });
});

export default router;
