# RAVA UI — Codex Visual Implementation Brief

## SOURCE OF TRUTH
The visual reference image `rava-ui-reference.jpg` is the primary visual target for the next website/platform UI pass.

Codex must NOT treat it as loose inspiration. Reproduce its visual language, hierarchy, proportions, section rhythm, density, and RTL behavior as closely as practical within the existing codebase.

Do not redesign the product from scratch. First map the reference onto the existing architecture.

---

## 1) PRODUCT CONTEXT
RAVA is a Persian-first website-building and website-management platform.

The design must support two related but distinct surfaces:
1. Marketing website / landing pages
2. Product dashboard / admin platform

Both belong to one visual family.

Primary language: Persian / RTL.
English is secondary and must remain possible without breaking layout.

---

## 2) VISUAL DIRECTION

### Core
- Modern SaaS product
- Premium but not luxury
- Clean, high-trust, mature
- Persian-first / RTL
- Deep navy + white
- Burgundy/red used as controlled accent
- Subtle gradients only where they support depth
- Soft borders and restrained shadows
- Rounded cards, but not overly playful
- Strong spacing and hierarchy
- No generic stock-corporate visual language

### Brand colors
- Deep Navy: #071426
- Navy: #0B1F3A
- Navy Surface: #142C4D
- Burgundy Accent: #5A0F1F
- White: #FFFFFF
- Light Surface: #F6F7F9
- Border: #D9DEE5
- Muted Text: #6B7280
- Ink: #111827

Burgundy is an accent. It must not become a second dominant background color.

---

## 3) LANDING PAGE — REQUIRED STRUCTURE

### Header
- Dark navy header
- RAVA logo on the left in LTR visual balance, while Persian nav reads RTL
- Main Persian navigation
- Login secondary action
- Primary CTA in burgundy
- Clean, compact, premium spacing

### Hero
Match reference closely:
- Dark navy hero
- Large Persian headline
- Key word/phrase highlighted in burgundy
- Supporting Persian copy underneath
- Primary CTA: burgundy
- Secondary CTA: outlined/dark
- Product/dashboard visual mockup occupying a large part of hero
- Thin RAVA corner/signature detail
- Small product metrics/trust strip near bottom of hero

Suggested headline:
«سایتت را بساز.
مدیریت کن. رشد بده.»

Supporting copy should clearly describe:
RAVA as a platform for building, launching, managing and growing websites and digital businesses.

### Feature grid
Light background.
Six feature cards, approximately:
- سازنده سایت پیشرفته
- مدیریت محتوا
- فروشگاه آنلاین
- سئو و تحلیل
- امنیت و سرعت
- اتصال و توسعه

Each card:
- minimal icon
- clear title
- short description
- white card
- subtle border/shadow
- generous whitespace

### Why RAVA
A clean row/grid focused on business reasons:
- بدون نیاز به کدنویسی
- انعطاف‌پذیر و مقیاس‌پذیر
- صرفه‌جویی در زمان و هزینه
- پشتیبانی واقعی

### Templates
Horizontal / grid section inspired by reference:
- category filters
- template preview cards
- Persian titles
- prices/plans only if existing product model supports them
- CTA to view all templates

Do not invent ecommerce/pricing data that does not exist in the product.

---

## 4) MOBILE LANDING
Do not simply shrink desktop.

Required:
- RTL mobile hierarchy
- compact header + menu
- hero copy remains dominant
- dashboard/product mockup follows headline
- CTA buttons full/near-full width where appropriate
- feature cards stack cleanly
- no tiny text
- preserve navy/white/burgundy rhythm

Reference mobile proportion and density closely.

---

## 5) PRODUCT DASHBOARD — REQUIRED VISUAL LANGUAGE

The reference dashboard is a strong target.

### Layout
- RTL sidebar on the right
- light main workspace
- top utility/search bar
- user/avatar area
- notification/status controls
- clear page title and breadcrumb/subtitle

### Sidebar items may include
Only map items that actually exist in the repository/product:
- داشبورد
- سایت‌ها
- محتوا
- رسانه
- فروشگاه
- کاربران
- سفارش‌ها
- تحلیل و گزارش‌ها
- بازاریابی
- تنظیمات
- راهنما و پشتیبانی

