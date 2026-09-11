# RAVA Growth Engine — Zero-Cost Traffic & Monetization Execution Plan

## Status

- **Owner:** Mohammad Ghasemi / RAVA TEAM
- **Repository:** `mohamadghasemi23/rava-team-website`
- **Branch:** `agent/platform-core-foundation`
- **Related issue:** `#3 — Growth Engine v1 — zero-cost calculator traffic path`
- **Language rule:** Product/admin explanations may be Persian; public Growth Engine v1 is English-first. Technical identifiers remain English.
- **Primary business objective:** create the lowest-cost credible path from RAVA Platform to durable international organic search traffic and future dollar-denominated monetization.
- **Revenue expectation:** five months is a target window for meaningful traction and a monetizable audience, never a ranking or revenue guarantee.

---

# 1. Priority decision

RAVA has two important workstreams:

1. the current services-first Customer Zero/template path;
2. the new Growth Engine traffic/monetization path.

The priority policy is:

## Priority 0 — close the current services slice safely

Do **not** abandon or corrupt the currently active services-template work. Before changing implementation focus, the current approved/reviewable services slice must reach the smallest safe handoff state available in the repository workflow: relevant code preserved, Build/type/feature gates passing where applicable, and no accidental Production/DNS action.

This is a **closure gate**, not an instruction to spend unlimited time polishing the services template before Growth Engine work can begin.

## Priority 1 — Growth Engine immediately after that closure gate

Once the current services slice is safely preserved, **Growth Engine becomes the primary new product-development priority** because it directly serves the owner's urgent business objective: build organic traffic, create a monetizable audience, and create reusable growth infrastructure inside RAVA.

The services product remains strategically important and must continue later, but it must not indefinitely block a low-cost traffic asset that can compound over time.

## Priority 2 — services commercialization continuation

After Growth Engine v1 is publicly launchable and measurement is live, continue the services-first commercial path in parallel with data-driven Growth Engine iteration.

### Resource rule

When engineering capacity conflicts:

- preserve working services code;
- prioritize launch-critical Growth Engine work over non-essential visual polish;
- prioritize search utility, speed, measurement and publishability over decorative features;
- never block a traffic experiment on paid tooling that is not essential.

---

# 2. Non-negotiable cost boundary

Growth Engine v1 must be buildable with the owner's current budget:

- ChatGPT Plus / Codex access already available;
- one VPS / existing RAVA self-hosted infrastructure;
- eventually one appropriate domain;
- **no paid API**;
- **no paid AI runtime**;
- **no paid SEO SaaS dependency**;
- **no paid analytics SaaS dependency**;
- **no paid managed database dependency**;
- **no paid image-processing API**;
- avoid new runtime dependencies unless they clearly reduce total complexity/cost and fit the disk/performance budget.

Client-side calculations are preferred whenever practical so calculator usage does not create per-request compute/API cost.

If a proposed feature requires recurring third-party spend, Codex must stop and classify it as **deferred / post-revenue**, not silently introduce it.

---

# 3. Product positioning

Working product name: **RAVA Metrics**.

Public positioning:

> Free practical calculators for marketers, creators and online sellers. Turn numbers into better decisions.

V1 topical authority:

- Marketing metrics
- Profitability / unit economics
- Ecommerce profitability
- limited Creator metrics only where they strengthen the same business-growth intent

Do **not** launch as a generic “1000 free tools” directory.

The first objective is topical depth and utility, not page count.

---

# 4. Approved visual direction

The owner approved the current RAVA Metrics desktop visual direction on 2026-09-05.

Key visual characteristics that implementation must preserve:

- bright, lightweight SaaS/tool aesthetic;
- white/light-blue background system;
- dark navy typography with restrained blue accents;
- tool-first hero rather than a corporate-marketing hero;
- calculator visible above the fold on desktop;
- clear headline: **Turn numbers into better decisions.**
- visible trust/value cues: free, private/browser-side, built for growth;
- category cards for Marketing, Profitability, Ecommerce and Creator;
- Popular Calculators section;
- benefits/insight section;
- Latest Guides section for SEO/content support;
- dark information-rich footer;
- clean grid, rounded cards, subtle borders/shadows, minimal decorative motion.

## Visual authority rule

Before user-facing implementation, the exact approved desktop visual and a separately approved mobile adaptation must be preserved in repository-owned design evidence and treated as visual authority.

Codex must **not** reinterpret, redesign, simplify, restyle or “improve” the owner-approved composition without another owner approval.

Post-implementation browser captures must be compared with approved previews before visual acceptance.

---

# 5. V1 public information architecture

Recommended public structure:

