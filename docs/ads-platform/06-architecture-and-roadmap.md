# 06 — المعمارية التقنية وخارطة الطريق

**الهدف:** ربط الركائز الخمس بمعمارية متماسكة، نموذج بيانات، تصميم API، وخطة تنفيذ مرحلية مع معايير قبول.

---

## 1. النظرة المعمارية العليا

```
                  ┌─────────────────────────┐
   الزائر/المعلن ──►│   الواجهة (React + Vite) │
                  └───────────┬─────────────┘
                              │ HTTPS / JWT
                  ┌───────────▼─────────────┐
                  │   API (Express + TS)     │
                  │  ┌─────────────────────┐ │
                  │  │ Auth / RBAC          │ │
                  │  │ Campaigns / Ads      │ │
                  │  │ Wallet / Payments    │ │
                  │  │ Ad Serving Engine    │ │
                  │  │ Events Ingest        │ │
                  │  │ Reports / Admin      │ │
                  │  └─────────────────────┘ │
                  └──┬─────────┬─────────┬───┘
                     │         │         │
            ┌────────▼──┐ ┌────▼───┐ ┌───▼────────┐
            │PostgreSQL │ │ Redis  │ │ S3 Storage │
            │(tx + agg) │ │(counts │ │ (creatives)│
            └───────────┘ │ +queue)│ └────────────┘
                          └────────┘
                     │
              ┌──────▼───────┐        ┌──────────┐
              │ Stripe (pay) │        │ Email/SES│
              └──────────────┘        └──────────┘
```

**المكوّنات الرئيسية:**
- **API Server:** منطق الأعمال، المصادقة، الصلاحيات.
- **Ad Serving Engine:** يقرر أي إعلان يُعرض (استهداف + ميزانية + وتيرة) بزمن < 100ms.
- **Events Ingest:** التقاط الانطباعات/النقرات بسرعة عالية.
- **Workers:** تجميع التحليلات، مزامنة الإنفاق، إرسال الإشعارات.

---

## 2. محرك عرض الإعلان (Ad Serving Engine)

دورة القرار عند طلب عرض إعلان:

1. تحديد سياق المستخدم (الموقع، اللغة، الجهاز).
2. ترشيح الإعلانات المؤهلة (استهداف مطابق + معتمدة + ضمن الجدولة).
3. استبعاد ما تجاوز الميزانية/الوتيرة/التقييد الترددي (من عدّادات Redis).
4. الترتيب حسب المزايدة (وفي مراحل لاحقة: المزايدة × جودة/CTR متوقع).
5. اختيار الفائز، تسجيل انطباع، إرجاع رابط نقر موقّع.

**حواجز الأمان:**
- التقييد الترددي (Frequency Cap) لكل مستخدم/إعلان.
- الوتيرة (Pacing) لتوزيع الميزانية اليومية.
- الإيقاف الفوري عند نفاد الرصيد/الميزانية.

---

## 3. نموذج البيانات (المخطط الأساسي)

```
users            (id, email, password_hash, role, status, created_at)
advertisers      (id, user_id, company, kyc_status)
wallets          (id, advertiser_id, currency)
wallet_ledger    (id, wallet_id, type, amount, ref, balance_after, created_at)
payment_intents  (id, wallet_id, provider, provider_ref, amount, status)
campaigns        (id, advertiser_id, objective, status, budget_daily,
                  budget_total, start_at, end_at, pacing)
ad_groups        (id, campaign_id, targeting JSONB, bid_type, bid_amount)
ads              (id, ad_group_id, type, headline, body, image_url,
                  dest_url, status, review_reason)
ad_events        (id, ad_id, type, user_hash, geo, device, ts, signature)
ad_stats_daily   (date, campaign_id, ad_id, impressions, clicks, spend)
moderation_decisions (id, ad_id, moderator_id, decision, reason, ts)
fraud_alerts     (id, target_type, target_id, rule, severity, ts)
audit_logs       (id, actor_id, action, target, meta JSONB, ts)
cms_blocks       (id, key, locale, content JSONB, updated_at)
notifications    (id, user_id, type, payload, read, created_at)
```

**ملاحظات:**
- `targeting` و`payload` كـ JSONB لمرونة الاستهداف والإشعارات.
- `wallet_ledger` هو مصدر الحقيقة للرصيد (append-only).
- `user_hash` في الأحداث: تجزئة لا تكشف الهوية (خصوصية).

---

## 4. تصميم الـ API (نظرة عامة)

