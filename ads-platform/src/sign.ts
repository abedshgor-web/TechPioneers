import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'change-me-in-production';

/**
 * توقيع رابط النقر لمنع الأحداث المزيّفة (راجع docs/ads-platform/04).
 * التوقيع يربط الإعلان + الوقت + nonce فريد، وله صلاحية محدودة.
 * الـ nonce يجعل كل رابط نقر أحادي الاستخدام (مع تتبّع الاستخدام في قاعدة البيانات).
 */
export function signClick(adId: string, ts: number, nonce: string): string {
  return crypto.createHmac('sha256', SECRET).update(`${adId}.${ts}.${nonce}`).digest('hex');
}

const MAX_AGE_MS = 60 * 60 * 1000; // ساعة واحدة

export function verifyClick(adId: string, ts: number, nonce: string, sig: string): boolean {
  if (!Number.isFinite(ts) || Date.now() - ts > MAX_AGE_MS || ts > Date.now() + 60_000) {
    return false;
  }
  if (!nonce) return false;
  const expected = signClick(adId, ts, nonce);
  // مقارنة ثابتة الزمن لتفادي تسريب التوقيت
  const a = Buffer.from(expected);
  const b = Buffer.from(sig || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** تجزئة معرّف المستخدم (IP مثلاً) دون كشف الهوية */
export function hashUser(raw: string): string {
  return crypto.createHmac('sha256', SECRET).update(raw).digest('hex').slice(0, 16);
}
