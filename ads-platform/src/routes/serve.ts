import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { signClick, verifyClick, hashUser } from '../sign';
import { balanceOf, addEntry, maybeAutoRecharge } from '../ledger';

const router = Router();

interface ServableAd {
  ad_id: string;
  campaign_id: string;
  user_id: string;
  headline: string;
  body: string;
  image_url: string | null;
  dest_url: string;
  bid_amount: number;
  budget_total: number;
  targeting: string;
}

function campaignSpend(campaignId: string): number {
  const r = db
    .prepare(`SELECT COALESCE(SUM(cost),0) AS s FROM ad_events WHERE campaign_id = ? AND type = 'click'`)
    .get(campaignId) as { s: number };
  return r.s;
}

/** مطابقة الاستهداف: إن حُدّد بُعد في الحملة يجب أن يطابق سياق الطلب */
function matchesTargeting(targeting: string, ctx: { geo?: string; lang?: string; device?: string }): boolean {
  let t: { geo?: string[]; lang?: string[]; device?: string[] };
  try { t = JSON.parse(targeting || '{}'); } catch { return true; }
  const ok = (list: string[] | undefined, val: string | undefined) =>
    !list || list.length === 0 || (val != null && list.includes(val));
  return ok(t.geo, ctx.geo) && ok(t.lang, ctx.lang) && ok(t.device, ctx.device);
}

/**
 * GET /api/serve — محرك العرض.
 * يختار أعلى إعلان مزايدةً ضمن المؤهلين (حملة نشطة + رصيد كافٍ + ضمن الميزانية + استهداف مطابق)،
 * يسجّل انطباعاً، ويعيد رابط نقر موقّعاً. (راجع docs/ads-platform/06)
 */
router.get('/', (req, res) => {
  const ctx = {
    geo: typeof req.query.geo === 'string' ? req.query.geo : undefined,
    lang: typeof req.query.lang === 'string' ? req.query.lang : undefined,
    device: typeof req.query.device === 'string' ? req.query.device : undefined,
  };

  const candidates = db
    .prepare(
      `SELECT a.id AS ad_id, a.campaign_id, a.headline, a.body, a.image_url, a.dest_url,
              c.user_id, c.bid_amount, c.budget_total, c.targeting
         FROM ads a
         JOIN campaigns c ON c.id = a.campaign_id
        WHERE a.status = 'active' AND a.review_status = 'approved' AND c.status = 'active'
        ORDER BY c.bid_amount DESC`
    )
    .all() as ServableAd[];

  for (const ad of candidates) {
    if (!matchesTargeting(ad.targeting, ctx)) continue;
    if (balanceOf(ad.user_id) < ad.bid_amount) continue;          // رصيد غير كافٍ
    if (campaignSpend(ad.campaign_id) + ad.bid_amount > ad.budget_total) continue; // تجاوز الميزانية

    // سجّل انطباعاً
    const userHash = hashUser(req.ip || 'anon');
    db.prepare(
      `INSERT INTO ad_events (id, ad_id, campaign_id, type, user_hash, geo, device)
       VALUES (?, ?, ?, 'impression', ?, ?, ?)`
    ).run(uuid(), ad.ad_id, ad.campaign_id, userHash, ctx.geo ?? null, ctx.device ?? null);

    const ts = Date.now();
    const sig = signClick(ad.ad_id, ts);
    return res.json({
      ad: {
        id: ad.ad_id,
        headline: ad.headline,
        body: ad.body,
        imageUrl: ad.image_url,
        clickUrl: `/api/serve/click/${ad.ad_id}?ts=${ts}&sig=${sig}`,
      },
    });
  }

  res.status(204).end(); // لا يوجد إعلان مؤهّل
});

/**
 * GET /api/click/:adId — تتبّع النقرة + خصم الإنفاق + إعادة التوجيه.
 * يتحقق من التوقيع، يخصم CPC ذرّياً، يوقف الحملة عند نفاد الرصيد/الميزانية.
 */
router.get('/click/:adId', (req, res) => {
  const adId = req.params.adId;
  const ts = Number(req.query.ts);
  const sig = typeof req.query.sig === 'string' ? req.query.sig : '';

  if (!verifyClick(adId, ts, sig)) {
    return res.status(400).send('رابط نقر غير صالح أو منتهٍ');
  }

  const ad = db
    .prepare(
      `SELECT a.id, a.dest_url, a.campaign_id, c.user_id, c.bid_amount, c.budget_total, c.status
         FROM ads a JOIN campaigns c ON c.id = a.campaign_id
        WHERE a.id = ?`
    )
    .get(adId) as
    | { id: string; dest_url: string; campaign_id: string; user_id: string; bid_amount: number; budget_total: number; status: string }
    | undefined;

  if (!ad) return res.status(404).send('الإعلان غير موجود');

  // خصم ذرّي + إيقاف الحملة عند الحدود (حواجز الأمان — راجع docs/ads-platform/03)
  const tx = db.transaction(() => {
    if (ad.status === 'active' && balanceOf(ad.user_id) >= ad.bid_amount) {
      addEntry(ad.user_id, 'spend', -ad.bid_amount, ad.campaign_id);

      db.prepare(
        `INSERT INTO ad_events (id, ad_id, campaign_id, type, user_hash, cost)
         VALUES (?, ?, ?, 'click', ?, ?)`
      ).run(uuid(), ad.id, ad.campaign_id, hashUser(req.ip || 'anon'), ad.bid_amount);

      // تسهيل: الشحن التلقائي إن كان مفعّلاً ونزل الرصيد دون الحد
      maybeAutoRecharge(ad.user_id);

      // أوقف الحملة إن نفد الرصيد (بعد محاولة الشحن) أو بلغت الميزانية
      const exhausted =
        balanceOf(ad.user_id) < ad.bid_amount ||
        campaignSpend(ad.campaign_id) + ad.bid_amount > ad.budget_total;
      if (exhausted) {
        db.prepare(`UPDATE campaigns SET status = 'paused' WHERE id = ?`).run(ad.campaign_id);
      }
    }
  });
  tx();

  res.redirect(302, ad.dest_url);
});

export default router;
