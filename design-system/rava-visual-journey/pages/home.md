# Visual Journey — Home Override

This page intentionally overrides the generated luxury/brutalist palette in `MASTER.md`. The raw match conflicted with the approved RAVA illustrated-story direction and the existing versioned template identity.

## Direction

- Pattern: accessible scroll-led storytelling without scroll-lock or JS-dependent reveals
- Variance: 8/10 — asymmetric illustration and organic geometry
- Motion: 6/10 — restrained transform-only ambient motion with reduced-motion fallback
- Density: 2/10 — generous section rhythm and readable line lengths
- Visual language: editorial illustration, organic shapes, trust blue, soft paper surfaces, cinematic night CTA

## Tokens

| Role | Value |
| --- | --- |
| Night | `#071633` |
| Primary | `#3158BD` |
| Canvas | `#F2F5FF` |
| Surface | `#FFFFFF` |
| Text | `#101A38` |
| Muted text | `#66718C` |
| Light accent | `#A9C5FF` |

Persian typography uses the locale-managed Persian font. English typography uses the locale-managed English font. The template must never load a third-party font at runtime.

## Page structure

1. Floating conversion navigation
2. Immersive illustrated hero with one primary and one secondary action
3. Three-step narrative route
4. Illustrated business-value story
5. Four trust principles
6. CMS-managed page blocks
7. Cinematic final action
8. Minimal night footer

## Non-negotiable UX constraints

- Persian and English navigation never mix.
- Every destination remains a real URL/deep link.
- Keyboard skip link and visible focus behavior remain available.
- Body copy meets 4.5:1 contrast.
- Motion uses transform/opacity and stops under `prefers-reduced-motion`.
- Layout is checked at 375, 768, 1024 and 1440 CSS pixels.
- No carousel, scroll hijacking, emoji icon or hover-only action.
- CMS content and verified business facts remain separate from decorative template copy.
