# מפת דרכים לפיתוח - Phase 0 עד Launch

**סה"כ:** 42 שבועות | **צוות:** 4-7 מפתחים | **MVP לגביית תשלום:** שבוע 26

---

## החלטות ארכיטקטורה - לפני שבוע 1

### Multi-Tenancy: Pool Model (RLS)

**המלצה: Shared Tables + PostgreSQL Row-Level Security**

```
PostgreSQL RLS: כל שאילתה מוגבלת אוטומטית ל-tenant_id הנוכחי
SET LOCAL app.current_tenant_id = '<uuid>' בתחילת כל request
```

| מודל | יתרון | חסרון | מתאים |
|---|---|---|---|
| Silo (DB נפרד) | בידוד מקסימלי | יקר מאוד, מורכב | Enterprise $200K+ ACV |
| Schema-per-Tenant | בידוד טוב | Prisma לא תומך natively | 50-500 tenants |
| **Pool + RLS** | **עלות נמוכה, מהיר** | **צריך test suite לbידוד** | **SMB→Scale** |

### Stack שנבחר

| שכבה | בחירה | סיבה |
|---|---|---|
| Frontend | Next.js 15 (App Router) | SSR + i18n + marketing site + app |
| UI | shadcn/ui + Tailwind CSS v4 | RTL-ready, no vendor lock-in |
| State | Zustand + TanStack Query v5 | Minimal, server state caching |
| Backend | NestJS v11 + TypeScript | DI, Guards, Interceptors לbידוד tenant |
| ORM | Prisma v6 | Type-safe, migration-first |
| DB | PostgreSQL 17 + RLS | RLS, JSONB, pgvector |
| Cache/Queue | Redis (Upstash) + BullMQ | Serverless, background jobs |
| Auth | JWT (RS256) + Refresh Tokens | Full control, cost at scale |
| Billing | Stripe | Standard industry |
| Email | Resend (transactional) | Developer-first |
| Storage | Cloudflare R2 | No egress fees |
| Monorepo | Turborepo + pnpm workspaces | Shared TypeScript types |

### מבנה Monorepo

```
packages/
  api/          # NestJS backend
  web/          # Next.js frontend
  shared/       # Shared types, Zod schemas
  email/        # React Email templates
  database/     # Prisma schema, migrations, seeds
```

### הרכב צוות מומלץ

**MVP Phase (שבועות 1-26): 4 אנשים**
- Full-Stack Lead (backend-leaning) - ארכיטקטורה, DB, API
- Full-Stack Engineer (frontend-leaning) - UI, State management
- Full-Stack Engineer (integrations) - Billing, background jobs
- Product/Design - UX, wireframes, QA

**Growth Phase (שבועות 27-42): +3 אנשים**
- DevOps/Platform Engineer
- Frontend Engineer (mobile, performance)
- QA Engineer (automation, security)

---

## Phase 0: Foundation & Setup (שבועות 1-2)

### שבוע 1: Repository & Tooling

**Tasks:**
- Initialize Turborepo monorepo עם pnpm workspaces
- TypeScript strict mode על כל הpackages
- ESLint + Prettier + Husky pre-commit hooks
- Commitlint עם Conventional Commits
- Docker + docker-compose לprod-like local dev
- GitHub Actions: CI pipeline (type-check, lint, test, preview deploy)
- Branch protection על main: require PR + status checks

**CI/CD Pipeline:**
```
PR Check:
  1. Lint + Type check
  2. Unit tests (Jest)
  3. Integration tests (Testcontainers)
  4. Tenant isolation tests (critical security tests)
  5. Security scan (Semgrep, GitLeaks)
  6. Docker build + Trivy scan
  7. Preview deployment

Merge to main:
  1. כל checks של PR
  2. Docker push to registry
  3. DB migrations (prisma migrate deploy)
  4. Deploy to staging
  5. Smoke tests

Production (manual approval):
  1. Blue/Green deployment
  2. Traffic shift: 10% → 50% → 100%
  3. Rollback אוטומטי על error rate spike
```

### שבוע 2: Infrastructure

