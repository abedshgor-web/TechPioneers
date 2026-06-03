# תוכנית מלאה לבניית מערכת CRM תחרותית
## מסמך אסטרטגי - סיכום מנהלים

**תאריך:** יוני 2026  
**גרסה:** 1.0  
**סטטוס:** מאושר לביצוע

---

## חזון המוצר

בנייה של מערכת CRM רב-שוכרתית (Multi-Tenant SaaS) שתתחרה עם Salesforce, HubSpot ו-Pipedrive. המערכת מיועדת ללקוחות עסקיים (B2B), כאשר כל עסק מקבל Tenant מבודד. הגישה: **עוצמת Salesforce + פשטות Pipedrive + תמחור הוגן.**

---

## עמדת התחרות

| מתחרה | נקודת חולשה | ההזדמנות שלנו |
|---|---|---|
| **Salesforce** | $175-350/משתמש, 6-18 חודשי יישום, admin ייעודי | 80% מהפיצ'רים ב-40% מהמחיר, יישום תוך יום |
| **HubSpot** | Hub soup - 4 מוצרים נפרדים, מחיר מנפח | כל הפלטפורמה במחיר אחד שקוף |
| **Pipedrive** | תקרה זכוכית ל-30+ נציגים, אין AI | pipeline מושלם + AI + אוטומציה |

**הצעת ערך ייחודית:** "ה-CRM היחיד שגדל איתך מ-Startup ועד Mid-Market - בלי rebuild"

---

## מודל עסקי

| תוכנית | מחיר | משתמשים | אנשי קשר |
|---|---|---|---|
| **Starter** | $18/מושב/חודש | עד 5 | עד 5,000 |
| **Professional** | $42/מושב/חודש | עד 25 | עד 50,000 |
| **Enterprise** | $89/מושב/חודש | ללא הגבלה | ללא הגבלה |

- **ניסיון חינם:** 14 יום, ללא כרטיס אשראי
- **הנחה שנתית:** 17% (2 חודשים חינם)
- **יעד המרה ניסיון→תשלום:** 18-22%

---

## יעדי הכנסות

| שנה | לקוחות | MRR | ARR |
|---|---|---|---|
| שנה 1 | 2,500 | $1.3M | $15.6M |
| שנה 2 | 7,000 | $4.2M | $50M |
| שנה 3 | 18,000 | $10.5M | $126M |

---

## ארכיטקטורה טכנית - עיקרים

**Stack:**
- Frontend: Next.js 15 + shadcn/ui + Tailwind CSS
- Backend: NestJS + TypeScript + Prisma
- Database: PostgreSQL 17 + Row-Level Security (בידוד בין Tenants)
- Cache/Queue: Redis (Upstash) + BullMQ
- Infrastructure: Vercel (Frontend) + Railway/Render (Backend) → AWS EKS בסקייל

**אסטרטגיית Multi-Tenancy:**  
Pool Model - PostgreSQL Row-Level Security על כל טבלה. כל שאילתה מוגבלת אוטומטית ל-Tenant הנוכחי ברמת ה-DB engine. עוצמה עם עלות תפעולית נמוכה.

---

## מפת דרכים - 42 שבועות לשוק

| שלב | שבועות | מה נבנה |
|---|---|---|
| **Phase 0:** Foundation | 1-2 | Monorepo, CI/CD, Infrastructure |
| **Phase 1:** Auth & Tenants | 3-6 | הרשמה, הזדהות, RLS, RBAC |
| **Phase 2:** Core CRM | 7-12 | אנשי קשר, חברות, שדות מותאמים, ייבוא |
| **Phase 3:** Pipeline | 13-18 | עסקאות, Kanban, תחזיות, דוחות |
| **Phase 4:** Tasks & Email | 19-22 | משימות, הערות, רישום אימיילים |
| **Phase 5:** Billing | 23-26 | Stripe, ניסיון 14 יום, מנויים |
| **Phase 6:** Reporting | 27-30 | דשבורד, בונה דוחות, ניתוח |
| **Phase 7:** Integrations | 31-36 | API ציבורי, Webhooks, Gmail, Zapier |
| **Phase 8:** Launch | 37-42 | אבטחה, ביצועים, Beta, Launch |

**MVP לגביית תשלום:** שלבים 0-5 = שבוע 26

---

## הרכב צוות מומלץ

**MVP (שבועות 1-26): 4 אנשים**
- Full-Stack Lead (Backend-leaning) - ארכיטקטורה, DB, API
- Full-Stack Engineer (Frontend-leaning) - UI, State management
- Full-Stack Engineer (Integrations) - Billing, jobs, integrations
- Product/Design - UX, wireframes, QA

**Post-MVP (שבועות 27-42): +3 אנשים**
- DevOps/Platform Engineer
- Frontend Engineer (נייד, ביצועים)
- QA Engineer (אוטומציה, אבטחה)

---

## מסמכים בתוכנית זו

| # | מסמך | תוכן |
|---|---|---|
| [01](./01-competitive-analysis.md) | ניתוח מתחרים | פיצ'רים, תמחור, חולשות, הזדמנויות |
| [02](./02-business-model-gtm.md) | מודל עסקי ו-GTM | תמחור, אסטרטגיית מכירות, מדדים |
| [03](./03-development-roadmap.md) | מפת דרכים טכנית | 8 שלבים, Phase 0 עד Launch |
| [04](./04-technical-architecture.md) | ארכיטקטורה טכנית | Stack, Multi-tenancy, Security |
| [05](./05-security-and-compliance.md) | אבטחה ו-Compliance | GDPR, SOC2, Rate Limiting |
