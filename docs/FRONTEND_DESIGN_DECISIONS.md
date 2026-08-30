# RAVA Frontend Design Decisions

This document records durable frontend design and technology decisions that must survive individual conversations. It complements the product vision and does not authorize dependency installation, architectural migration, deployment, or Production changes.

## Deferred Tailwind and Motion evaluation

**Decision date:** 2026-08-30  
**Current decision:** Do not install Tailwind CSS or Motion merely to consume third-party component libraries.

### Current rationale

- RAVA currently uses CSS Modules and project-owned design tokens; world-class visual quality does not require Tailwind.
- Introducing Tailwind now would create a second styling system and a migration/support burden without a proven platform-level benefit.
- Existing hover, focus, transition, loading and reduced-motion behavior can continue with CSS.
- Motion becomes valuable for genuinely complex React interactions such as shared-element transitions, layout animation, presence transitions, drag/gesture behavior and choreographed Premium Template experiences.
- The current VPS disk constraint makes non-essential dependency and Build growth inappropriate.

### Mandatory reminder triggers

Re-evaluate this decision with the owner when any of these conditions occurs:

1. VPS disk capacity has been increased and the specialist design phase begins.
2. RAVA proposes broad adoption of shadcn-compatible registries or Tailwind-based component libraries.
3. A validated interaction requires shared-element morphing, layout animation, drag/gesture behavior or choreography that is materially harder to maintain with CSS.
4. Premium Template development establishes a measured need for a single shared React motion runtime.

### Re-evaluation rules

- Tailwind is an architecture decision, not a per-component convenience install.
- Prefer one styling system and one primary complex-motion runtime; avoid uncontrolled mixtures of CSS utilities, CSS Modules, Motion and GSAP.
- Keep simple interactions in CSS even if Motion is later adopted.
- Load complex-motion code only on surfaces that require it.
- Preserve RTL/LTR behavior, configurable typography, responsive usability, `prefers-reduced-motion`, keyboard access and performance on lower-end mobile devices.
- Prototype selected components in an isolated non-Production environment and compare bundle cost, runtime performance, maintainability and accessibility before adoption.
- Any adoption requires an explicit dependency/design decision, focused tests and the complete repository Gates before Staging deployment.

