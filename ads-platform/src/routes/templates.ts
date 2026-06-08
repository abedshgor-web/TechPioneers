import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../auth';

const router = Router();

/** قوالب حملات جاهزة (تسهيل: إنشاء بنقرة واحدة). المبالغ بالسنت. */
export const TEMPLATES = [
  {
    key: 'awareness',
    name: 'حملة وعي بالعلامة',
    objective: 'clicks',
    budgetTotal: 5000,   // 50.00
    bidAmount: 30,       // 0.30
    targeting: { lang: ['ar'] },
  },
  {
    key: 'local',
    name: 'حملة محلية (السعودية)',
    objective: 'clicks',
    budgetTotal: 3000,   // 30.00
    bidAmount: 50,       // 0.50
    targeting: { geo: ['SA'], lang: ['ar'] },
  },
  {
    key: 'mobile',
    name: 'حملة تطبيقات الجوّال',
    objective: 'clicks',
    budgetTotal: 8000,   // 80.00
    bidAmount: 45,       // 0.45
    targeting: { device: ['mobile'] },
  },
] as const;

/** GET /api/templates — كتالوج القوالب */
router.get('/', (_req, res) => {
  res.json({ templates: TEMPLATES });
});

/** POST /api/templates/:key/use — إنشاء حملة من قالب بنقرة واحدة */
router.post('/:key/use', requireAuth, (req: AuthedRequest, res) => {
  const tpl = TEMPLATES.find((t) => t.key === req.params.key);
  if (!tpl) return res.status(404).json({ error: 'القالب غير موجود' });

  const id = uuid();
  db.prepare(
    `INSERT INTO campaigns
       (id, user_id, name, objective, status, budget_total, bid_amount, targeting)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)`
  ).run(
    id,
    req.user!.sub,
    tpl.name,
    tpl.objective,
    tpl.budgetTotal,
    tpl.bidAmount,
    JSON.stringify(tpl.targeting)
  );

  res.status(201).json({ campaign: db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) });
});

export default router;
