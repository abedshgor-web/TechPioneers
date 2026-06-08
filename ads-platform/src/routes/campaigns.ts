import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../auth';

const router = Router();

const VALID_STATUSES = ['draft', 'in_review', 'active', 'paused', 'ended'];

/** GET /api/campaigns — حملات المعلن الحالي */
router.get('/', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user!.sub);
  res.json({ campaigns: rows });
});

/** POST /api/campaigns — إنشاء حملة (تبدأ كمسودة) */
router.post('/', requireAuth, (req: AuthedRequest, res) => {
  const { name, objective, budgetDaily, budgetTotal, bidAmount, targeting } = req.body ?? {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'اسم الحملة مطلوب' });
  }
  const bd = Number(budgetDaily) || 0;
  const bt = Number(budgetTotal) || 0;
  const bid = Number(bidAmount) || 0;
  if (bd < 0 || bt < 0 || bid < 0) {
    return res.status(400).json({ error: 'قيم الميزانية/المزايدة يجب ألا تكون سالبة' });
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO campaigns
       (id, user_id, name, objective, status, budget_daily, budget_total, bid_amount, targeting)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)`
  ).run(
    id,
    req.user!.sub,
    name.trim(),
    objective === 'clicks' ? 'clicks' : 'clicks', // MVP: نقرات فقط
    bd,
    bt,
    bid,
    JSON.stringify(targeting ?? {})
  );

  const created = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  res.status(201).json({ campaign: created });
});

/** PATCH /api/campaigns/:id/status — تغيير الحالة (مع التحقق من الملكية والرصيد) */
router.patch('/:id/status', requireAuth, (req: AuthedRequest, res) => {
  const { status } = req.body ?? {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'حالة غير صالحة' });
  }

  const campaign = db
    .prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user!.sub) as { id: string; budget_total: number } | undefined;
  if (!campaign) {
    return res.status(404).json({ error: 'الحملة غير موجودة' });
  }

  // الإطلاق يتطلب رصيداً كافياً (حاجز أمان — راجع docs/ads-platform/03)
  if (status === 'active') {
    const row = db
      .prepare('SELECT COALESCE(SUM(amount), 0) AS bal FROM wallet_ledger WHERE user_id = ?')
      .get(req.user!.sub) as { bal: number };
    if (row.bal < campaign.budget_total) {
      return res.status(402).json({ error: 'الرصيد غير كافٍ لإطلاق الحملة — يرجى شحن المحفظة' });
    }
  }

  db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run(status, campaign.id);
  res.json({ campaign: db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign.id) });
});

export default router;