```text
/
/calculators/
/calculators/marketing/
/calculators/profitability/
/calculators/ecommerce/
/calculators/creator/
/calculators/break-even-roas-calculator/
/calculators/cac-calculator/
/calculators/ad-profit-calculator/
/calculators/contribution-margin-calculator/
/calculators/profit-per-order-calculator/
/guides/
/guides/<guide-slug>/
/about/
/contact/
/privacy/
/terms/
/sitemap.xml
/robots.txt
```

Avoid query-string-only public tool URLs such as `?tool=34` for canonical calculator pages.

---

# 6. First five launch tools

V1 launch cluster:

1. **Break-even ROAS Calculator**
2. **Customer Acquisition Cost (CAC) Calculator**
3. **Ad Profit Calculator**
4. **Contribution Margin Calculator**
5. **Profit Per Order Calculator**

Follow-on candidates after live Search Console/query evidence:

- ROAS Calculator
- Conversion Rate Calculator
- Commission Calculator
- Engagement Rate Calculator
- Aspect Ratio Calculator

Do not mass-generate dozens of tools before live data indicates which cluster deserves expansion.

---

# 7. Calculator Engine architecture

Do not build five unrelated one-off pages.

Create a reusable **Calculator / Tool Engine** compatible with RAVA's multi-tenant platform architecture.

Conceptual tool definition:

```ts
interface ToolDefinition {
  id: string
  slug: string
  version: number
  status: 'draft' | 'published' | 'archived'
  category: ToolCategory
  locale: string
  name: string
  shortDescription: string
  inputs: ToolInputDefinition[]
  outputs: ToolOutputDefinition[]
  calculationKey: string
  interpretationKey?: string
  content: ToolContentDefinition
  seo: ToolSeoDefinition
  relatedToolIds: string[]
  analyticsKey: string
}
```

The final contract may differ based on existing RAVA architecture, but it must support these capabilities:

- versionable definitions;
- localized labels/content;
- validated typed inputs;
- deterministic calculation logic;
- multiple outputs/result breakdowns;
- explanatory interpretation;
- SEO metadata;
- FAQ/content blocks;
- related-tool graph;
- analytics event key;
- future permission/entitlement/module integration;
- future public API compatibility.

### Security boundary

Do not execute arbitrary formulas supplied by untrusted clients using `eval`, `Function`, dynamic code execution or equivalent unsafe mechanisms.

Prefer an allowlisted calculation registry / typed calculator functions.

---

# 8. Break-even ROAS v1 functional contract

Initial inputs:

- Selling Price
- Product Cost
- Shipping Cost
- Payment Fee
- Other Variable Costs
- Target Profit (optional)

Initial outputs:

- Total Variable Cost
- Contribution Amount
- Contribution Margin %
- Maximum Ad Spend at break-even / target profit
- Break-even ROAS
- plain-English interpretation

Validation:

- reject NaN/Infinity;
- safe numeric bounds;
- selling price must be positive;
- costs must not be silently converted from invalid text;
- impossible/undefined states must return a clear user-safe message;
- no raw stack trace or internal error leakage.

Privacy:

- calculator input values are not stored by default;
- analytics events record tool/action metadata, not private financial input values.

---

# 9. Required structure of every calculator page

A calculator page is not complete if it is only an input box and answer.

Required structure:

1. breadcrumb
2. H1
3. concise intent/value explanation
4. calculator UI
5. result summary
6. result breakdown
7. plain-English interpretation
8. formula explanation
9. worked example
10. practical guidance / how to use or improve the metric where appropriate
11. FAQ
12. related calculators
13. contextual guide links
14. legal/privacy note only where useful, without clutter

Content must be genuinely useful and specific to the tool. Avoid thin templated filler.

---

# 10. Technical SEO baseline

Every public tool/guide must support, as applicable:

- unique server-rendered title;
- unique meta description;
- canonical URL;
- Open Graph metadata;
- index/follow control;
- clean slug;
- semantic H1/H2 hierarchy;
- breadcrumb markup;
- useful structured data only when compliant with current search-engine guidance;
- sitemap inclusion;
- robots handling;
- fast server response/static rendering strategy where architecture permits;
- internal links to relevant category/tool/guide pages;
- no accidental duplicate indexable URLs;
- correct 404 behavior;
- accessible link/button semantics.

Do not claim or guarantee rankings.

### Search-first content rule

Create content around actual user intent and calculator utility, not keyword stuffing. Guides should strengthen tool clusters and answer adjacent questions.

---

# 11. Performance budget

The public calculator path must be intentionally lightweight.

V1 priorities:

