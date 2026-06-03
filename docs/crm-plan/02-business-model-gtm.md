# מודל עסקי ואסטרטגיית Go-to-Market

---

## 1. מבנה תמחור

### תוכניות מומלצות (Hybrid Per-Seat Model)

```
┌─────────────────────────────────────────────────────────┐
│  STARTER          PROFESSIONAL        ENTERPRISE        │
│  $18/מושב/חודש    $42/מושב/חודש       $89/מושב/חודש   │
│  (מינ' 1 מושב)    (מינ' 3 מושבים)    (מינ' 10 מושבים) │
│                                                         │
│  שנתי: $15/מושב   שנתי: $35/מושב      שנתי: $74/מושב  │
└─────────────────────────────────────────────────────────┘
```

### מה כוללת כל תוכנית

| פיצ'ר | Starter | Professional | Enterprise |
|---|---|---|---|
| אנשי קשר | 5,000 | 50,000 | ללא הגבלה |
| Pipelines | 3 | ללא הגבלה | ללא הגבלה |
| שדות מותאמים | 10 | ללא הגבלה | ללא הגבלה |
| Email Sequences | — | ✓ | ✓ |
| AI Lead Scoring | — | ✓ | ✓ |
| Workflow Automation | — | 25 | ללא הגבלה |
| דוחות מותאמים | — | ✓ | ✓ |
| Revenue Forecasting | — | ✓ | ✓ |
| Territory Management | — | — | ✓ |
| SSO/SAML | — | — | ✓ |
| תמיכה | קהילה + אימייל 48h | עדיפות 8h + chat | CSM ייעודי + SLA |
| API | 1K/יום | 10K/יום | ללא הגבלה |
| Storage | 5GB | 50GB | ללא הגבלה |

### השוואת מחיר לשוק

| פלטפורמה | Entry | Mid | Enterprise |
|---|---|---|---|
| **Salesforce** | $25 | $175 | $350 |
| **HubSpot** | $20 | $100 | $150 |
| **Pipedrive** | $14 | $34 | $99 |
| **Zoho** | $14 | $23 | $40 |
| **המוצר שלנו** | **$18** | **$42** | **$89** |

