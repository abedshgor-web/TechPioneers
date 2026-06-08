import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db } from './db';

/**
 * يهيّئ حساب مدير من متغيرات البيئة إن لم يكن موجوداً.
 * عيّن ADMIN_EMAIL و ADMIN_PASSWORD لتفعيله.
 */
export function seedAdmin(): void {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email) as
    | { id: string; role: string }
    | undefined;
  if (existing) return;

  db.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(uuid(), email, bcrypt.hashSync(password, 10), 'admin');
  // eslint-disable-next-line no-console
  console.log(`Seeded admin account: ${email}`);
}
