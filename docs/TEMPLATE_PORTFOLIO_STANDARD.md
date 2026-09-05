# RAVA Template Portfolio Standard

This document defines the acceptance standard for a commercially useful, genuinely diverse RAVA Template portfolio. It complements `RAVA_PLATFORM_VISION.md` and does not by itself prove implementation.

## Product rule

A new Template is not a recolor, font swap, Hero variation, or rearrangement of the same component stack. It must offer a recognizably different design proposition, layout grammar, content rhythm, interaction model, and commercial use case while remaining compatible with the shared RAVA platform.

RAVA separates three concerns:

`Template = visual/interaction system`  
`Industry Pack = domain information, terminology, content and forms`  
`Brand Profile = verified customer identity and business facts`

This separation allows many industries to use a smaller set of excellent, adaptable Template families without creating a separate codebase or a superficial skin for every customer.

## Admission brief for every Template

Before implementation, each candidate requires an approved brief containing:

1. **Target buyer and job:** who buys it, what type of trust or action it must create, and why an existing Template is insufficient.
2. **Visual thesis:** a one-sentence art direction that remains recognizable without brand colors or copy.
3. **Layout grammar:** section geometry, grid behavior, whitespace/density, navigation model, mobile composition, and page-family rules.
4. **Type system:** display/body roles, scale, line length, Persian/English pairing, and RTL/LTR behavior.
5. **Image language:** photography, illustration, editorial media, product rendering, texture, cropping, and provenance rules.
6. **Motion language:** purpose, choreography, reduced-motion fallback, performance budget, and whether motion is optional.
7. **Conversion model:** primary audience journey, CTA hierarchy, proof strategy, forms, and lead intent.
8. **Compatible industries:** explicit compatibility with Site Types and Industry Packs; no claim of universal suitability.
9. **Commercial tier:** Core, Premium, Enterprise, or Exclusive, with a concrete reason customers would pay.
10. **Operating constraints:** required modules, media quality, accessibility, performance, content minimums, and browser/device support.

## Independence Gate

A candidate cannot enter implementation or the public catalog unless it passes all applicable checks:

- **Silhouette test:** blurred or grayscale screenshots must still be distinguishable from every existing Template.
- **Content-swap test:** replacing copy and brand colors must not make it collapse into an existing Template.
- **System test:** header, Hero, cards, section transitions, proof, CTA and footer must follow the candidate's own coherent design language.
- **Journey test:** the reading and conversion sequence must fit its buyer rather than reuse the same section order by default.
- **Responsive test:** mobile must be an intentional composition, not only stacked desktop blocks.
- **Localization test:** Persian RTL and English LTR must each look authored for that direction and language.
- **Accessibility test:** keyboard, focus, contrast, semantic structure, reduced motion and target sizes meet the platform baseline.
- **Performance test:** distinction cannot depend on uncontrolled JavaScript, oversized media or effects that fail on ordinary mobile hardware.
- **Evidence test:** design decisions are documented with lawful references and original implementation; brand identity or trade dress is never cloned.

If reviewers can describe a candidate as “the same Template with another color, font, Hero, radius, or animation,” it fails.

## Portfolio diversity map

The initial services portfolio should cover distinct commercial and aesthetic territories rather than ten nearby variations. Candidate families are:

1. **Editorial Authority:** typography-led, restrained, content-rich; suitable for consulting, legal, research and expert services.
2. **Cinematic Experience:** immersive imagery and controlled motion; suitable for creative studios, hospitality and premium experiences.
3. **Precision Technology:** structured grids, product evidence and technical trust; suitable for SaaS, engineering and B2B technology.
4. **Human Care:** warm, calm, accessible and reassurance-led; suitable for clinics, wellness, counseling and care services.
5. **Luxury Minimal:** art-directed whitespace and exceptional media; suitable for architecture, interiors, fashion and premium brands.
6. **Bold Local Business:** direct offers, location trust and rapid conversion; suitable for high-intent local services.
7. **Portfolio Narrative:** case-study-led storytelling and visual work proof; suitable for agencies, photographers and makers.
8. **Institutional Trust:** formal information architecture and public accountability; suitable for education, associations and larger organizations.
9. **Community Energy:** event, people and participation-led experience; suitable for clubs, studios, cultural and social organizations.
10. **Modular Campaign:** high-conversion, launch-oriented composition; suitable for campaigns, new services and time-bound offers.

These are portfolio territories, not final Template names. One Template may support several compatible industries, but it must retain its own visual thesis.

## Customer-safe management model

Customers do not receive unrestricted control that can destroy responsive behavior, accessibility, brand consistency, SEO, or conversion quality.

### Customer controls

- verified Brand Profile, contact and business information;
- content and approved media;
- navigation within Template-defined rules;
- predefined section variants and safe ordering;
- brand colors within contrast-safe constraints;
- approved Persian/English font options;
- visibility, draft, preview and approval operations allowed by permission;
- entitled Template choices and paid upgrade previews.

### Template-enforced guardrails

- required sections, maximum block counts and per-type limits;
- valid ordering and layout combinations;
- responsive media ratios and typography bounds;
- accessible contrast and focus behavior;
- SEO/publishing validation;
- no arbitrary CSS, scripts or destructive freeform positioning in ordinary customer mode;
- Draft → Preview → Approval → Publish with immutable releases and rollback.

### Owner-team controls

RAVA Owner and explicitly authorized designers may access advanced configuration, Template creation/versioning, Industry compatibility, default content, commercial tier, entitlements and release operations. Advanced access remains permission-scoped and audited; it is not exposed merely because a user is a customer administrator.

## Commercial scorecard

Before funding a Template, score it from 1–5 on:

- addressable customer demand;
- willingness to pay and Premium differentiation;
- visual independence from the existing catalog;
- conversion usefulness;
- Industry Pack reuse potential;
- localization quality;
- content/media availability;
- implementation and maintenance cost;
- performance/accessibility risk;
- sales-demo value for RAVA.

Low differentiation or low demand blocks implementation even when the design is attractive. Portfolio priority favors Templates that cover an unserved buyer territory and can be demonstrated with credible starter content.

## Required release evidence

A Template is not catalog-ready until it has:

- an immutable version and rollback path;
- compatible Industry/Starter Pack mappings;
- a complete page family, not only a Home page;
- Persian and English rendering and Help;
- desktop and mobile visual review;
- accessibility and reduced-motion review;
- performance budgets and measured results;
- representative starter content with no fabricated claims;
- exact preview through the customer delivery path;
- permission, entitlement and audit enforcement;
- automated repository Gates and applicable real Staging tests;
- owner acceptance against the approved brief and Independence Gate.

## Critic's rule

RAVA reviews Templates against strong international work, but does not chase trends, clone brands, or accept visual novelty without usability and revenue value. The reviewer must reject weak similarity, decorative excess, confusing management, poor mobile behavior and claims unsupported by evidence—even when accepting them would be faster.