- useful content available without heavy client JavaScript where possible;
- calculator interactivity hydrates only what is needed;
- avoid WebGL, continuous animation loops and unnecessary carousels;
- optimize fonts/assets;
- avoid oversized hero imagery;
- reserve layout space to reduce CLS;
- mobile-first responsiveness;
- no runtime dependency that creates recurring per-use cost.

Performance is a traffic and conversion feature, not cosmetic cleanup.

---

# 12. Analytics & Growth foundation

RAVA Admin must gain a reusable, site-scoped **Analytics & Growth** area.

It must evolve in two stages.

## Stage A — first-party, zero-cost product analytics

Collect privacy-conscious events such as:

- `tool_view`
- `calculation_started`
- `calculation_completed`
- `related_tool_clicked`
- `guide_clicked`
- `category_clicked`

Event design requirements:

- derive trusted site/tenant scope server-side;
- do not trust client-submitted privileged tenant identity;
- do not store calculator financial inputs by default;
- do not store secrets/tokens;
- apply reasonable retention/aggregation strategy;
- remain compatible with self-hosted PostgreSQL;
- remain API-ready.

Initial Admin metrics:

- tool/page views;
- completed calculations;
- completion rate;
- related-tool click-through;
- top tools;
- growing/declining tools;
- source/referrer where safely available;
- device/category summaries where privacy and implementation cost permit.

## Stage B — Search Console integration

After a real public domain is verified and compliant Google credentials/configuration exist, integrate real Search Console data.

Required metrics:

- clicks;
- impressions;
- CTR;
- average position;
- page/query/date dimensions as allowed by the integration.

Never fabricate Search Console data.

If credentials do not exist, Admin should clearly show the integration as **not connected**, not fake charts.

---

# 13. Growth Opportunities engine

Analytics must drive actions, not merely charts.

Initial deterministic opportunity categories:

- **Winners:** pages/tools with strong traffic or positive growth;
- **Near Page 1:** promising queries/pages around positions roughly 8–20 once Search Console data exists;
- **High Impressions / Low CTR:** likely title/snippet improvement opportunities;
- **Weak / Dead:** indexed/live pages with insufficient signals after a meaningful observation window;
- **Expansion Opportunities:** tool clusters where related queries/pages demonstrate demand.

V1 should prefer transparent rule-based classification over AI. AI suggestions may be added post-revenue if economically justified.

---

# 14. RAVA Admin scope

Growth Engine is a reusable platform capability, not a special hard-coded dashboard for one site.

Admin requirements:

- site-scoped analytics;
- tenant isolation;
- permission-aware access;
- reusable Admin Shell;
- FA/EN help/content per RAVA rules;
- actionable summaries;
- mobile-usable layout;
- explicit empty/loading/error/not-connected states;
- no chart clutter without a decision/action attached.

Owner/platform aggregate views may exist later, but customer/site data isolation must remain intact.

---

# 15. Monetization readiness

Growth Engine must create a monetizable traffic asset without coupling the product to one ad provider.

V1 architecture should keep clean, optional monetization surfaces for future use, such as:

- advertising placements where legally/commercially available;
- affiliate referrals;
- sponsored placements;
- lead generation;
- premium calculators/features;
- RAVA service/product cross-sell where contextually appropriate.

Do not render empty ad spam or create intrusive layouts before a real monetization provider is available.

AdSense availability/account eligibility is an external legal/account constraint and must not be bypassed through fake identity/location information.

---

# 16. Five-month operating target

This is an execution target, not a revenue promise.

## Month 1 — Build and launch foundation

- preserve current services work at safe handoff;
- approve/store mobile visual authority;
- implement Tool Definition contract;
- implement Calculator Engine;
- ship Break-even ROAS;
- implement the remaining four launch calculators;
- complete core technical SEO;
- complete basic first-party event tracking;
- publish only through normal RAVA Staging/Production gates and explicit owner approval.

## Month 2 — Indexation and quality

- verify crawl/indexation;
- fix technical SEO issues;
- improve pages based on actual query impressions when available;
- add several supporting guides with direct cluster relevance;
- monitor usage/completion data.

## Month 3 — Expand winners

- select the next tools from Search Console and first-party evidence;
- add approximately 5–10 high-confidence pages/tools, not bulk content;
- strengthen internal linking around winning clusters;
- improve titles/descriptions where impressions are high and CTR is weak.

## Month 4 — Cluster depth

- deepen the strongest Marketing/Profitability/Ecommerce cluster;
- improve pages close to page one;
- update weak content based on evidence;
- add comparison/examples/guides where they solve real user needs.

## Month 5 — Monetization readiness

