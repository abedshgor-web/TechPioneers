import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../auth';

const router = Router();

/** الرصيد = مجموع قيود دفتر الأستاذ (append-only، مصدر الحقيقة الوحيد) */
function balanceOf(userId: string): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS bal FROM wallet_ledger WHERE user_id = ?')
    .get(userId) as { bal: number };
  return row.bal;
}

/** GET /api/wallet — الرصيد الحالي بالسنت */
router.get('/', requireAuth, (req: AuthedRequest, res) => {
  res.json({ balance: balanceOf(req.user!.sub) });
});

/**
 * POST /api/wallet/topup — شحن تجريبي (MVP/تطوير فقط).
 * في الإنتاج يُضاف الرصيد فقط عبر Webhook من Stripe بعد تأكيد الدفع
 * (راجع docs/ads-platform/03).
 */
router.post('/topup', requireAuth, (req: AuthedRequest, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'المبلغ يجب أن يكون عدداً صحيحاً موجباً (بالسنت)' });
  }
  db.prepare(
    'INSERT INTO wallet_ledger (id, user_id, type, amount, ref) VALUES (?, ?, ?, ?, ?)'
  ).run(uuid(), req.user!.sub, 'topup', amount, 'dev-topup');

  res.status(201).json({ balance: balanceOf(req.user!.sub) });
});

/** GET /api/wallet/transactions — سجل المعاملات */
router.get('/transactions', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      'SELECT id, type, amount, ref, created_at FROM wallet_ledger WHERE user_id = ? ORDER BY created_at DESC'
    )
    .all(req.user!.sub);
  res.json({ transactions: rows });
});

export default router;