| المجال | النقاط |
|--------|--------|
| المصادقة | `POST /auth/register`, `/auth/login`, `/auth/refresh` |
| الحملات | `GET/POST /campaigns`, `PATCH /campaigns/:id`, `/campaigns/:id/status` |
| المجموعات/الإعلانات | `/campaigns/:id/adgroups`, `/adgroups/:id/ads` |
| المحفظة | `GET /wallet`, `POST /wallet/topup`, `GET /wallet/transactions` |
| Webhooks | `POST /webhooks/stripe` |
| العرض | `GET /serve?ctx=…` (محرك العرض) |
| الأحداث | `POST /events`, `GET /click/:signed` |
| التقارير | `GET /reports`, `GET /reports/export` |
| الإدارة | `/admin/users`, `/admin/ads/review`, `/admin/fraud`, `/admin/content` |

- توحيد الأخطاء، التحقق من المدخلات (zod/joi)، تحديد المعدّل (rate limiting).
- نسخ الـ API (`/api/v1`).

---

## 5. الأمان والامتثال (ملخص)

- JWT قصير العمر + Refresh، تدوير الأسرار، 2FA للإدارة.
- TLS في كل مكان، تشفير at-rest للبيانات الحساسة.
- عدم تخزين بيانات البطاقات (Stripe).
- التحقق من توقيع Webhooks + Idempotency.
- مراجعة محتوى الإعلانات + سياسات واضحة.
- الخصوصية: بيانات طرف أول، تجزئة المعرّفات، موافقة الكوكيز، جاهزية GDPR.
- إعلانات مالية: تدقيق إضافي وتحذيرات مخاطر (مهم نظراً لسياق المنصة).
- Audit Log شامل + مطابقة مالية دورية.

---

## 6. خارطة الطريق المرحلية

### المرحلة 0 — التأسيس (أسبوعان)
- إعداد المستودع، PostgreSQL، Redis، CI/CD، البنية الأساسية للمصادقة.
- **القبول:** تسجيل/دخول يعمل، مخطط قاعدة البيانات مطبّق.

### المرحلة 1 — MVP المعلِن (4–6 أسابيع)
- صفحة الهبوط + التسجيل.
- إنشاء حملة CPC بإعلان صورة + استهداف أساسي.
- المحفظة + شحن Stripe.
- محرك عرض بسيط + تتبّع نقرات/انطباعات.
- لوحة أداء أساسية.
- **القبول:** معلِن ينشئ حملة، يشحن، تُعرض إعلاناته، ويرى أداءً دقيقاً.

### المرحلة 2 — الإدارة والثقة (3–4 أسابيع)
- لوحة المدير: مراجعة الإعلانات، إدارة المستخدمين.
- مكافحة احتيال أساسية + Audit Log.
- الإشعارات (رصيد منخفض، قرارات المراجعة).
- **القبول:** لا إعلان يُعرض دون اعتماد، تنبيهات الاحتيال تعمل.

### المرحلة 3 — التقارير والتخصيص (3 أسابيع)
- تقارير مفصّلة قابلة للتخصيص + تصدير CSV/PDF.
- تحسين خط التجميع التحليلي.
- **القبول:** تقارير تطابق الـ Ledger، تحميل < 2 ثانية.

### المرحلة 4 — التوسّع (مستمر)
- CPM/CPA، استهداف متقدم، إعادة استهداف.
- شبكة ناشرين + أرباح/سحب.
- تحسين بالذكاء الاصطناعي، مزودو دفع إضافيون.
- مستودع تحليلي (ClickHouse) عند الحاجة.

---

## 7. المخاطر والتخفيف

| الخطر | التخفيف |
|-------|---------|
| الإنفاق الزائد (تجاوز الرصيد) | عدّادات Redis لحظية + إيقاف فوري + مطابقة. |
| احتيال النقر | أحداث موقّعة، فلترة بوتات، كشف شذوذ. |
| محتوى إعلاني مخالف | مراجعة آلية + بشرية قبل النشر. |
| عبء كتابة الأحداث | فصل الالتقاط، تجميع دوري، مستودع لاحقاً. |
| الامتثال المالي للإعلانات | سياسات + تدقيق + تحذيرات مخاطر. |
| قفل المزوّد (Stripe) | طبقة دفع مجرّدة لإضافة مزودين. |

---

## 8. الخطوات التالية الفورية

1. **النموذج الأولي (Prototype):** تصميم تدفقات صفحة الهبوط ولوحة المعلن في Figma.
2. **التحقق:** عرض النماذج على معلنين محتملين وجمع ملاحظات.
3. **إعداد البنية:** مستودع، PostgreSQL، Redis، هيكل API.
4. **بناء MVP** وفق المرحلة 1 أعلاه.
5. **الاختبار والتكرار** قبل الإطلاق المحدود (Beta).

> هذه وثيقة حيّة — تُحدَّث مع تطوّر القرارات التقنية والتجارية.
