import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initSchema } from './db';
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import campaignRoutes from './routes/campaigns';

initSchema();

const app = express();
app.use(cors());
app.use(express.json());

// واجهة برمجة التطبيقات
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/campaigns', campaignRoutes);

// تقديم الواجهة الثابتة (صفحة الهبوط + لوحة المعلن)
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Ads platform MVP listening on http://localhost:${PORT}`);
});
