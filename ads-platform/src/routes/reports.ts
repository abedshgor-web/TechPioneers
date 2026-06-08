import { Router } from 'express';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../auth';

const router = Router();

/**
 * GET /api/reports — ملخص الأداء لكل حملة (انطباعات، نقرات، CTR، إنفاق، CPC الفعلي).
 * يقرأ من ad_events ويُقيّد بحملات المستخدم الحالي (راجع docs/ads-platform/04).
 */
router.get('/', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT c.id AS campaign_id, c.name, c.status,
              COALESCE(SUM(CASE WHEN e.type = 'impression' THEN 1 ELSE 0 END), 0) AS impressions,
              COALESCE(SUM(CASE WHEN e.type = 'click' THEN 1 ELSE 0 END), 0) AS clicks,
              COALESCE(SUM(e.cost), 0) AS spend
         FROM campaigns c
         LEFT JOIN ad_events e ON e.campaign_id = c.id
        WHERE c.user_id = ?
        GROUP BY c.id
        ORDER BY c.created_at DESC`
    )
    .all(req.user!.sub) as Array<{
      campaign_id: string; name: string; status: string;
      impressions: number; clicks: number; spend: number;
    }>;

  const report = rows.map((r) => ({
    ...r,
    ctr: r.impressions > 0 ? +((r.clicks / r.impressions) * 100).toFixed(2) : 0,
    cpc: r.clicks > 0 ? Math.round(r.spend / r.clicks) : 0, // CPC الفعلي بالسنت
  }));

  const totals = report.reduce(
    (acc, r) => {
      acc.impressions += r.impressions;
      acc.clicks += r.clicks;
      acc.spend += r.spend;
      return acc;
    },
    { impressions: 0, clicks: 0, spend: 0 }
  );

  res.json({ report, totals });
});

export default router;
