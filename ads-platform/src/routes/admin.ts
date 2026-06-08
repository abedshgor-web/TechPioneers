import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { requireAuth, requireRole, AuthedRequest } from '../auth';

const router = Router();

// كل مسارات الإدارة تتطلب دور admin
router.use(requireAuth, requireRole('admin'));

function audit(actorId: string, action: string, target: string, meta?: unknown): void {
  db.prepare(
    'INSERT INTO audit_logs (id, actor_id, action, target, meta) VALUES (?, ?, ?, ?, ?)'
  ).run(uuid(), actorId, action, target, meta ? JSON.stringify(meta) : null);
}

/** GET /api/admin/overview — مؤشرات المنصة */
router.get('/overview', (_req, res) => {
  const advertisers = (db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'advertiser'`).get() as { n: number }).n;
  const activeCampaigns = (db.prepare(`SELECT COUNT(*) AS n FROM campaigns WHERE status = 'active'`).get() as { n: number }).n;
  const pendingAds = (db.prepare(`SELECT COUNT(*) AS n FROM ads WHERE review_status = 'pending'`).get() as { n: number }).n;
  const totalSpend = (db.prepare(`SELECT COALESCE(SUM(cost),0) AS s FROM ad_events WHERE type = 'click'`).get() as { s: number }).s;
  const totalTopups = (db.prepare(`SELECT COALESCE(SUM(amount),0) AS s FROM wallet_ledger WHERE type IN ('topup','auto_topup')`).get() as { s: number }).s;
  const blockedClicks = (db.prepare(`SELECT COUNT(*) AS n FROM fraud_events`).get() as { n: number }).n;
  res.json({ advertisers, activeCampaigns, pendingAds, totalSpend, totalTopups, blockedClicks });
});

/** GET /api/admin/fraud — أحدث النقرات المرفوضة (مكافحة الاحتيال) */
router.get('/fraud', (_req, res) => {
  const rows = db
    .prepare(`SELECT reason, COUNT(*) AS count FROM fraud_events GROUP BY reason ORDER BY count DESC`)
    .all();
  res.json({ byReason: rows });
});

/** GET /api/admin/ads/review — طابور مراجعة الإعلانات */
router.get('/ads/review', (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
  const rows = db
    .prepare(
      `SELECT a.id, a.headline, a.body, a.dest_url, a.image_url, a.review_status, a.review_reason,
              c.name AS campaign_name, u.email AS advertiser
         FROM ads a
         JOIN campaigns c ON c.id = a.campaign_id
         JOIN users u ON u.id = c.user_id
        WHERE a.review_status = ?
        ORDER BY a.created_at ASC`
    )
    .all(status);
  res.json({ ads: rows });
});

/** POST /api/admin/ads/:id/decision — اعتماد/رفض إعلان */
router.post('/ads/:id/decision', (req: AuthedRequest, res) => {
  const { decision, reason } = req.body ?? {};
  if (decision !== 'approved' && decision !== 'rejected') {
    return res.status(400).json({ error: 'القرار يجب أن يكون approved أو rejected' });
  }
  if (decision === 'rejected' && (typeof reason !== 'string' || reason.trim().length === 0)) {
    return res.status(400).json({ error: 'سبب الرفض مطلوب' });
  }

  const ad = db.prepare('SELECT id FROM ads WHERE id = ?').get(req.params.id) as { id: string } | undefined;
  if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود' });

  db.prepare('UPDATE ads SET review_status = ?, review_reason = ? WHERE id = ?')
    .run(decision, decision === 'rejected' ? reason.trim() : null, req.params.id);
  audit(req.user!.sub, 'ad_' + decision, req.params.id, { reason: reason ?? null });

  res.json({ ad: db.prepare('SELECT id, review_status, review_reason FROM ads WHERE id = ?').get(req.params.id) });
});

/** GET /api/admin/users — قائمة المستخدمين مع الرصيد */
router.get('/users', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status, u.created_at,
              (SELECT COALESCE(SUM(amount),0) FROM wallet_ledger w WHERE w.user_id = u.id) AS balance
         FROM users u
        ORDER BY u.created_at DESC`
    )
    .all();
  res.json({ users: rows });
});

/** PATCH /api/admin/users/:id — تعليق/تفعيل حساب (التعليق يوقف حملاته) */
router.patch('/users/:id', (req: AuthedRequest, res) => {
  const { status } = req.body ?? {};
  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ error: 'الحالة يجب أن تكون active أو suspended' });
  }
  if (req.params.id === req.user!.sub) {
    return res.status(400).json({ error: 'لا يمكنك تعليق حسابك' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id) as { id: string } | undefined;
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  db.transaction(() => {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
    if (status === 'suspended') {
      db.prepare(`UPDATE campaigns SET status = 'paused' WHERE user_id = ? AND status = 'active'`)
        .run(req.params.id);
    }
    audit(req.user!.sub, 'user_' + status, req.params.id);
  })();

  res.json({ user: db.prepare('SELECT id, email, status FROM users WHERE id = ?').get(req.params.id) });
});

export default router;
