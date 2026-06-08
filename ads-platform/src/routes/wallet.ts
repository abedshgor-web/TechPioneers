import { Router } from 'express';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../auth';
import { balanceOf, addEntry, getSettings } from '../ledger';
import { stripeEnabled, createTopupSession } from '../payments';

const router = Router();

const ALLOW_DEV_TOPUP = process.env.ALLOW_DEV_TOPUP === '1';

/** GET /api/wallet — الرصيد الحالي + إعدادات الشحن التلقائي */
router.get('/', requireAuth, (req: AuthedRequest, res) => {
  res.json({ balance: balanceOf(req.user!.sub), settings: getSettings(req.user!.sub) });
});

/**
 * POST /api/wallet/topup — بدء شحن الرصيد.
 * مع Stripe: يعيد رابط صفحة دفع مستضافة؛ الرصيد يُضاف فعلياً عبر الـ Webhook
 * بعد تأكيد الدفع (لا نعتمد على رد المتصفح). راجع docs/ads-platform/03.
 * بلا Stripe: شحن تجريبي مباشر فقط إن فُعّل ALLOW_DEV_TOPUP=1 (تطوير).
 */
router.post('/topup', requireAuth, async (req: AuthedRequest, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'المبلغ يجب أن يكون عدداً صحيحاً موجباً (بالسنت)' });
  }

  if (stripeEnabled) {
    try {
      const url = await createTopupSession(req.user!.sub, amount);
      return res.status(201).json({ checkoutUrl: url });
    } catch {
      return res.status(502).json({ error: 'تعذّر بدء عملية الدفع، حاول لاحقاً' });
    }
  }

  if (ALLOW_DEV_TOPUP) {
    addEntry(req.user!.sub, 'topup', amount, 'dev-topup-' + Date.now());
    return res.status(201).json({ balance: balanceOf(req.user!.sub), dev: true });
  }

  return res.status(503).json({ error: 'مزوّد الدفع غير مُهيّأ' });
});

/** PUT /api/wallet/settings — تفعيل/ضبط الشحن التلقائي (تسهيل للمعلن) */
router.put('/settings', requireAuth, (req: AuthedRequest, res) => {
  const enabled = req.body?.autoRecharge ? 1 : 0;
  const threshold = Number(req.body?.threshold);
  const amount = Number(req.body?.amount);

  if (enabled) {
    if (!Number.isInteger(threshold) || threshold < 0) {
      return res.status(400).json({ error: 'حد التحفيز يجب أن يكون عدداً صحيحاً غير سالب (بالسنت)' });
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: 'مبلغ الشحن التلقائي يجب أن يكون عدداً صحيحاً موجباً (بالسنت)' });
    }
  }

  const s = getSettings(req.user!.sub);
  db.prepare(
    `INSERT INTO user_settings (user_id, auto_recharge, ar_threshold, ar_amount)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       auto_recharge = excluded.auto_recharge,
       ar_threshold  = excluded.ar_threshold,
       ar_amount     = excluded.ar_amount`
  ).run(
    req.user!.sub,
    enabled,
    enabled ? threshold : s.ar_threshold,
    enabled ? amount : s.ar_amount
  );

  res.json({ settings: getSettings(req.user!.sub) });
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
