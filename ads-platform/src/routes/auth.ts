import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { signToken } from '../auth';

const router = Router();

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** تسجيل معلِن جديد */
router.post('/register', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!emailRe.test(email ?? '')) {
    return res.status(400).json({ error: 'بريد إلكتروني غير صالح' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'كلمة المرور يجب ألا تقل عن 8 أحرف' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'البريد مسجّل مسبقاً' });
  }

  const id = uuid();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(id, email, hash, 'advertiser');

  const token = signToken({ sub: id, role: 'advertiser', email });
  res.status(201).json({ token, user: { id, email, role: 'advertiser' } });
});

/** تسجيل الدخول */
router.post('/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const user = db
    .prepare('SELECT id, email, password_hash, role, status FROM users WHERE email = ?')
    .get(email) as
    | { id: string; email: string; password_hash: string; role: string; status: string }
    | undefined;

  if (!user || !bcrypt.compareSync(password ?? '', user.password_hash)) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ error: 'الحساب موقوف' });
  }

  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

export default router;
