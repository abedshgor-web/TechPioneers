# 05 — الأمن والامتثال (Security & Compliance)

> **المشروع:** نظام CRM متعدد المستأجرين (Multi-tenant SaaS) — مستوى Enterprise  
> **تاريخ الوثيقة:** 2026-06-02  
> **نطاق التطبيق:** من الإطلاق الأوّلي حتى الحصول على اعتمادات Enterprise

---

## جدول المحتويات

1. [عزل بيانات المستأجرين (Tenant Isolation)](#1-tenant-isolation)
2. [المصادقة (Authentication)](#2-authentication)
3. [التفويض (Authorization)](#3-authorization)
4. [حماية البيانات (Data Protection)](#4-data-protection)
5. [الامتثال (Compliance) وخارطة الطريق](#5-compliance)
6. [سجلات التدقيق والمراقبة (Audit Logging & Monitoring)](#6-audit-logging)
7. [النسخ الاحتياطي والتعافي من الكوارث (Backup & DR)](#7-backup-and-dr)
8. [أمن التطبيقات (AppSec / OWASP)](#8-appsec)
9. [أمن الدفع والفوترة (Payment Security / PCI DSS)](#9-payment-security)
10. [خطة الاستجابة للحوادث (Incident Response)](#10-incident-response)
11. [الأمن في دورة حياة التطوير (DevSecOps / SSDLC)](#11-devsecops)
12. [إدارة المورّدين والمعالجين الفرعيين (Subprocessors)](#12-subprocessors)

---

## 1. عزل بيانات المستأجرين (Tenant Isolation) {#1-tenant-isolation}

### 1.1 نموذج العزل المعتمد: الدفاع متعدد الطبقات

يعتمد النظام نموذج **Defense-in-Depth** بثلاث طبقات متداخلة. اختراق طبقة واحدة لا يكفي للوصول إلى بيانات مستأجر آخر.

```
طبقة قاعدة البيانات  →  Row-Level Security (RLS) على كل جدول يحمل tenant_id
طبقة التطبيق        →  Tenant Scope Middleware يُغلق كل طلب API
طبقة الشبكة         →  مسارات منفصلة + حدود شبكية (Network Boundaries)
```

### 1.2 Row-Level Security (RLS) على PostgreSQL

**الإعداد الإلزامي لكل جدول يحمل بيانات المستأجر:**

```sql
-- تفعيل RLS على الجدول
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;

-- سياسة الوصول: كل صف يخص المستأجر الحالي فقط
CREATE POLICY tenant_isolation_policy ON contacts
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- تعيين السياق لكل معاملة (Transaction)
BEGIN;
SET LOCAL app.current_tenant_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
-- ... تنفيذ الاستعلامات ...
COMMIT;
```

**قواعد RLS الإلزامية:**
- كل جدول يحمل `tenant_id` يجب أن يملك RLS Policy مُفعّلة.
- يُستخدم `FORCE ROW LEVEL SECURITY` لمنع أصحاب الجدول (table owners) من تجاوز السياسة.
- `SET LOCAL` (وليس `SET`) لضمان انتهاء السياق مع نهاية المعاملة.
- عند استخدام **pgBouncer** في وضع transaction mode: التحقق من أن session variables لا تتسرب بين connections.

### 1.3 Tenant Scoping على مستوى التطبيق

```
كل طلب API يمرّ عبر TenantScopeMiddleware:
1. استخراج tenant_id من JWT token (claim: tenant_id)
2. التحقق من وجود المستأجر وحالته (نشط / موقوف)
3. تعيين app.current_tenant_id في قاعدة البيانات
4. حقن tenant_id في كل query builder افتراضياً
5. رفض أي طلب يفتقر إلى tenant context
```

**لا يوجد استثناء:** حتى المسارات الداخلية (internal routes) والمهام الدورية (cron jobs) تحمل tenant context صريح.

### 1.4 فصل الموارد (Resource Isolation)

| الطبقة | الأسلوب المعتمد | الهدف |
|--------|----------------|-------|
| قاعدة البيانات | RLS + `tenant_id` في كل جدول | منع cross-tenant data access |
| التخزين المؤقت (Cache) | مفاتيح Redis تتضمن `{tenant_id}:{resource}` | منع cache poisoning |
| الملفات والمرفقات | مسارات S3/Storage تتضمن tenant prefix | عزل الملفات |
| طوابير المهام (Job Queues) | كل job يحمل tenant_id + التحقق منه عند التنفيذ | منع data leakage |
| السجلات (Logs) | tenant_id مُدرج في كل سطر | سهولة التدقيق |

### 1.5 اختبارات عزل المستأجرين

**اختبارات إلزامية في CI/CD pipeline:**

```
اختبار 1 — Cross-Tenant Read:
  - إنشاء مستأجرَين: Tenant A و Tenant B
  - إنشاء سجل في Tenant A
  - محاولة قراءته من Tenant B → يجب أن يُرجع 404 (وليس 403)
  - التحقق من عدم تسريب وجود السجل

اختبار 2 — Token Manipulation:
  - تعديل tenant_id في JWT يدوياً
  - التحقق من أن الطلب يُرفض (401/403)

اختبار 3 — Direct DB Query:
  - الاتصال مباشرةً بقاعدة البيانات دون SET LOCAL
  - التحقق من أن RLS يمنع الوصول افتراضياً

اختبار 4 — Bulk Operations:
  - تنفيذ عملية bulk تؤثر على سجلات متعددة
  - التحقق من أنها تؤثر فقط على tenant صاحب الطلب
```

**اختبار دوري:** اختبار اختراق (Pentest) متخصص في multi-tenancy كل 12 شهراً.

---

## 2. المصادقة (Authentication) {#2-authentication}

### 2.1 سياسة كلمات المرور

| المعيار | القيمة المطلوبة |
|---------|---------------|
| الحد الأدنى للطول | 12 حرفاً |
| تعقيد | أحرف كبيرة + صغيرة + أرقام + رموز |
| حظر كلمات المرور الشائعة | فحص قائمة HaveIBeenPwned API (k-anonymity) |
| انتهاء الصلاحية | لا يُفرض (وفق NIST SP 800-63B) إلا عند الاشتباه في اختراق |
| منع إعادة الاستخدام | آخر 10 كلمات مرور |
| تخزين | bcrypt (cost factor ≥ 12) أو Argon2id |

### 2.2 المصادقة متعددة العوامل (MFA / 2FA)

| المستوى | المطلوب |
|---------|---------|
| جميع المستخدمين (مجاني/تجريبي) | 2FA اختياري لكنه مُوصى به |
| الخطط المدفوعة | 2FA مطلوب للمشرفين (Admins) |
| خطط Enterprise | 2FA إجباري لجميع المستخدمين |
| المشرفون الداخليون | 2FA إجباري دائماً |

**أساليب 2FA المدعومة (بالترتيب الأفضل للأمن):**
1. **FIDO2 / WebAuthn** (Hardware Security Keys) — الأعلى أماناً
2. **TOTP** (Authenticator Apps: Google Authenticator, Authy, 1Password)
3. **SMS OTP** — مدعوم كاحتياطي فقط، مع تحذير من مخاطر SIM-swapping

**رموز الاسترداد (Recovery Codes):** 10 رموز أحادية الاستخدام، مُشفَّرة في قاعدة البيانات.

### 2.3 SSO / SAML 2.0 / OAuth 2.0 / OIDC

- **SAML 2.0:** للعملاء Enterprise (متوافق مع Okta، Azure AD، Google Workspace، Ping Identity).
- **OAuth 2.0 / OIDC:** تسجيل الدخول بحساب Google/Microsoft/GitHub.
- **تعيين الدور عبر SAML Attributes:** دعم تعيين الأدوار تلقائياً من IdP Attributes.
- **Just-in-Time (JIT) Provisioning:** إنشاء حسابات المستخدمين تلقائياً عند أول دخول عبر SSO.
- **SSO Enforcement على مستوى المستأجر:** يمكن لمشرف المستأجر إلزام جميع المستخدمين باستخدام SSO فقط وتعطيل تسجيل الدخول بكلمة مرور.

### 2.4 إدارة الجلسات والـ Tokens

```
Access Token:
  - نوع: JWT (RS256 أو ES256 — تجنب HS256 في بيئة multi-tenant)
  - مدة الصلاحية: 15 دقيقة
  - Payload: { sub, tenant_id, roles, jti, iat, exp }

Refresh Token:
  - نوع: Opaque token (مُخزَّن في HttpOnly Secure Cookie)
  - مدة الصلاحية: 7 أيام (قابلة للتمديد عند النشاط)
  - تدوير تلقائي: إصدار refresh token جديد مع كل تجديد
  - إلغاء فوري: عند تسجيل الخروج أو تغيير كلمة المرور

قاعدة بيانات الجلسات:
  - جدول active_sessions يحتوي: session_id, user_id, tenant_id, ip, user_agent, created_at, last_seen
  - عرض الجلسات النشطة للمستخدم وإمكانية إلغاء أي جلسة
  - إلغاء جميع الجلسات عند تغيير كلمة المرور أو اشتباه في اختراق
```

### 2.5 الحماية من Brute-Force وهجمات القوة الغاشمة

```
Rate Limiting (per IP + per account):
  - 5 محاولات فاشلة → تأخير تصاعدي (exponential backoff)
  - 10 محاولات فاشلة → قفل مؤقت 15 دقيقة
  - 20 محاولة فاشلة → قفل الحساب + إشعار البريد الإلكتروني

CAPTCHA:
  - hCaptcha أو Cloudflare Turnstile (بديل عن reCAPTCHA المرتبط بـ Google)
  - يُفعَّل عند الضغط الزائد على نقطة /auth/login

Account Enumeration Prevention:
  - رسائل خطأ موحّدة: "بيانات الاعتماد غير صحيحة" (بدون تمييز بين "مستخدم غير موجود" و"كلمة مرور خاطئة")
  - نفس الوقت الزمني للرد في كلتا الحالتين (timing attack prevention)

Credential Stuffing Defense:
  - دمج Have I Been Pwned API للكشف عن كلمات مرور مسرّبة عند إنشاء الحساب
  - مراقبة أنماط تسجيل الدخول من IPs / ASNs متعددة
```

---

## 3. التفويض (Authorization) {#3-authorization}

### 3.1 نموذج RBAC متعدد المستويات

يعتمد النظام **Hierarchical RBAC** مع تأهيل صريح لكل إجراء على مستوى المستأجر.

**الأدوار الافتراضية لكل مستأجر:**

| الدور | الوصف | صلاحيات رئيسية |
|-------|-------|---------------|
| `tenant_owner` | مالك الحساب الأصلي | كامل الصلاحيات + الفوترة + حذف المستأجر |
| `admin` | مشرف المستأجر | إدارة المستخدمين + الإعدادات + جميع البيانات |
| `manager` | مدير الفريق | إدارة الفريق + كل CRM data في نطاقه |
| `sales_rep` | مندوب المبيعات | قراءة/كتابة Contacts + Deals + Activities |
| `viewer` | مشاهد فقط | قراءة فقط لما يُحدده المشرف |
| `api_key_user` | تكامل API | صلاحيات مُحدَّدة عند إنشاء المفتاح |

**قواعد RBAC الصارمة:**
- الأدوار صالحة فقط داخل المستأجر الخاص بها (tenant-scoped).
- لا يمكن لأي دور في Tenant A الوصول إلى Tenant B حتى لو كان المستخدم نفسه موجوداً في كليهما.
- مبدأ الأقل امتيازاً (Least Privilege): الدور الافتراضي عند الإنشاء هو `viewer`.

### 3.2 الأذونات الدقيقة (Fine-Grained Permissions / ABAC)

للعملاء Enterprise: دعم **ABAC** يضيف طبقة فوق RBAC:

```
مثال:
  - يستطيع مندوب المبيعات رؤية فرص البيع المسنَدة إليه فقط
  - لا يستطيع الموظف قراءة ملفات العملاء الذين ليسوا في إقليمه الجغرافي
  - يستطيع المدير رؤية تقارير فريقه فقط
```

**تطبيق Authorization في الكود:**
```
كل endpoint يتحقق من:
  1. هل المستخدم مُصادق عليه؟ (Authentication)
  2. هل tenant_id في الطلب يطابق tenant_id في JWT؟ (Tenant Isolation)
  3. هل للمستخدم دور يسمح بهذه العملية؟ (RBAC check)
  4. هل يملك المستخدم الوصول إلى هذا المورد بالذات؟ (Resource-level check)
```

### 3.3 صلاحيات API Keys

- كل مفتاح API مرتبط بـ tenant_id + مستخدم محدد.
- صلاحيات قابلة للتخصيص عند الإنشاء (read-only / write / specific resources).
- انتهاء صلاحية قابل للتحديد.
- تسجيل كل استخدام في Audit Log.
- لا يمكن لمفتاح API تجاوز صلاحيات المستخدم الذي أنشأه.

---

## 4. حماية البيانات (Data Protection) {#4-data-protection}

### 4.1 التشفير أثناء النقل (Encryption in Transit)

| الطبقة | المعيار |
|--------|---------|
| HTTPS خارجي | TLS 1.3 إلزامي، TLS 1.2 كحد أدنى مقبول |
| TLS Certificates | Let's Encrypt (تجديد تلقائي) أو ACM (AWS) |
| HSTS | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` |
| الاتصالات الداخلية (microservices) | mTLS أو TLS 1.3 داخلياً |
| قاعدة البيانات | TLS لجميع اتصالات قاعدة البيانات (SSL mode: verify-full) |
| Cipher Suites | رفض RC4، 3DES، EXPORT، NULL suites |

### 4.2 التشفير في حالة السكون (Encryption at Rest)

| البيانات | التشفير المعتمد |
|---------|----------------|
| قاعدة البيانات (PostgreSQL) | AES-256 على مستوى disk (provider-managed) |
| حقول PII الحساسة في DB | تشفير على مستوى الحقل (Field-level Encryption) بـ AES-256-GCM |
| الملفات والمرفقات (S3/Object Storage) | SSE-KMS (Server-Side Encryption with KMS) |
| النسخ الاحتياطية | مُشفَّرة قبل الرفع، مفاتيح منفصلة عن مفاتيح الإنتاج |
| السجلات (Logs) | مُشفَّرة في وجهة الحفظ (encrypted log storage) |

### 4.3 إدارة المفاتيح (Key Management — KMS)

```
بنية مفاتيح التشفير:
┌─────────────────────────────────────────┐
│  Master Key (HSM أو AWS KMS / GCP KMS)  │  ← لا يُستخدم مباشرةً
├─────────────────────────────────────────┤
│  Data Encryption Keys (DEK)             │  ← مفتاح لكل tenant
├─────────────────────────────────────────┤
│  Field Encryption Keys                  │  ← لحقول PII الحساسة
└─────────────────────────────────────────┘

مبادئ KMS:
- Envelope Encryption: تشفير DEK بالـ Master Key
- دوران المفاتيح (Key Rotation): تلقائي كل 365 يوماً
- Key Isolation: مفتاح مستقل لكل tenant في الخطط العليا
- Audit Trail: كل استخدام للمفتاح مُسجَّل في KMS audit log
- لا يُخزَّن أي مفتاح في كود المصدر أو متغيرات البيئة غير المُدارة
```

### 4.4 حقول PII ومعالجتها

**جرد PII (Personal Identifiable Information) في النظام:**

| الحقل | التصنيف | الإجراء |
|-------|---------|---------|
| الاسم الكامل | PII | تشفير field-level اختياري في الخطط العليا |
| البريد الإلكتروني | PII | تشفير + فهرس مُجزَّأ (hashed index) للبحث |
| رقم الهاتف | PII | تشفير field-level |
| عنوان IP (في Logs) | PII | إخفاء الـ octet الأخير (e.g. `192.168.1.xxx`) |
| بيانات بطاقة الائتمان | PCI Data | لا تُخزَّن أبداً — Stripe فقط |
| الموقع الجغرافي | PII | تخزين على مستوى الدولة/المدينة فقط |

**Data Masking في البيئات غير الإنتاجية:**
- بيانات الاختبار والتطوير: بيانات مولَّدة اصطناعياً (Faker/Synthetic data).
- لا تُنقَل بيانات إنتاج حقيقية إلى بيئة dev/staging إلا بعد إخفاء الهوية.
- أداة تنقيح تلقائية لـ PII في قواعد بيانات غير الإنتاج.

### 4.5 إقامة البيانات (Data Residency)

| المنطقة | الهدف |
|---------|-------|
| EU (Frankfurt / Ireland) | عملاء الاتحاد الأوروبي + امتثال GDPR |
| US (us-east-1 / us-west-2) | عملاء أمريكا الشمالية |
| ME/APAC | مناطق مستقبلية عند الطلب |

**التطبيق:**
- يختار العميل منطقة البيانات عند إنشاء الحساب (لا يمكن تغييرها لاحقاً إلا بطلب رسمي).
- tenant_id مُرتبط بمنطقة جغرافية محددة في جدول `tenants`.
- نقل البيانات خارج المنطقة المختارة محظور تقنياً (network policies + IAM policies).
- **Standard Contractual Clauses (SCCs):** مُدرجة في DPA للنقل من EU إلى US.

---

## 5. الامتثال (Compliance) وخارطة الطريق {#5-compliance}

### 5.1 المعايير المستهدفة

| المعيار | الوصف | الأولوية |
|---------|-------|---------|
| **GDPR** (EU) | حماية البيانات الشخصية للأفراد في الاتحاد الأوروبي | إلزامي من اليوم الأول |
| **CCPA / CPRA** (California) | قانون خصوصية كاليفورنيا | إلزامي من اليوم الأول |
| **SOC 2 Type II** | اعتماد أمني للسوق الأمريكي | السنة الأولى |
| **ISO 27001:2022** | نظام إدارة أمن المعلومات | السنة الثانية |
| **PCI DSS 4.0.1** | أمن بيانات بطاقات الدفع (via Stripe) | إلزامي من اليوم الأول |
| **HIPAA** | ملاحظة: إذا قرر المنتج مستقبلاً خدمة قطاع الرعاية الصحية فقط | مستقبلي (اختياري) |

### 5.2 خارطة طريق الامتثال التفصيلية

| المرحلة | الجدول الزمني | الإنجازات المطلوبة | الهدف |
|---------|--------------|-------------------|-------|
| **المرحلة 0 — الأساس** | قبل الإطلاق (الشهر 0) | RLS + تشفير + سياسات خصوصية + DPA Template + Terms of Service + Cookies Policy | الإطلاق القانوني |
| **المرحلة 1 — الامتثال الأساسي** | الشهر 1-3 | GDPR: نموذج موافقة، DSR Portal، نموذج حذف البيانات. CCPA: صفحة "لا تبع بياناتي"، سياسة الخصوصية الكاملة. Security Policies داخلية. | قبول عملاء EU وUS |
| **المرحلة 2 — SOC 2 Type I** | الشهر 4-8 | تعيين مزود Audit (KPMG / Vanta / Drata). تطبيق ضوابط Trust Services (Security). توثيق جميع السياسات والإجراءات. إكمال تقييم المخاطر. | ثقة العملاء الأوائل |
| **المرحلة 3 — SOC 2 Type II** | الشهر 9-18 | فترة مراقبة 12 شهراً. Audit log تلقائي + evidence collection. إصدار تقرير SOC 2 Type II. | فتح سوق Enterprise الأمريكي |
| **المرحلة 4 — ISO 27001:2022** | الشهر 12-24 | تأسيس ISMS كامل. تحليل الفجوات (Gap Analysis). تدريب الفريق. تدقيق داخلي. اعتماد هيئة خارجية. | الأسواق الأوروبية والحكومية |
| **المرحلة 5 — Enterprise Hardening** | الشهر 18+ | Penetration testing سنوي. Bug Bounty Program. DPO (Data Protection Officer) إذا تجاوز المعالجة حدود GDPR. HIPAA BAA (إن دخلت قطاع الصحة). | عقود الحكومة والشركات الكبرى |

### 5.3 GDPR — المتطلبات التشغيلية

**حقوق أصحاب البيانات (Data Subject Rights):**

| الحق | الإجراء التقني | الموعد القانوني |
|------|--------------|----------------|
| الوصول (Right of Access) | API تُصدّر جميع بيانات المستخدم بصيغة JSON/CSV | 30 يوماً |
| التصحيح (Rectification) | واجهة تحرير البيانات الشخصية | 30 يوماً |
| المحو (Right to Erasure / "Right to be Forgotten") | حذف ناعم ثم تطهير كامل بعد 30 يوماً | 30 يوماً |
| قابلية النقل (Data Portability) | تصدير CSV / JSON لجميع البيانات | 30 يوماً |
| الاعتراض (Right to Object) | إلغاء الموافقة على المعالجة + إيقاف التسويق | فوري |
| تقييد المعالجة (Restriction of Processing) | تجميد حساب + إيقاف المعالجة مع الاحتفاظ بالبيانات | 30 يوماً |

**DSR Portal (Data Subject Request Portal):**
- بوابة ذاتية للمستخدم لإدارة طلباته.
- مسار آلي: تلقّي الطلب → التحقق من الهوية → تنفيذ الطلب → إشعار بالاكتمال.
- سجل جميع الطلبات للتدقيق.

**إشعار خرق البيانات:**
- GDPR Article 33: إشعار السلطة المختصة (DPA) خلال **72 ساعة** من اكتشاف الخرق.
- GDPR Article 34: إشعار الأفراد المتضررين "دون تأخير غير مبرر" إذا كان الخرق يشكّل خطراً عالياً.

**Data Processing Agreements (DPA):**
- نموذج DPA جاهز لتوقيع العملاء (نحن كـ Data Processor).
- DPAs موقَّعة مع جميع Subprocessors (نحن كـ Data Controller).
- Standard Contractual Clauses (SCCs) 2021 للنقل إلى دول خارج EEA.

**DPIA (Data Protection Impact Assessment):**
- إجراؤه قبل تطوير أي ميزة تعالج PII على نطاق واسع أو تستخدم معالجة آلية.

### 5.4 CCPA / CPRA — المتطلبات التشغيلية (2026)

- **"Do Not Sell or Share My Personal Information":** رابط واضح في Footer.
- **حق الوصول والحذف والتصحيح:** آلية مشتركة مع DSR Portal.
- **تقييم المخاطر (Risk Assessments):** إلزامي لأنواع المعالجة عالية الخطورة (ADMT) — متطلب يناير 2026.
- **معالجة B2B:** بيانات جهات الاتصال التجارية لسكان كاليفورنيا خاضعة للحماية الكاملة.
- **Service Provider vs. Business:** توثيق الدور في كل عقد.
- **Cybersecurity Audits:** متطلب جديد 2026 للشركات ذات المعالجة عالية الخطورة.

### 5.5 إدارة الموافقات (Consent Management)

- **Consent Banner:** Cookie consent مع Consent Management Platform (CMP) متوافق مع GDPR و CCPA.
- **سجل الموافقة:** تخزين timestamp + IP + نص السياسة التي وافق عليها المستخدم.
- **سحب الموافقة:** فوري وسهل الوصول.
- **لا يُشغَّل أي tracker أو analytics script قبل الحصول على الموافقة.**

---

## 6. سجلات التدقيق والمراقبة (Audit Logging & Monitoring) {#6-audit-logging}

### 6.1 ما يُسجَّل (Audit Events)

**تصنيف الأحداث القابلة للتسجيل:**

| الفئة | الأحداث | مستوى الأهمية |
|-------|---------|--------------|
| **المصادقة** | تسجيل دخول، فشل تسجيل دخول، تسجيل خروج، تفعيل 2FA، تغيير كلمة مرور، إضافة SSO | عالٍ |
| **إدارة المستخدمين** | إنشاء مستخدم، تعديل الدور، تعطيل الحساب، حذف المستخدم | عالٍ |
| **بيانات CRM** | إنشاء / تعديل / حذف جهة اتصال، صفقة، مشروع | متوسط |
| **استيراد / تصدير البيانات** | كل عملية استيراد CSV أو تصدير | عالٍ |
| **إعدادات المستأجر** | تغيير الإعدادات، تعديل خطة الاشتراك | عالٍ |
| **API Keys** | إنشاء، حذف، استخدام (كل استدعاء) | متوسط - عالٍ |
| **إدارة الفوترة** | تغيير الخطة، إضافة بطاقة، فشل دفع | عالٍ |
| **أحداث الأمان** | تغيير RLS policy، محاولة cross-tenant access، rate limit exceeded | حرج |
| **طلبات DSR** | طلب حذف، طلب تصدير، سحب موافقة | عالٍ |

**بنية سجل التدقيق الموحَّد:**

```json
{
  "event_id": "uuid",
  "timestamp": "2026-06-02T10:30:00Z",
  "tenant_id": "uuid",
  "actor_id": "uuid",
  "actor_type": "user | api_key | system",
  "actor_ip": "x.x.x.0",
  "actor_user_agent": "...",
  "action": "contact.created",
  "resource_type": "contact",
  "resource_id": "uuid",
  "status": "success | failure",
  "changes": { "before": {...}, "after": {...} },
  "metadata": { "session_id": "...", "request_id": "..." }
}
```

### 6.2 الاحتفاظ بالسجلات (Retention)

| نوع السجل | مدة الاحتفاظ | مكان التخزين |
|-----------|-------------|-------------|
| Audit Logs (أمان) | 7 سنوات | Immutable storage (WORM) |
| Access Logs | 1 سنة | Object Storage مُضغوط |
| Application Logs | 90 يوماً | Log aggregation platform |
| Security Events | 7 سنوات | SIEM |
| Billing Logs | 7 سنوات | متطلب قانوني |

**خصائص السجلات:**
- **Immutability:** السجلات غير قابلة للتعديل أو الحذف (append-only).
- **Tamper Detection:** هاش تراكمي لكل سجل (hash chain).
- **Integrity Verification:** التحقق الدوري من سلامة الهاشات.
- **منفصلة عن الإنتاج:** مخزَّنة في حساب/project منفصل لا يستطيع المشرف العادي الوصول إليه.

### 6.3 الكشف عن الشذوذ (Anomaly Detection)

**قواعد التنبيه الفوري:**

```
تنبيه P1 (حرج):
  - محاولة cross-tenant data access
  - تصدير غير مسبوق لكميات كبيرة من البيانات (> X سجل في Y دقيقة)
  - تسجيل دخول ناجح من دولة جديدة لم يُسجَّل منها من قبل
  - استخدام مفتاح API من IP غير معروف
  - تغيير RBAC أو صلاحيات من خارج عملية Change Management

تنبيه P2 (عالٍ):
  - rate limit exceeded متكرر من نفس IP
  - فشل تسجيل دخول متعدد لحسابات متعددة (credential stuffing indicator)
  - تصاعد غير طبيعي في حجم استدعاء API
  - تغيير إعدادات الأمان (2FA disable, SSO change)

تنبيه P3 (تحذير):
  - محاولات فاشلة لتسجيل الدخول تتجاوز الحدود العادية
  - استخدام API خارج أوقات العمل المعتادة
```

**أدوات المراقبة:**
- **SIEM:** تجميع جميع أحداث الأمان (Elastic SIEM أو Datadog Security).
- **APM:** مراقبة الأداء + الكشف عن الشذوذات (Datadog APM / OpenTelemetry).
- **Alerting:** PagerDuty أو OpsGenie لإشعارات P1/P2.
- **Dashboards:** لوحة مراقبة أمنية تشغيلية (Security Operations Dashboard).

---

## 7. النسخ الاحتياطي والتعافي من الكوارث (Backup & DR) {#7-backup-and-dr}

### 7.1 أهداف التعافي

| المقياس | الهدف المستهدف |
|---------|---------------|
| **RPO** (Recovery Point Objective) | ≤ 1 ساعة (أقصى قدر من فقدان البيانات المقبول) |
| **RTO** (Recovery Time Objective) | ≤ 4 ساعات (أقصى وقت توقف مقبول) |
| **Availability SLA** | 99.9% (≤ 8.7 ساعات توقف سنوياً) للخطط المدفوعة |
| **Availability SLA** | 99.95% لخطط Enterprise |

### 7.2 استراتيجية النسخ الاحتياطي

```
قاعدة 3-2-1:
  3 نسخ  →  الإنتاج + نسخة محلية + نسخة بعيدة (منطقة جغرافية مختلفة)
  2 وسائط →  SSD/NVMe (المنطقة الرئيسية) + Object Storage (منطقة ثانوية)
  1 نسخة خارج الموقع → منطقة جغرافية مختلفة تماماً

جدول النسخ:
  - Continuous WAL Streaming → RPO دقائق (للـ PostgreSQL)
  - نسخة كاملة يومية → يُحتفظ بها 30 يوماً
  - نسخة أسبوعية → يُحتفظ بها 12 أسبوعاً
  - نسخة شهرية → يُحتفظ بها 12 شهراً
  - نسخة سنوية → يُحتفظ بها 7 سنوات (للامتثال)
```

### 7.3 اختبار التعافي

| الاختبار | التكرار | الهدف |
|---------|---------|-------|
| استعادة نسخة كاملة | شهرياً | التحقق من صحة النسخ + قياس RTO فعلياً |
| Tabletop Exercise | ربع سنوياً | محاكاة سيناريو كارثة + اختبار الفريق |
| Failover Test | نصف سنوياً | اختبار التبديل إلى المنطقة الثانوية |
| DR Drill كامل | سنوياً | محاكاة كاملة: فقدان المنطقة الرئيسية بالكامل |

**النتائج مُوثَّقة ومُشاركة مع العملاء Enterprise عند الطلب.**

### 7.4 بنية Multi-Region وHigh Availability

```
المنطقة الرئيسية (Primary Region):
  - قاعدة بيانات PostgreSQL في وضع Primary
  - Streaming Replication إلى Replica في نفس المنطقة
  - Read Replicas للاستعلامات الكثيفة

المنطقة الثانوية (DR Region):
  - Standby Database يستقبل WAL بشكل مستمر
  - Failover يدوي (مُخطَّط لأتمتته في المرحلة 2)

Load Balancer + CDN:
  - Cloudflare أو AWS CloudFront للحماية من DDoS
  - Health checks تلقائية مع إعادة توجيه عند الفشل
```

---

## 8. أمن التطبيقات (AppSec) {#8-appsec}

### 8.1 OWASP Top 10 (2025) — الضوابط المقابلة

| الخطر | الإجراء المُطبَّق |
|-------|-----------------|
| **A01: Broken Access Control** | RLS + Tenant Middleware + RBAC checks على كل endpoint + automated isolation tests |
| **A02: Security Misconfiguration** | Infrastructure as Code (IaC) + CIS Benchmarks + automated config scanning (Checkov) + disable default credentials |
| **A03: Software Supply Chain Failures** | SCA (Snyk / Dependabot) + lock files + SBOM + signature verification للـ Docker images |
| **A04: Insecure Design** | Threat Modeling لكل ميزة جديدة + Security Requirements في مرحلة التصميم |
| **A05: Security Logging & Monitoring Failures** | Audit logging شامل + SIEM + alerting (موضَّح في القسم 6) |
| **A06: Vulnerable & Outdated Components** | Dependabot + Snyk + أسبوعي patch cycle للتبعيات الحرجة |
| **A07: Identification & Auth Failures** | إجراءات القسمَين 2 و3 بالكامل |
| **A08: Software & Data Integrity Failures** | Code signing + release signing + CI/CD integrity checks |
| **A09: Server-Side Request Forgery (SSRF)** | Allowlist للـ outbound requests + network policies تمنع الوصول لـ metadata endpoints |
| **A10: Mishandling of Exceptional Conditions** | Global error handler يمنع تسريب stack traces + structured error responses |

### 8.2 التحقق من المدخلات (Input Validation)

```
مبادئ إلزامية:
  - Allowlist validation (وليس Blocklist) — قبول ما هو صحيح فقط
  - Server-side validation دائماً (Client-side validation للتجربة فقط)
  - Parameterized queries / ORM — لا SQL بناءً على مدخلات المستخدم
  - طول محدود لكل حقل + نوع محدد (type coercion ممنوع)
  - تنظيف HTML (sanitize) للحقول التي تسمح بـ rich text (DOMPurify)
  - رفض أي مدخل يتجاوز حجماً معيناً (anti-DoS)
  - JSON Schema validation لطلبات API
```

### 8.3 إدارة الأسرار (Secrets Management)

```
المبادئ:
  ✗ لا يُخزَّن أي سر (API key, password, certificate) في:
     - كود المصدر (Git)
     - متغيرات بيئة غير مُدارة
     - ملفات Docker Image
     - CI/CD logs

  ✓ جميع الأسرار مُخزَّنة في:
     - HashiCorp Vault (On-premise أو HCP) أو
     - AWS Secrets Manager / GCP Secret Manager
     - مُحقَّنة في وقت التشغيل فقط (runtime injection)

  ✓ مسح دوري للكود بحثاً عن الأسرار:
     - GitLeaks في pre-commit hooks
     - Trufflehog في CI pipeline
     - GitHub Secret Scanning (مُفعَّل)
```

### 8.4 فحص التبعيات والـ SAST/DAST

| الأداة | النوع | التكرار |
|--------|-------|---------|
| **Snyk** أو **Dependabot** | SCA (Software Composition Analysis) | مع كل Pull Request |
| **Semgrep** أو **CodeQL** | SAST (Static Application Security Testing) | مع كل Pull Request |
| **OWASP ZAP** أو **Burp Suite** | DAST (Dynamic Application Security Testing) | أسبوعياً على بيئة staging |
| **Trivy** | Container/Image scanning | مع كل بناء Docker image |
| **Checkov** / **TFSec** | Infrastructure as Code scanning | مع كل تغيير IaC |
| **Semgrep Supply Chain** | Supply Chain security | مع كل PR |

**سياسة الإصلاح:**

| الخطورة | موعد الإصلاح |
|---------|-------------|
| Critical | خلال 24 ساعة |
| High | خلال 7 أيام |
| Medium | خلال 30 يوماً |
| Low | ضمن الـ Sprint القادم |

### 8.5 اختبار الاختراق (Penetration Testing)

**جدول الاختبارات:**

| النوع | التكرار | النطاق |
|-------|---------|-------|
| Web Application Pentest | سنوياً | جميع endpoints + business logic |
| Multi-tenancy Specific Pentest | سنوياً | cross-tenant isolation + privilege escalation |
| API Pentest | عند إطلاق تغييرات كبرى | REST API + GraphQL (إن وُجد) |
| Network / Infrastructure Pentest | سنوياً | بنية الشبكة + cloud configuration |
| Social Engineering (اختياري) | عند الطلب | Phishing simulation |

**متطلبات:**
- تنفيذه من طرف ثالث مستقل (لا يمكن أن يُجريه الفريق الداخلي وحده).
- تقرير مفصَّل مع CVSS scores.
- إصلاح Critical/High قبل الإطلاق العلني.
- نتائج Pentest مُتاحة لعملاء Enterprise عند توقيع NDA.

### 8.6 برنامج Bug Bounty

- **المرحلة 1 (قبل 6 أشهر من الإطلاق):** برنامج خاص (Invite-Only) على HackerOne أو Bugcrowd.
- **المرحلة 2 (بعد SOC 2 Type I):** برنامج عام مع نطاق محدد ومكافآت.
- **نطاق البرنامج:** Authentication bypass، Cross-tenant data access، RCE، SQL Injection، مشاكل RBAC.
- **خارج النطاق:** DoS، Spam، Social Engineering، Physical attacks.
- **مكافآت اقتراحية:** Critical: $2,000-$10,000 / High: $500-$2,000 / Medium: $100-$500.

---

## 9. أمن الدفع والفوترة (Payment Security / PCI DSS) {#9-payment-security}

### 9.1 استراتيجية PCI DSS عبر Stripe

**المبدأ الأساسي: تصفير نطاق PCI DSS (Minimize CDE Scope)**

```
الهدف: لا تلمس أي بيانات بطاقة ائتمان نظامنا أبداً

التطبيق:
  - استخدام Stripe Elements أو Stripe.js لاستقبال بيانات البطاقة
  - بيانات البطاقة تُرسَل مباشرةً من المتصفح إلى Stripe (لا تمر بخوادمنا)
  - نستقبل فقط: Payment Method ID (token) من Stripe
  - لا يُخزَّن أي رقم بطاقة أو CVV أو تاريخ انتهاء في قاعدة بياناتنا
```

**نتيجة ذلك:** نخضع لـ **SAQ-A** (أبسط استبيان PCI DSS) لا الاستبيان الأشمل.

### 9.2 متطلبات PCI DSS 4.0.1 المنطبقة علينا (SAQ-A)

| المتطلب | التطبيق |
|---------|---------|
| MFA لجميع الوصول للبيئة الإنتاجية | مُطبَّق (القسم 2.2) |
| TLS 1.2+ لجميع نقل البيانات | مُطبَّق (القسم 4.1) |
| سياسة أمن النظام الموثَّقة | موثَّقة في هذه الوثيقة |
| إدارة الثغرات وتحديثات الأمان | مُطبَّقة (القسم 8.4) |
| مراقبة الـ scripts على صفحات الدفع | CSP headers + Subresource Integrity (SRI) لـ Stripe.js |

### 9.3 ضمانات إضافية للفوترة

- **فصل الأدوار:** لا يستطيع موظف واحد الوصول إلى: قاعدة البيانات + بيانات Stripe + سجلات الفوترة في آنٍ واحد.
- **Webhook Security:** التحقق من توقيع كل Stripe Webhook (Stripe-Signature header).
- **Idempotency:** استخدام Idempotency Keys لمنع الفوترة المزدوجة.
- **إشعارات الفشل:** إشعار فوري عند فشل محاولة الدفع.
- **تشفير Stripe Customer ID:** تخزين Stripe Customer ID مشفَّراً في قاعدة البيانات.

---

## 10. خطة الاستجابة للحوادث (Incident Response) {#10-incident-response}

### 10.1 تصنيف الحوادث

| المستوى | الوصف | أمثلة | وقت الاستجابة |
|---------|-------|--------|--------------|
| **P1 — حرج** | تأثير مباشر على أمان بيانات العملاء | تسريب بيانات، cross-tenant access، RCE | ≤ 15 دقيقة |
| **P2 — عالٍ** | تأثير على الخدمة أو أمانها | فشل مصادقة عام، DDoS، ثغرة في الإنتاج | ≤ 1 ساعة |
| **P3 — متوسط** | تأثير محدود | محاولة Pentest خارجي، ثغرة في بيئة staging | ≤ 4 ساعات |
| **P4 — منخفض** | مشاكل صغيرة | ثغرة أكاديمية منخفضة الخطورة | ≤ 24 ساعة |

### 10.2 دورة حياة الحادث (NIST SP 800-61 Rev. 3)

تتبع الخطة الإطار المحدَّث المُصدَر في أبريل 2025 والمبني على NIST CSF 2.0:

```
[Govern] ── تأسيس سياسة الاستجابة + أدوار ومسؤوليات واضحة
    │
[Identify] ── جمع المعلومات + تحديد نطاق الحادث + تقييم الأثر
    │
[Protect] ── عزل المنظومة المتضررة + الحفاظ على الأدلة
    │
[Detect] ── تحديد جذر المشكلة (Root Cause) + الجدول الزمني
    │
[Respond] ── احتواء + إزالة + استعادة + إشعارات قانونية
    │
[Recover] ── التحقق + مراقبة مكثَّفة + تقرير مابعد الحادث
```

### 10.3 فريق الاستجابة (CSIRT)

| الدور | المسؤولية |
|-------|-----------|
| **Incident Commander** | قائد الاستجابة، يتخذ القرارات النهائية |
| **Security Lead** | التحليل التقني + جمع الأدلة |
| **Engineering Lead** | الإصلاح التقني + التغييرات في الإنتاج |
| **Communications Lead** | التواصل مع العملاء + الهيئات التنظيمية |
| **Legal / DPO** | تقييم الالتزامات القانونية + إشعارات GDPR |

### 10.4 إشعارات الإفصاح

| السيناريو | الجهة | الموعد |
|-----------|-------|-------|
| خرق بيانات شخصية (GDPR Article 33) | سلطة حماية البيانات (DPA) | ≤ 72 ساعة من الاكتشاف |
| خرق يؤثر على الأفراد (GDPR Article 34) | الأفراد المتضررون | "دون تأخير غير مبرر" |
| خرق يؤثر على عميل Enterprise | العميل مباشرةً | ≤ 24 ساعة (تعاقدياً) |
| خرق PCI (إن انطبق) | Stripe + Acquiring Bank | وفق متطلبات PCI DSS |

### 10.5 بعد الحادث (Post-Incident Review)

- **تقرير Post-Mortem:** مُكتَمل خلال 5 أيام عمل من حل الحادث.
- **Blameless Culture:** تحليل العملية لا الأشخاص.
- **Action Items:** إجراءات تصحيحية مُتتَبَّعة في نظام إدارة المهام.
- **Lessons Learned:** تحديث الـ Runbooks والـ Playbooks.
- **Knowledge Base:** جميع الحوادث مُوثَّقة للرجوع إليها.

---

## 11. الأمن في دورة حياة التطوير (DevSecOps / SSDLC) {#11-devsecops}

### 11.1 Security in SDLC — الأمن في كل مرحلة

```
┌──────────────┬─────────────────────────────────────────────────────┐
│ المرحلة      │ الإجراءات الأمنية                                    │
├──────────────┼─────────────────────────────────────────────────────┤
│ Requirements │ Security Requirements + Threat Modeling             │
│ Design       │ Architecture Review + STRIDE Threat Model           │
│ Development  │ Secure Coding Guidelines + Pre-commit hooks         │
│ Code Review  │ SAST + Peer Security Review                        │
│ Testing      │ DAST + Integration Tests للـ Isolation              │
│ Deployment   │ Container Scanning + IaC Scanning + Signed Images  │
│ Production   │ Runtime Security + SIEM + Anomaly Detection        │
│ Maintenance  │ Vulnerability Management + Patch Policy            │
└──────────────┴─────────────────────────────────────────────────────┘
```

### 11.2 بوابات الأمن في CI/CD Pipeline (Security Gates)

```yaml
# بوابات إلزامية قبل الدمج في main branch:
security_gates:
  - name: "Secret Scanning"
    tool: "GitLeaks + Trufflehog"
    block_on_failure: true

  - name: "SAST Analysis"
    tool: "Semgrep / CodeQL"
    block_on_failure: true      # لـ Critical/High فقط

  - name: "SCA - Dependency Check"
    tool: "Snyk / Dependabot"
    block_on_failure: true      # لـ Critical فقط

  - name: "Container Scan"
    tool: "Trivy"
    block_on_failure: true      # لـ Critical فقط

  - name: "IaC Security Scan"
    tool: "Checkov / TFSec"
    block_on_failure: false     # تحذير فقط (مؤقتاً)

  - name: "Tenant Isolation Tests"
    tool: "Custom test suite"
    block_on_failure: true      # إلزامي دائماً
```

### 11.3 سياسات التطوير الآمن

- **Secure Coding Guidelines:** وثيقة مرجعية لكل لغة مُستخدَمة في المشروع.
- **Security Champions:** مطوّر متخصص في الأمن في كل فريق.
- **Security Training:** تدريب سنوي إلزامي لجميع المطورين (OWASP، Secure Coding).
- **Threat Modeling:** جلسة STRIDE لكل ميزة تؤثر على أمن البيانات.
- **Defense in Depth Code Reviews:** مراجعة ثانية من منظور أمني لأي تغيير في: Auth، RBAC، Tenant Scoping، Data Access.

### 11.4 إدارة البيئات

| البيئة | القاعدة |
|--------|---------|
| Development | بيانات مولَّدة اصطناعياً فقط، لا وصول لإنتاج |
| Staging | بيانات منزوعة الهوية (anonymized)، منفصلة تقنياً عن الإنتاج |
| Production | أدنى صلاحية ممكنة، جميع التغييرات عبر CI/CD لا يدوياً |
| Emergency Access | Break-glass procedure + مراجعة إلزامية + audit trail |

---

## 12. إدارة المورّدين والمعالجين الفرعيين (Subprocessors) {#12-subprocessors}

### 12.1 قائمة Subprocessors الأساسية

| المورّد | الدور | نوع البيانات | المنطقة |
|---------|-------|-------------|---------|
| **Stripe** | معالجة الدفع | بيانات الفوترة (لا PII مباشر) | US / EU |
| **AWS / GCP / Azure** | البنية التحتية السحابية | جميع بيانات المستأجرين | متعددة (حسب الاختيار) |
| **Cloudflare** | CDN + DDoS Protection + DNS | بيانات الشبكة / IP logs | Global |
| **SendGrid / Postmark** | إرسال البريد الإلكتروني | البريد الإلكتروني للمستخدمين | US |
| **Datadog / Sentry** | مراقبة + تتبع الأخطاء | Application logs (بدون PII) | US / EU |
| **HackerOne / Bugcrowd** | Bug Bounty | بيانات الثغرات فقط | US |
| **Twilio / AWS SNS** | رسائل SMS للـ 2FA | أرقام الهاتف | متعددة |

### 12.2 إدارة مخاطر المورّدين

**عملية تقييم كل Subprocessor جديد:**

```
1. استبيان أمن المورّد (Security Questionnaire):
   - هل يمتلك SOC 2 Type II أو ISO 27001؟
   - ما سياسة حفظ البيانات؟
   - كيف يتعامل مع طلبات DSR؟

2. مراجعة عقدية:
   - DPA موقَّعة وفق GDPR Article 28
   - بنود حماية البيانات
   - حق التدقيق (Right to Audit)

3. تقييم دوري:
   - مراجعة سنوية لجميع Subprocessors
   - مراقبة أي تغييرات في سياساتهم أو اختراقات تطال الجانب الأمني

4. صفحة Subprocessors العامة:
   - قائمة محدَّثة منشورة على الموقع الرسمي
   - إشعار العملاء بأي تغيير قبل 30 يوماً (GDPR Article 28(2))
```

### 12.3 حقوق التدقيق (Right to Audit)

- **مع عملاء Enterprise:** حق التدقيق بإشعار 30 يوماً (أو تقديم تقارير SOC 2 كبديل).
- **مع Subprocessors:** ينعكس نفس الحق على العقود مع الموردين.

---

## ملاحق ومراجع

### أدوات التقنية المُوصى بها (Summary)

| الفئة | الأداة المُوصى بها |
|-------|------------------|
| Secrets Management | HashiCorp Vault / AWS Secrets Manager |
| SIEM | Elastic SIEM / Datadog Security |
| Compliance Automation | Vanta / Drata / Sprinto |
| SAST | Semgrep / CodeQL |
| SCA | Snyk / Dependabot |
| DAST | OWASP ZAP / Burp Suite Pro |
| Container Scanning | Trivy |
| IaC Scanning | Checkov / TFSec |
| Pentest Management | HackerOne / Bugcrowd |
| KMS | AWS KMS / GCP Cloud KMS / HashiCorp Vault |
| MFA | Auth0 / AWS Cognito مع دعم FIDO2 |
| SSO / SAML | Auth0 / WorkOS / Okta |

### المصادر والمراجع

1. [GDPR for SaaS Companies — Complete Guide (ComplyDog)](https://complydog.com/blog/gdpr-for-saas-companies-complete-compliance-guide)
2. [GDPR for US SaaS Companies: The Complete 2026 Guide](https://www.nwlextech.com/compliance/gdpr-for-us-saas-companies-the-complete-2026-guide)
3. [SOC 2 Compliance Checklist 2026 — Sprinto](https://sprinto.com/blog/soc-2-compliance-checklist/)
4. [SOC 2 Type 2: Requirements, Process, Cost in 2026](https://sprinto.com/blog/soc-2-type-2/)
5. [ISO 27001 for SaaS: The 2026 Practical Guide — Orbiq](https://www.orbiqhq.com/compliance-automation/iso-27001-for-saas)
6. [OWASP Top 10:2025 — Official](https://owasp.org/Top10/2025/)
7. [Multi-tenant data isolation with PostgreSQL RLS — AWS Blog](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
8. [PCI DSS Compliance — Stripe Documentation](https://stripe.com/guides/pci-compliance)
9. [PCI DSS 4.0 New Requirements — Matproof](https://matproof.com/blog/pci-dss-4-new-requirements-2025)
10. [CCPA Requirements 2026 — Secure Privacy](https://secureprivacy.ai/blog/ccpa-requirements-2026-complete-compliance-guide)
11. [NIST SP 800-61 Rev. 3 — Incident Response (April 2025)](https://csrc.nist.gov/pubs/sp/800/61/r3/final)
12. [SOC 2 Compliance Checklist — Secureframe](https://secureframe.com/blog/soc-2-compliance-checklist)
13. [PostgreSQL RLS for Multi-Tenant SaaS — oneuptime](https://oneuptime.com/blog/post/2026-01-25-row-level-security-postgresql/view)
14. [SaaS DPA Guide: GDPR Requirements — Secure Privacy](https://secureprivacy.ai/blog/data-processing-agreements-dpas-for-saas)

---

*آخر تحديث: 2026-06-02 | المُراجِع: فريق الأمن والامتثال*