Do NOT fabricate backend features. If a visual section has no real feature yet, create a safe presentational placeholder only if approved by existing architecture.

### Dashboard cards
Reference style:
- 4 KPI cards on top
- white cards
- small icons
- large numeric value
- compact trend/status line

### Analytics
- large line chart card
- timeframe tabs
- restrained blue/navy chart styling
- no rainbow colors

### Recent activity
- structured activity list
- small contextual icons
- timestamps/statuses

### Sites / storage
- recent/active sites card
- storage usage/progress card
- clean numeric hierarchy

---

## 6) TYPOGRAPHY / RTL

Persian typography is first-class, not translated after layout.

Requirements:
- `dir="rtl"` for Persian surfaces
- semantic RTL-aware spacing (logical properties preferred)
- no manual left/right hacks where `margin-inline`, `padding-inline`, `inset-inline` can be used
- Persian body text comfortable and readable
- large Persian hero headings must have custom line-height and tracking suitable for Persian
- avoid Latin letter-spacing values on Persian text
- use IRANYekanX only if legally available in project
- otherwise use an approved/open project fallback such as Vazirmatn
- never redistribute proprietary font binaries

English mode should be able to switch to LTR cleanly.

---

## 7) COMPONENT SYSTEM

Codex should implement reusable components/tokens, not page-specific one-off CSS.

At minimum:
- Header
- Mobile navigation
- PrimaryButton
- SecondaryButton
- FeatureCard
- MetricCard
- TemplateCard
- DashboardSidebar
- DashboardTopbar
- StatCard
- ChartCard
- ActivityList
- ProgressCard
- SectionHeading
- RavaCorner

Use existing design-system conventions if the repo already has equivalent components.

---

## 8) VISUAL DETAILS TO MATCH

Match these qualities from the reference:
- overall whitespace
- relative proportions
- hero darkness and contrast
- red accent placement
- card corner radius
- subtle card borders
- dashboard density
- RTL sidebar placement
- typography hierarchy
- visual balance between text and product mockup
- premium SaaS cleanliness

Do not copy accidental/generated text from the reference image literally.
Use correct Persian product copy and real project capabilities.

---

## 9) DO NOT DO

- No generic tech waves as primary decoration
- No excessive glow/neon
- No random royal-blue brand color
- No glassmorphism everywhere
- No extreme gradients
- No fake metrics presented as real customer claims
- No stock skyscraper imagery
- No excessive icons
- No overly rounded playful UI
- No English-first layout translated into Persian afterward
- No backend/API/schema changes solely to satisfy visual mockup
- No deploy/migration until requested

---

## 10) IMPLEMENTATION PROCESS

Before editing:
1. Read `AGENTS.md` if present. If it is absent, report that fact instead of inventing rules.
2. Inspect current frontend architecture.
3. Inspect existing pages/components/tokens.
4. Compare current UI to `rava-ui-reference.jpg`.
5. Report:
   - what can be reused
   - what conflicts
   - components to modify/create
   - route/page impact
   - risks
   - phased implementation plan

Then wait for approval before broad changes if instructed by the user.

When implementation is approved:
Phase 1 — tokens, typography, RTL foundations
Phase 2 — shared components
Phase 3 — marketing homepage
Phase 4 — dashboard shell and dashboard components
Phase 5 — responsive/mobile refinement
Phase 6 — accessibility and visual QA

---

## 11) ACCEPTANCE CHECKLIST

The result is accepted only if:
- Persian UI feels native and intentional
- desktop visual direction is recognizably close to the reference
- mobile is independently composed and polished
- dashboard is clearly part of the same RAVA family
- navy/white remain dominant
- burgundy remains controlled
- components are reusable
- RTL is implemented structurally
- existing functionality is preserved
- no invented production data is presented as factual
- no unnecessary backend changes are introduced
- visual hierarchy remains strong at 390px, 768px, 1024px, 1440px+

---

## 12) REFERENCE PRIORITY
When conflicts occur:
1. Existing functional requirements and repository architecture
2. This implementation brief
3. `rava-ui-reference.jpg` visual target
4. Existing brand tokens
5. Codex implementation preference

If a conflict materially changes the visual target, report it before broad redesign.