**מיצוב:** 20% מעל Pipedrive (מוצדק בפיצ'רים) | 50%+ מתחת ל-HubSpot Professional | 40% מתחת ל-Salesforce

---

## 2. מדיניות ניסיון ל-14 יום

**לא נדרש כרטיס אשראי** - זה המפתח. מפחית friction בהרשמה ב-34%.

### זרימת ה-14 יום

```
יום 0: הרשמה
├── אימות אימייל (magic link, <30 שניות)
├── הגדרת פרופיל חברה (5 שאלות, 2 דקות)
├── ייבוא אנשי קשר (CSV, Gmail, LinkedIn)
├── Pipeline נוצר אוטומטית לפי תעשייה
└── אימייל "Quick Win" נשלח

יום 1: Activation
├── סיור מוצר אינטראקטיבי (ניתן לדילוג)
├── חיבור אימייל (Gmail/Outlook OAuth)
├── הוספת עסקה ראשונה ל-pipeline
├── הזמנת עמית ראשון (sharing prompt)
└── יעד: 3 מתוך 5 פעולות ליבה = "Activated"

ימים 2-3: Value Discovery
├── AI מציע עסקאות בסיכון
├── "Insights available" nudge (מצריך 5+ אנשי קשר)
└── Dashboard מראה ערך pipeline ($X)

ימים 4-7: Habit Formation
├── "CRM Digest" יומי (3 משימות, top deals, follow-ups)
├── Mobile app download prompt (יום 5)
├── Dashboard ראשון נוצר אוטומטית
└── Slack/Teams integration prompt

ימים 8-10: Value Realization
├── מייל "You've contacted X leads this week"
├── השוואת ניסיון vs. תשלום (contextual)
└── Upsell ראשון: "Unlock AI lead scoring"

ימים 11-13: Urgency + Decision
├── "3 days left" banner (לא מפריע)
├── מה קורה לנתונים אחרי הניסיון (נשמרים!)
├── הנחה שנתית + מחשבון חיסכון
└── "Talk to Sales" CTA ל-Professional/Enterprise

יום 14: המרה או הארכה
├── Activated (3+ milestones) → prompt לרכישה
├── Partially activated → הארכה אוטומטית 7 ימים
└── Unactivated → "Save your data" + re-engagement
```

### Activation Score (0-100)

| פעולה | נקודות |
|---|---|
| חיבור אימייל | 25 |
| 5+ אנשי קשר מיובאים | 20 |
| עסקה ראשונה | 20 |
| הזמנת עמית | 20 |
| פעילות ראשונה | 15 |

- **≥60 נקודות** = "Activated" → יעד להמרה
- **<30 נקודות ביום 7** → trigger outreach אנושי

### כלי ה-Lifecycle

**זרם אימיילים בניסיון (7 אימיילים):**

| יום | נושא | מטרה |
|---|---|---|
| 0 | Welcome - ה-CRM שלך חי | CTA אחד: חבר אימייל |
| 1 | טיפ מהיר שסוגר 23% יותר עסקאות | חינוכי, ללא מכירה |
| 3 | איך [חברה דומה] הגיעה ל-$2M pipeline | Social proof |
| 5 | הפיצ'ר שמתחרים שלך משתמשים בו | Discovery feature לא מופעל |
| 7 | סיכום שבוע: מה בנית | מדדים אישיים |
| 10 | 4 ימים נשארו - מה מקבלים בשדרוג | Urgency lite |
| 12 | הנתונים שמורים - לא משנה מה תחליט | Risk reversal |
| 14 | הניסיון מסתיים היום | ROI אישי + CTA |

---

## 3. Go-to-Market

### הלקוח האידיאלי (ICP)

**Primary ICP: Growing SMB Sales Team**
- גודל חברה: 20-200 עובדים
- הכנסה: $2M-$50M ARR
- צוות מכירות: 3-25 נציגים
- כלי נוכחי: Spreadsheets או Pipedrive שגדלו מעבר לו
- תעשיות: B2B SaaS, Digital Agencies, Professional Services, Financial Services
- גאוגרפיה: US, UK, Canada, Australia (English-first)
- Decision maker: VP Sales, Head of Revenue, מייסד/CEO

**סיגנלים לרכישה:**
- מחפש "CRM pricing" או השוואות מתחרים
- פרסום משרות "Sales Operations" / "Revenue Operations"
- גידול ב-headcount (LinkedIn)
- שימוש בכלים ב-ecosystem (HubSpot, Slack, Salesforce)

**Anti-ICP:**
- חברות מתחת ל-5 עובדים
- זקוק ל-ERP integration עמוק
- שווקים לא אנגלים בשנה 1

### ערוצי רכישה - תקציב שנה 1 ($2M)

```
SEO/Content           30% ($600K)
Paid Search (SEM)     25% ($500K)
Product-Led Growth    20% ($400K)
Partnerships          15% ($300K)
Events/Community       7% ($140K)
PR/Brand               3% ($60K)
```

**ערוץ 1: SEO & Content (ארוך טווח, הנמוך CAC)**
- "salesforce alternative for small business" (22K/month, CPC $12)
- "hubspot competitor" (18K/month, CPC $15)
- "best crm for [industry]" - 25 verticals
- "[Competitor] vs [Product]" - 50 comparison pages
- מחשבוני ROI (converts גבוה)

**ערוץ 2: Paid Search (הכנסה מהירה)**
- Competitor branded: "HubSpot pricing", "Salesforce pricing"
- Category: "CRM software", "sales CRM", "pipeline management"
- Retargeting: trial users שלא המירו

**ערוץ 3: Product-Led Growth**
- "Powered by [Product]" ב-email signatures (opt-out)
- Shareable pipeline views + reports
- Deal Rooms ציבוריים (לקוחות רואים את המוצר)
- Referral program: $200 credit להמלצה שהפכה ללקוח

**ערוץ 4: Partnerships**
- QuickBooks, Xero, FreshBooks - הלקוחות שלהם = ה-ICP שלנו
- Stripe Atlas, Mercury - startups שזה עתה נפתחו
- Digital Marketing Agencies: 20% revenue share
- Zapier/Make listing = גישה ל-3M+ SMBs

### Sales Motion

| ACV | מודל | ניסיון |
|---|---|---|
| <$500/שנה | Self-serve מלא | ללא מגע אנושי |
| $500-$5,000/שנה | PLG + Sales-assisted | Growth Advisor |
| $5,000+/שנה | Sales-led | SDR/AE מלא |

**הרכב צוות מכירות שנה 1:**
| תפקיד | מספר | OTE | ARR Target |
|---|---|---|---|
| SDR (Outbound) | 4 | $80K | — |
| Growth Advisor (Inbound) | 4 | $100K | $800K כ"א |
| Account Executive (Enterprise) | 3 | $150K | $1.5M כ"א |
| VP Sales | 1 | $200K | — |

---

## 4. מודל הכנסות

### תחזית MRR/ARR - שנה 1

| חודש | לקוחות חדשים | MRR מצטבר | לקוחות כולל |
|---|---|---|---|
| 1 | 30 | $8,100 | 30 |
| 3 | 80 | $68,000 | 190 |
| 6 | 150 | $220,000 | 650 |
| 9 | 220 | $490,000 | 1,400 |
| 12 | 300 | $820,000 | 2,500 |

**הנחות:**
- ניסיונות: 200/חודש (M1) → 2,000/חודש (M12)
- המרה ניסיון→תשלום: 18-22%
- Mix: 60% Starter / 30% Professional / 10% Enterprise
- ממוצע מושבים: Starter 6, Professional 12, Enterprise 35

### יעדי שנה 2 ו-3

| | שנה 1 | שנה 2 | שנה 3 |
|---|---|---|---|
| ARR | $15.6M | $50M | $126M |
| לקוחות | 2,500 | 7,000 | 18,000 |
| NRR | 110% | 118% | 125% |
| Gross Churn | <28% | <22% | <18% |

---

## 5. הפחתת Churn ו-Expansion Revenue

**יעד: NRR > 115%** - לקוחות קיימים גדלים מהר יותר מה-churn

### Expansion Levers

1. **Seat Expansion (עיקרי)** - tracking utilization + prompt בנקודות גדילה
2. **Tier Upgrades** - feature walls + מייל upgrade רבעוני
3. **Add-Ons (שנה 2+):**
   - AI Credits: $99-$499/month
   - Contact Enrichment: $0.02/contact
   - Extra Storage: $20/month per 50GB
   - Professional Onboarding: $500 one-time
4. **Cross-Sell (שנה 2+):**
   - Marketing Automation module
   - Customer Success module
   - Revenue Intelligence (Gong/Clari alternative)

### מניעת Churn Proactive

**Churn Prediction Signals:**
- ירידת כניסות (<3x/שבוע למשתמש שהיה פעיל)
- עצירת ייבוא אנשי קשר
- pipeline סטגנציה 14+ ימים
- tickets על export data
- בקשה להפחתת מושבים

**Intervention Playbooks:**
- Churn Score >80: CSM outreach תוך 24 שעות
- Score 50-79: מייל אוטומטי + health check wizard
- Score 30-49: מייל feature adoption

---

## 6. מדדי מפתח

### מדדי ניסיון

| מדד | יעד | אזהרה |
|---|---|---|
| ניסיונות/חודש | 1,000+ (M12) | <500 |
| Activation rate | >55% | <35% |
| Day-1 retention | >65% | <45% |
| Trial-to-paid | 18-22% | <12% |
| Median conversion time | <10 ימים | >13 ימים |

### מדדי הכנסות

| מדד | שנה 1 | שנה 2 |
|---|---|---|
| MRR | $1.3M | $4.2M |
| NRR | 110% | 118% |
| Monthly Gross Churn | <3% | <2% |
| Average ACV | $6,300 | $8,400 |
| Expansion MRR % | 15% | 22% |

### Unit Economics (חודש 24)

```
Average ACV:        $8,400
Gross Margin:       78%
CAC (blended):      $380
LTV (36-month):     $16,400
LTV:CAC:            43:1
Payback Period:     8.5 months
```

---

## 7. תמחור שנתי + מבצעים

**הנחה חודשי→שנתי:** 17% (2 חודשים חינם)
- Starter: $18 → $15/חודש שנתי
- Professional: $42 → $35/חודש שנתי
- Enterprise: $89 → $74/חודש שנתי

**אסטרטגיה:** תמיד להציג תמחור שנתי ראשון. לנסח כ-"חסוך $X/שנה" ולא "X% הנחה".

**Multi-year (Enterprise):** הנחה 25% ל-24 חודשים. תלויה בהתחייבות מוקדמת.

---

## 8. דרישות מימון

| שלב | סבב | סכום | שימוש |
|---|---|---|---|
| Pre-launch | Seed | $3M | מוצר, צוות, 6 חודשי runway |
| חודש 6 | Series A | $15M | GTM, צוות מכירות, marketing |
| חודש 18 | Series B | $40M | בינלאומי, modules חדשים |