**Tasks:**
- PostgreSQL: Neon.tech (branches לכל PR = DB מבודד לtest)
- Redis: Upstash (serverless, instances נפרדים dev/staging/prod)
- Storage: Cloudflare R2 (CORS מוגדר)
- Prisma schema בסיסי (migration infrastructure בלבד)
- Secret management: Doppler או 1Password Secrets
- Error monitoring: Sentry (frontend + backend מיום 1)
- Logging: Pino structured JSON → Logtail/Axiom
- Domain + SSL: Cloudflare DNS

**Definition of Done:**
- `pnpm dev` מפעיל הכל מקומית
- Sentry מקבל test error מ-frontend + backend
- Upload קובץ מגיע ל-R2 ואפשר לשלוף אותו
- Staging environment נגיש ב-URL אמיתי

---

## Phase 1: Auth & Tenants (שבועות 3-6)

### Schema בסיסי (שבוע 3)

```sql
tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(63) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  subscription_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'trial',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified_at TIMESTAMPTZ,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  accepted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, user_id)
)
```

**PostgreSQL RLS Setup:**
```sql
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON contacts
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Authentication (שבועות 3-4)

**פיתוח מלא ללא Auth0/Clerk:**
- Email/password עם bcrypt (cost factor 12)
- Email verification (magic link, 24h expiry)
- **Access Token:** RS256, 15 דקות expiry, מכיל `{sub, tid, email, roles, plan, jti}`
- **Refresh Token:** Opaque, 7 ימים, HttpOnly Secure cookie, שמור hashed ב-Redis
- Token rotation בכל refresh (token family invalidation על compromise)
- Password reset עם single-use tokens
- Rate limiting: 5 ניסיונות/15 דקות/IP (Redis sliding window)
- Google OAuth אופציונלי (conversion improvement משמעותי)

**TenantContextMiddleware - הMiddleware הכי חשוב:**
```typescript
// רץ על כל request מאומת לפני route handlers
1. Extract JWT מ-Authorization header
2. Verify signature + expiry
3. Extract userId + tenantId
4. Verify membership פעיל (Redis cache, 5 min TTL)
5. Load tenant: check status (trial/active/past_due/canceled)
6. אם past_due/canceled → reject writes עם 402
7. SET LOCAL app.current_tenant_id = tenantId ב-DB session
8. Attach { userId, tenantId, role, tenant } ל-request context
```

### Tenant Provisioning (שבועות 4-5)

**Provisioning אטומי ב-transaction אחד:**
```
1. INSERT tenants (slug = sanitize(companyName))
2. INSERT users
3. INSERT tenant_memberships (role: 'owner')
4. SET trial_ends_at = NOW() + INTERVAL '14 days'
5. COMMIT
------- אחרי commit (BullMQ background job) -------
6. Create default pipeline + 5 stages
7. Send welcome email
8. Create Stripe customer (trial_period_days: 14)
9. Create Typesense collections
```

**Slug Generation:**
```
"Acme Corp" → "acme-corp"
"Acme Corp" (collision) → "acme-corp-4f2a"
```

### RBAC (שבועות 5-6)

| Role | הרשאות |
|---|---|
| `owner` | הכל + billing + delete tenant |
| `admin` | user management + כל ה-CRM data + settings |
| `member` | CRUD על records שבבעלותם + assign |
| `viewer` | Read-only |

**Permission Pattern:** `{resource}:{action}` → `contacts:write`, `deals:delete`  
**NestJS:** `@Permissions('contacts:write')` + `PermissionsGuard`

**Definition of Done:**
- הרשמה, אימות אימייל, כניסה, יציאה עובד
- 2 tenants שונים - כל אחד רואה רק את הנתונים שלו
- ניסיון לגשת לנתוני tenant A מ-tenant B = 403
- Trial expiration חוסם כתיבה

---

## Phase 2: Core CRM Data Model (שבועות 7-12)

### Contacts & Companies Schema (שבועות 7-8)

```sql
contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  owner_id UUID REFERENCES users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  job_title VARCHAR(150),
  company_id UUID REFERENCES companies(id),
  status VARCHAR(50) DEFAULT 'active',
  source VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',  -- schema-less, validated at app layer
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  industry VARCHAR(100),
  size VARCHAR(50),
  website VARCHAR(500),
  address JSONB,
  custom_fields JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}'
)
```

**Indexes חובה:**
```sql
CREATE INDEX contacts_tenant_id_idx ON contacts(tenant_id);
CREATE INDEX contacts_email_idx ON contacts(tenant_id, email);
CREATE INDEX contacts_last_activity_idx ON contacts(tenant_id, last_activity_at DESC);
CREATE INDEX contacts_search_idx ON contacts USING GIN(
  to_tsvector('english', coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(email,''))
);
```

### Custom Fields System (שבוע 9)

**שמירה ב-JSONB + definitions ב-tenant settings:**
```json
{
  "customFields": {
    "contacts": [
      { "id": "cf_linkedin_url", "label": "LinkedIn", "type": "url" },
      { "id": "cf_lead_score", "label": "Lead Score", "type": "number", "min": 0, "max": 100 }
    ]
  }
}
```

### Search & Filter (שבועות 9-10)

**3 שכבות:**
1. **PostgreSQL FTS** - חיפוש שם/אימייל בlist view (ts_rank לרלוונטיות)
2. **Filter Builder** - structured queries עם DSL:
```json
{
  "conditions": [
    {"field": "owner_id", "operator": "eq", "value": "uuid"},
    {"field": "created_at", "operator": "gte", "value": "2025-01-01"},
    {"field": "tags", "operator": "contains_any", "value": ["hot-lead"]}
  ]
}
```
3. **Saved Filters** - named views שמורות per user

### CSV Import/Export (שבועות 10-11)

**Import Pipeline (אסינכרוני חובה!):**
```
1. Upload CSV → S3/R2 (max 10MB)
2. BullMQ job: process async
3. Column mapping (auto-detect + user override)
4. Validation: duplicates, invalid emails, missing required
5. Preview + confirmation
6. Batch INSERT (500 records/batch)
7. Email completion summary
```

### Activity Log (שבועות 11-12)

```sql
activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  type VARCHAR(100) NOT NULL,  -- contact.created, deal.stage_changed, etc.
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW()
)
```

**NestJS EventEmitter2** - business logic מנותק מlogging:
```typescript
// בservice:
this.eventEmitter.emit('contact.created', { contact, actorId });
// בlistener:
@OnEvent('contact.created')
async handleContactCreated(event) { /* write activity */ }
```

**Definition of Done:**
- CRUD על contacts ו-companies
- Filter כל שדה + full-text search <200ms על 50K records
- Import 5K records ב-60 שניות (background)
- Activity log מתעד כל create/update/delete

---

## Phase 3: Sales Pipeline (שבועות 13-18)

### Deal Schema

```sql
pipelines (id, tenant_id, name, is_default)
pipeline_stages (id, pipeline_id, tenant_id, name, position, probability, color, is_won, is_lost)
deals (
  id, tenant_id, pipeline_id, stage_id,
  owner_id, contact_id, company_id,
  name, value DECIMAL(15,2), currency VARCHAR(3),
  probability, expected_close_date, actual_close_date,
  status VARCHAR(50) DEFAULT 'open',  -- open | won | lost
  lost_reason, custom_fields JSONB
)
```

### Kanban Board (שבועות 13-15)

**טכנולוגיה:** `@dnd-kit/core` (react-beautiful-dnd ננטש)
**ביצועים:** Virtual scrolling per column + cursor pagination (לא fetch הכל)
**Optimistic updates:** עדכון UI מיידי, API call ברקע, revert על failure

**Stage Change API:**
```
1. UPDATE stage_id על deal
2. אם won/lost stage: update status + actual_close_date
3. Log activity: deal.stage_changed (עם stage ישן + חדש)
4. UPDATE last_activity_at על contact
5. Emit event (לעתיד: automation rules)
```

**Stage Position:** Fractional indexing (ספריית `fractional-indexing`) - reorder ללא renumbering

### Forecasting (שבועות 15-16)

```sql
-- Materialized view, refresh כל 15 דקות
CREATE MATERIALIZED VIEW pipeline_summary AS
SELECT
  tenant_id, pipeline_id, stage_id, owner_id,
  COUNT(*) as deal_count,
  SUM(value) as total_value,
  SUM(value * probability / 100.0) as weighted_value,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400) as avg_age_days
