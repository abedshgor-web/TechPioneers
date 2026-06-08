import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initSchema } from './db';
import { seedAdmin } from './seed';
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import campaignRoutes from './routes/campaigns';
import adRoutes from './routes/ads';
import serveRoutes from './routes/serve';
import reportRoutes from './routes/reports';
import templateRoutes from './routes/templates';
import adminRoutes from './routes/admin';
import { handleWebhook } from './payments';

initSchema();
seedAdmin();

const app = express();
app.use(cors());

// Webhook الدفع يحتاج الجسم الخام للتحقق من التوقيع — يُسجَّل قبل express.json
app.post('/api/webhooks/stripe', express.raw({ type: '*/*' }), (req, res) => {
  try {
    const result = handleWebhook(req.body as Buffer, req.header('stripe-signature'));
    res.json({ received: true, ...result });
  } catch {
    res.status(400).json({ error: 'توقيع غير صالح' });
  }
});

app.use(express.json());

// واجهة برمجة التطبيقات
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/campaigns', adRoutes);   // /api/campaigns/:id/ads
app.use('/api/serve', serveRoutes);    // /api/serve + /api/serve/click/:adId
app.use('/api/reports', reportRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/admin', adminRoutes);

// تقديم الواجهة الثابتة (صفحة الهبوط + لوحة المعلن)
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Ads platform MVP listening on http://localhost:${PORT}`);
});
