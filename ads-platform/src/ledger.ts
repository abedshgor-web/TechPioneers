import { v4 as uuid } from 'uuid';
import { db } from './db';

/** الرصيد = مجموع قيود دفتر الأستاذ (append-only، مصدر الحقيقة الوحيد) */
export function balanceOf(userId: string): number {
  const r = db
    .prepare('SELECT COALESCE(SUM(amount),0) AS bal FROM wallet_ledger WHERE user_id = ?')
    .get(userId) as { bal: number };
  return r.bal;
}

/** إضافة قيد للرصيد (amount بالسنت؛ موجب=إضافة، سالب=خصم) */
export function addEntry(userId: string, type: string, amount: number, ref?: string): void {
  db.prepare(
    'INSERT INTO wallet_ledger (id, user_id, type, amount, ref) VALUES (?, ?, ?, ?, ?)'
  ).run(uuid(), userId, type, amount, ref ?? null);
}

/** الرصيد الترحيبي الممنوح عند التسجيل (بالسنت) */
export const WELCOME_BONUS_CENTS = 1000; // 10.00

export interface WalletSettings {
  auto_recharge: number;   // 0 | 1
  ar_threshold: number;    // الحد الذي يحفّز الشحن (بالسنت)
  ar_amount: number;       // مبلغ الشحن التلقائي (بالسنت)
}

export function getSettings(userId: string): WalletSettings {
  const row = db
    .prepare('SELECT auto_recharge, ar_threshold, ar_amount FROM user_settings WHERE user_id = ?')
    .get(userId) as WalletSettings | undefined;
  return row ?? { auto_recharge: 0, ar_threshold: 500, ar_amount: 2000 };
}

/**
 * الشحن التلقائي: إن كان مفعّلاً والرصيد دون الحد، يضيف شحنة تلقائية.
 * في الإنتاج يخصم من وسيلة الدفع المحفوظة عبر Stripe؛ هنا يُحاكى كقيد رصيد.
 * يعيد true إن حدثت شحنة.
 */
export function maybeAutoRecharge(userId: string): boolean {
  const s = getSettings(userId);
  if (!s.auto_recharge) return false;
  if (balanceOf(userId) >= s.ar_threshold) return false;
  addEntry(userId, 'auto_topup', s.ar_amount, 'auto-recharge');
  return true;
}