FROM deals WHERE status = 'open'
GROUP BY tenant_id, pipeline_id, stage_id, owner_id;
```

### Pipeline Reports (שבועות 16-18)

**דוחות חובה:**
1. Pipeline by Stage (bar chart)
2. Deal Velocity (ממוצע ימים לסגירה, funnel drop-off)
3. Forecast vs Actual
4. Win/Loss by Reason
5. Deals by Owner

**Frontend:** Recharts או Tremor (מהירות implementation)  
**Caching:** Redis, TTL 5 דקות, invalidation על deal changes

**Definition of Done:**
- Deal נוצר, מוקצה ל-pipeline + stage
- Drag בין stages עם optimistic update
- Pipeline summary מציג total + weighted value
- Win/loss deal עם capture סיבה
- Reports ב-<2 שניות על 1,000 deals

---

## Phase 4: Communication & Tasks (שבועות 19-22)

### Tasks (שבועות 19-20)

```sql
tasks (
  id, tenant_id, created_by, assigned_to,
  entity_type VARCHAR(50), entity_id UUID,
  title VARCHAR(500), description TEXT,
  type VARCHAR(50) DEFAULT 'task',  -- task | call | meeting | email
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(20) DEFAULT 'medium',  -- low | medium | high | urgent
  due_date TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ
)
```

**Views:** My Tasks (by due date) + All Tasks (admin) + Tasks tab per entity

### Notes (שבוע 20)

**Rich text:** Tiptap + ProseMirror, שמירה כ-JSON + plain text לחיפוש
```sql
notes (id, tenant_id, created_by, entity_type, entity_id, content JSONB, content_text TEXT, is_pinned BOOLEAN)
```

### Email Logging - BCC Approach (שבועות 20-21)

**Phase 4 (quick win):** BCC Logging - אין OAuth, 80% מהערך
- כתובת ייחודית לכל contact: `log+contact-{id}@mail.yourapp.com`
- User מוסיף BCC → Postmark Inbound / AWS SES Receiving
- Parse email → match by From/To → create email_log activity
- **Phase 7:** Gmail/Outlook OAuth מלא

### Notifications & Reminders (שבועות 21-22)

**In-app:** Server-Sent Events (SSE) - פשוט יותר מ-WebSockets לone-directional
**Email:** Task reminders, deal assigned, @mention

**BullMQ delayed jobs:**
```typescript
// עם יצירת task:
await this.queue.add('task-reminder', { taskId }, {
  jobId: `task-reminder-${taskId}-1day`,  // deterministic ID
  delay: dueDate - 1day - now
});
// שינוי due date: cancel ישן, schedule חדש
```

**Definition of Done:**
- Task מוקשר ל-contact, הושלם, מופיע ב-timeline
- Note עם formatting, pinned בראש timeline
- BCC CRM email → מופיע ב-contact timeline תוך 2 דקות
- In-app notification כשtask due

---

## Phase 5: Trial & Billing System (שבועות 23-26)

### Stripe Architecture (שבועות 23-24)

**עקרון:** לא לשמור מידע תשלום. Stripe שומר. שומרים רק IDs.

```sql
ALTER TABLE tenants ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE;
ALTER TABLE tenants ADD COLUMN stripe_subscription_id VARCHAR(255) UNIQUE;
ALTER TABLE tenants ADD COLUMN stripe_price_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN seats_purchased INTEGER DEFAULT 3;
ALTER TABLE tenants ADD COLUMN current_period_end TIMESTAMPTZ;
```

**Stripe Products (להגדיר ב-Stripe Dashboard):**
- Starter: $18/month/seat (annual: $15)
- Professional: $42/month/seat (annual: $35)
- Enterprise: $89/month/seat (annual: $74)

**Stripe Checkout** לתחילת subscription - לא לבנות form מותאם.  
**Stripe Customer Portal** לself-service billing - מקנה עשרות שעות תמיכה.

### Trial Enforcement (שבוע 24)

**3 שכבות בידוד:**

**שכבה 1 - Middleware (API):**
```typescript
if (tenant.status === 'trial' && tenant.trial_ends_at < new Date()) {
  if (request.method !== 'GET') throw new PaymentRequiredException();
}
```

**שכבה 2 - Frontend:**
`/api/tenant/status` polling לאחר כל page load

**שכבה 3 - Stripe Webhooks:**
```typescript
// אירועים לטפל:
'customer.subscription.trial_will_end'  → send upgrade email (3 days before)
'invoice.payment_succeeded'             → update tenant to 'active'
'invoice.payment_failed'               → update to 'past_due', send failure email
'customer.subscription.deleted'        → update to 'canceled', read-only
'customer.subscription.updated'        → sync plan, seats, features
```

**Webhook Idempotency:**
```sql
stripe_events (id VARCHAR(255) PRIMARY KEY, processed_at TIMESTAMPTZ)
-- check לפני עיבוד: אם כבר processed, skip
```

**Grace Period:** 24 שעות אחרי trial expiration לפני block מלא (covers Checkout flow time)

### Plan Feature Gating (שבועות 25-26)

```typescript
const PLAN_FEATURES = {
  starter:      { maxSeats: 5, maxContacts: 5000, apiAccess: false, aiScoring: false },
  professional: { maxSeats: 25, maxContacts: 50000, apiAccess: false, aiScoring: true },
  enterprise:   { maxSeats: Infinity, maxContacts: Infinity, apiAccess: true, aiScoring: true }
};
```

**Usage Counters (Redis):**
```
tenant:{tenantId}:contact_count  → increment/decrement + hourly full recount
tenant:{tenantId}:seat_count     → same
```

### Trial Conversion Flow (שבוע 26)

**5 מסכים חיוניים:**
1. Trial countdown banner (נראה בכל עמוד)
2. Trial expiration page (feature comparison + pricing + CTA)
3. Upgrade modal (contextual - feature gate hit)
4. Onboarding checklist (tracks key actions)
5. Day 7 + Day 12 automated emails

**Nightly Reconciliation Job:** מסנכרן עם Stripe על כל subscriptions → backup לwebhooks

**Definition of Done:**
- Tenant חדש מקבל 14 ימים מדויקים
- Trial expiration חוסם writes, reads עובד
- Stripe Checkout → מנוי → גישה מיידית
- Webhook payment failure → past_due
- Nightly reconciliation רץ ומתעד discrepancies

---

## Phase 6: Reporting & Analytics (שבועות 27-30)

### Dashboard System (שבועות 27-28)

**Default Dashboard Widgets:**
- הכנסה won החודש (vs חודש קודם, % שינוי)
- Pipeline value per stage (bar chart)
- Activities השבוע by type
- Tasks overdue (count + link)
- Deals closing this month (list)
- Recent contacts (list)

**Dashboard Config per User:**
```sql
user_dashboard_configs (user_id, tenant_id, config JSONB)
```

**אסטרטגיה:** API endpoints ייעודיים לכל widget עם data pre-aggregated. לעולם לא לאפשר לfrontend לאגד מ-endpoints מרובים.

### Custom Report Builder (שבועות 29-30)

**סוגי דוחות:**
1. Contact list reports (filters + columns)
2. Deal reports (group by owner/stage/month)
3. Activity reports (calls/emails/meetings by user + date)
4. Funnel reports (deals entering/exiting stages per period)

**Report Config:**
```json
{
  "type": "deals",
  "dateRange": { "start": "2026-01-01", "end": "2026-12-31" },
  "filters": [{ "field": "stage_id", "op": "eq", "value": "uuid" }],
  "groupBy": "owner_id",
  "metrics": ["count", "sum_value"],
  "sort": "sum_value DESC"
}
```

**Scheduled Reports:** BullMQ repeating job → generate CSV → email attachment

**Definition of Done:**
- Default dashboard loads <2 שניות
- Custom deal report by owner + close date, grouped by stage
- Schedule weekly email delivery
- Export כל דוח ל-CSV

---

## Phase 7: Integrations & Public API (שבועות 31-36)

### Public REST API (שבועות 31-32)

**Versioning:** `/api/v1/` מיום 1. Breaking changes = `/v2/`.

**API Keys:**
```sql
api_keys (tenant_id, name, key_hash, key_prefix VARCHAR(10), scopes TEXT[], last_used_at, expires_at)
```
Format: `crm_live_` + 32 random bytes hex. שמור רק hash. מציג full key פעם אחת.

**Rate Limits (Kong Gateway):**
- Starter: 100 req/minute
- Professional: 1,000 req/minute
- Enterprise: 10,000 req/minute

**Swagger/OpenAPI** מ-NestJS decorators → `/api/docs`

### Webhook System (שבועות 32-33)

```sql
webhook_endpoints (tenant_id, url, events TEXT[], secret, is_active)
webhook_deliveries (endpoint_id, event_type, payload JSONB, status, attempt_count, next_attempt_at)
```

**Delivery + Retry:**
- BullMQ exponential backoff: 1 דקה → 10 דקות → שעה → 24 שעות
- 5 כשלונות → disable endpoint + notify admin
- HMAC-SHA256 signature ב-`X-CRM-Signature` header

### Gmail Integration (שבועות 33-34)

**OAuth 2.0 - scopes נדרשים:** Gmail.readonly + Gmail.send  
**⚠️ Google verification process: 4-6 שבועות - submit בתחילת Phase 7!**

**Sync Strategy:**
- BullMQ cron: כל 10 דקות per connected account
- Gmail History API לincremental sync (לא full resync)
- Match emails לcontacts by address → create email activity
- Tokens: AES-256-GCM encrypted at rest

### Outlook / Microsoft 365 (שבועות 34-35)

**Microsoft Graph API** עם MSAL  
**Microsoft Graph Subscriptions** (push webhooks) - יעיל יותר מpolling

### Zapier Integration (שבועות 35-36)

**Triggers:** contact.created, deal.stage_changed, deal.won, deal.lost, task.completed  
**Actions:** create contact, update contact, create deal, create task, add note  
**⚠️ Zapier review process: 2-4 שבועות - submit מוקדם!**

**Definition of Done:**
- API key → curl לread contacts עובד
- Webhook fires <30 שניות אחרי contact.created
- Gmail sync מציג email history ב-contact timeline
- Simple Zapier zap: Google Form → CRM Contact

---

## Phase 8: Polish, Performance & Launch (שבועות 37-42)

### Performance Optimization (שבועות 37-38)

**מדידה לפני אופטימיזציה! P95 latency לכל endpoint.**

**DB:**
- `EXPLAIN ANALYZE` על השאילתות הכי איטיות
- Composite indexes חסרים
- N+1 queries (שכיח ב-NestJS relations)
- Materialized views לComplex GROUP BY

**Frontend:**
- Code splitting per page
- React.memo + useMemo (profiling-based only)
- `@tanstack/react-virtual` לlong lists
- Next.js Image component everywhere

**Caching:**
- Tenant settings + pipeline stages: 60s TTL
- User permissions: 30s TTL
- Report results: 10 min TTL

### Mobile Responsiveness (שבועות 38-39)

**יעד:** Contact detail + Task list = fully usable on mobile  
**Kanban:** list view במקום Kanban על small screens  
**Testing:** BrowserStack על devices אמיתיים

### Security Audit (שבועות 39-40)

**Self-Audit Checklist:**
- [ ] Parameterized queries everywhere (SQL injection)
- [ ] No `dangerouslySetInnerHTML` unescaped (XSS)
- [ ] Webhook URL validation (SSRF)
- [ ] Cross-tenant isolation tests: GET tenant A data as tenant B → 404
- [ ] API keys hashed, never logged
- [ ] No secrets in code (GitLeaks scan)
- [ ] Rate limiting non-bypassable
- [ ] bcrypt cost factor 12
- [ ] Security headers (target A on securityheaders.com)
- [ ] GDPR: data deletion works end-to-end

**External Penetration Test:**  
חברת pentesting ייעודית, 3 ימים, $5,000-15,000. לא אופציונלי.  
**לתזמן בשבוע 38** כדי שיהיה זמן לתיקונים.

### Load Testing (שבוע 40)

**SLOs:**
- P95 API response <500ms ב-100 concurrent users/tenant
- 50 tenants בו-זמנית, 100 users כל אחד = יציב
- DB connections <80% max pool

**k6 Scenarios:**
1. CRM daily usage (login, browse, open contact, create task)
2. Bulk import (10 concurrent CSVs × 5K records)
3. Report generation (10 concurrent complex queries)

### Beta Program (שבועות 37-41)

**20-50 חברות בו-זמנית עם Phase 8:**
- SMBs עם 3-15 salespeople
- Spreadsheets או Pipedrive שגדלו מעבר לו
- 3 חודשים חינם → feedback שבועי

**Feedback Loop:**
- שיחות 30 דקות שבועיות עם 3-4 בטאיסטים
- In-app feedback widget (Canny/Productboard)
- Sentry: errors מיידי לפני דיווח
- PostHog: analytics על onboarding drop-off

### Production Launch (שבועות 41-42)

**Pre-Launch Checklist:**
- [ ] Stripe production mode (לא test mode!)
- [ ] כל env vars = production values
- [ ] DB backups אוטומטיות + tested (restore <1 שעה?)
- [ ] Alerting: error rate >1% או P95 >2s = page on-call
- [ ] Status page (Instatus/Statuspage.io)
- [ ] Terms of Service + Privacy Policy (lawyer-reviewed)
- [ ] GDPR: DPA available, data deletion tested
- [ ] Support channel (Intercom/Crisp)
- [ ] Help documentation: 20 most common questions
- [ ] Security headers A-rating

**Launch Sequence:**
1. Enable Stripe production for existing beta tenants
2. Remove "Beta" branding
3. Soft launch: IndieHackers, Hacker News Show HN, Product Hunt
4. Product Hunt: Tuesday-Thursday, prepare assets in advance

---

## MVP Definition (שבועות 1-26 = מוצר שגובה כסף)

**המינימום הדרוש לתשלום:**
1. Tenant registration + email verification
2. Invite team members (עד plan limit)
3. Contacts CRUD + search + basic filters
4. Companies CRUD + contact associations
5. Deals עם single customizable pipeline
6. Basic tasks tied to contacts/deals
7. Activity log
8. 14-day trial + middleware enforcement
9. Stripe Checkout לsubscription
10. 3 plan tiers עם feature gates

**הכל מעבר לזה = post-launch:**
Gmail integration, custom reports, Zapier, public API

---

## Timeline Summary

| Phase | שבועות | Deliverable |
|---|---|---|
| 0: Foundation | 1-2 | Monorepo, CI/CD, Infrastructure |
| 1: Auth & Tenants | 3-6 | הרשמה, JWT, RLS, RBAC |
| 2: Core CRM | 7-12 | Contacts, Companies, Import, Activity Log |
| 3: Pipeline | 13-18 | Deals, Kanban, Forecasting, Reports |
| 4: Comms & Tasks | 19-22 | Tasks, Notes, BCC Email, Notifications |
| **5: Billing** | **23-26** | **Stripe, Trial, Plans → MVP מוכן לתשלום** |
| 6: Reporting | 27-30 | Dashboard, Report Builder |
| 7: Integrations | 31-36 | API, Webhooks, Gmail, Zapier |
| 8: Launch | 37-42 | Security, Load Test, Beta → Launch |

---

## Quick Wins לבניה מהירה (בנוסף לPhases)

| פיצ'ר | זמן בנייה | Impact |
|---|---|---|
| Chrome Extension (LinkedIn → Contact) | 2 שבועות | activation גבוה |
| Email Templates with merge fields | 1 שבוע | שימוש יומיומי |
| Bulk operations על contact list | 1 שבוע | productivity |
| Duplicate detection + merge | 1.5 שבועות | data quality |
| Contact enrichment (Clearbit/Apollo) | 1 שבוע | aha moment מהיר |

---

## קבצים קריטיים ליישום

```
packages/database/prisma/schema.prisma        ← הschema המרכזי, בסיס הכל
packages/api/src/common/middleware/
  tenant-context.middleware.ts                ← הMiddleware הכי חשוב (בידוד + billing)
packages/api/src/billing/webhook.controller.ts ← Stripe webhooks (idempotent!)
packages/api/src/common/guards/roles.guard.ts  ← RBAC enforcement
packages/shared/src/types/tenant.types.ts      ← Shared types (frontend + backend)
```
