import Stripe from 'stripe';
import { creditFromProvider } from './ledger';

/**
 * طبقة المدفوعات. مبنية حول Stripe لكن معزولة خلف هذه الوحدة، فلا يعتمد
 * منطق المحفظة على Stripe مباشرةً — يمكن إضافة مزوّد آخر بنفس الواجهة لاحقاً
 * (راجع docs/ads-platform/03).
 */

const SECRET = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const CURRENCY = (process.env.CURRENCY || 'usd').toLowerCase();
const APP_URL = process.env.APP_URL || 'http://localhost:4000';

export const stripeEnabled = !!SECRET;

const stripe = SECRET ? new Stripe(SECRET) : null;

/**
 * إنشاء جلسة Checkout لشحن الرصيد. تعيد رابط صفحة الدفع المستضافة.
 * نُمرّر userId والمبلغ في metadata ليستخدمهما الـ Webhook بعد نجاح الدفع.
 */
export async function createTopupSession(userId: string, amountCents: number): Promise<string> {
  if (!stripe) throw new Error('مزوّد الدفع غير مُهيّأ');
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: CURRENCY,
          product_data: { name: 'شحن رصيد المحفظة' },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: { userId, amountCents: String(amountCents) },
    success_url: `${APP_URL}/app.html?topup=success`,
    cancel_url: `${APP_URL}/app.html?topup=cancel`,
  });
  if (!session.url) throw new Error('تعذّر إنشاء جلسة الدفع');
  return session.url;
}

/**
 * التحقق من توقيع الـ Webhook ومعالجة الحدث.
 * عند نجاح الدفع نضيف الرصيد بشكل idempotent (مرجع = session.id).
 * يُمرَّر rawBody كـ Buffer (جسم خام غير مُحلَّل) ليصحّ التحقق من التوقيع.
 */
export function handleWebhook(rawBody: Buffer, signature: string | undefined): { credited: boolean } {
  if (!stripe || !WEBHOOK_SECRET) throw new Error('مزوّد الدفع غير مُهيّأ');

  const event = stripe.webhooks.constructEvent(rawBody, signature || '', WEBHOOK_SECRET);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      id: string;
      payment_status?: string;
      metadata?: Record<string, string> | null;
    };
    if (session.payment_status === 'paid') {
      const userId = session.metadata?.userId;
      const amount = Number(session.metadata?.amountCents);
      if (userId && Number.isInteger(amount) && amount > 0) {
        const credited = creditFromProvider(userId, amount, session.id);
        return { credited };
      }
    }
  }
  return { credited: false };
}
