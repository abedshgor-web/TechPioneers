import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../auth';

const router = Router();

/** يتحقق أن الحملة مملوكة للمستخدم الحالي */
function ownedCampaign(campaignId: string, userId: string) {
  return db
    .prepare('SELECT id FROM campaigns WHERE id = ? AND user_id = ?')
    .get(campaignId, userId) as { id: string } | undefined;
}

const httpsRe = /^https:\/\/.+/i;

/** GET /api/campaigns/:id/ads — إعلانات حملة */
router.get('/:id/ads', requireAuth, (req: AuthedRequest, res) => {
  if (!ownedCampaign(req.params.id, req.user!.sub)) {
    return res.status(404).json({ error: 'الحملة غير موجودة' });
  }
  const rows = db
    .prepare('SELECT * FROM ads WHERE campaign_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  res.json({ ads: rows });
});

/** POST /api/campaigns/:id/ads — إنشاء إعلان (Creative) */
router.post('/:id/ads', requireAuth, (req: AuthedRequest, res) => {
  if (!ownedCampaign(req.params.id, req.user!.sub)) {
    return res.status(404).json({ error: 'الحملة غير موجودة' });
  }
  const { headline, body, imageUrl, destUrl } = req.body ?? {};
  if (typeof headline !== 'string' || headline.trim().length === 0) {
    return res.status(400).json({ error: 'عنوان الإعلان مطلوب' });
  }
  if (!httpsRe.test(destUrl ?? '')) {
    return res.status(400).json({ error: 'رابط الوجهة يجب أن يبدأ بـ https://' });
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO ads (id, campaign_id, headline, body, image_url, dest_url)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, req.params.id, headline.trim(), String(body ?? ''), imageUrl ?? null, destUrl);

  res.status(201).json({ ad: db.prepare('SELECT * FROM ads WHERE id = ?').get(id) });
});

export default router;