- assess traffic quality and geography;
- activate a compliant monetization path if eligible;
- preserve UX/performance;
- reinvest only after evidence of return;
- continue expanding the strongest cluster.

---

# 17. KPIs and decision hierarchy

Early success is measured in this order:

1. launchability / correctness
2. crawlability and indexation
3. impressions
4. ranking movement
5. organic clicks
6. repeated tool usage / completed calculations
7. growth of winning clusters
8. monetizable traffic
9. revenue

Do not optimize for vanity page count.

### Kill / pivot rule

If after a meaningful live observation window a tool cluster receives no useful search or usage signal, do not keep scaling it out of attachment. Investigate, improve or pivot to the stronger cluster.

---

# 18. Delivery slices for Codex

## Slice 0 — preserve active services work

- inspect current branch/uncommitted state;
- preserve or commit only according to existing repository workflow and owner instructions;
- run applicable gates;
- no Production/DNS/merge action.

## Slice A — Growth design + contracts

- store approved desktop visual authority;
- produce mobile preview for owner approval;
- finalize Tool Definition contract;
- finalize calculation registry contract;
- finalize event taxonomy;
- finalize SEO/content URL contract;
- update feature standards/RPIM boundaries.

**Gate:** owner approves exact mobile and material interaction/error states before public UI implementation.

## Slice B — Calculator Engine + first tool

- reusable calculator renderer;
- safe typed input system;
- validation;
- result model;
- calculation registry;
- Break-even ROAS implementation;
- unit tests for formula and edge cases;
- public tool page shell;
- no paid APIs/dependencies.

## Slice C — launch cluster

- CAC;
- Ad Profit;
- Contribution Margin;
- Profit Per Order;
- category/discovery pages;
- related-tool graph;
- guide foundation;
- sitemap/robots/canonical/metadata;
- first-party event tracking.

## Slice D — Analytics & Growth Admin

- exact desktop/mobile preview first;
- site-scoped data service;
- top-tool / completion metrics;
- opportunities work queue;
- no fake Search Console data;
- integration status state.

## Slice E — Search Console

- only after real domain and compliant credentials exist;
- provider abstraction if practical;
- safe credential handling;
- query/page/click/impression/CTR/position ingestion or on-demand read strategy based on API quota/cost and repository architecture;
- deterministic opportunity classification.

## Slice F — Staging acceptance / launch

- full repository gates;
- real non-production PostgreSQL tests for DB/RLS changes;
- browser captures and visual comparison;
- performance/accessibility review;
- owner approval;
- Production remains a separate explicit action.

---

# 19. Definition of Done additions

Growth Engine work is not complete unless applicable items pass:

- `node scripts/verify-feature-standards.mjs`
- `npm run rpim:verify`
- `npx tsc --noEmit`
- `npm run build`
- relevant unit/integration tests
- real PostgreSQL/RLS validation for DB changes
- desktop/mobile visual comparison to approved authority
- no paid API introduced
- no sensitive calculator inputs persisted by default
- SEO metadata visible in generated HTML
- calculator formula tested against known examples
- analytics data is real or explicitly shows disconnected/empty state
- no Production deployment, merge, DNS or `ravateam.ir` action without explicit owner approval.

---

# 20. Instructions to Codex

When working on this initiative, Codex must treat this document and Issue #3 as the execution brief, subordinate to `AGENTS.md`, `docs/RAVA_PLATFORM_VISION.md`, `docs/PROJECT_STATUS.md` and `docs/DECISION_LOG.md` where conflicts exist.

Codex must optimize for:

> **lowest operating cost → fastest safe launch → real utility → organic-search readiness → actionable measurement → data-driven expansion → monetization readiness**

Codex must not:

- add paid APIs or SaaS because they are convenient;
- generate fake analytics/Search Console data;
- mass-produce thin calculator pages;
- hard-code five unrelated calculators when a reusable engine is appropriate;
- store private financial inputs for analytics;
- weaken RAVA tenant/permission/security rules;
- redesign the owner-approved UI without approval;
- spend a large iteration on visual polish that does not materially improve launch, usability or traffic potential;
- merge/deploy/change Production/DNS without explicit owner authorization.

When choosing between two technically valid implementations, prefer the one that is simpler to operate on the owner's own VPS, easier to test, cheaper to scale and more portable.

---

# 21. Immediate next action

The immediate next action after this plan is recorded is **not** a broad rewrite.

1. safely close/preserve the current services-template slice;
2. preserve the approved RAVA Metrics desktop visual authority in the repository;
3. create and obtain owner approval for the RAVA Metrics mobile visual and key calculator states;
4. implement Slice B as the smallest Growth Engine code milestone;
5. validate it before expanding to the other four launch tools.
