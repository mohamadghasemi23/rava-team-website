# RAVA Frontend Performance Budget

RAVA must remain visually distinctive without turning presentation into continuous server, CPU or GPU work. Performance is a product-quality Gate, not a cleanup phase.

## Flagship baseline

- Pre-compress production imagery at build time; do not make the application server transform the same static Hero asset on every cold cache.
- Keep the combined RAVA Living System Hero media at or below 220 KiB and each delivered asset at or below 120 KiB. Source PNG files may remain for reproduction, but browsers must prefer the budgeted WebP assets.
- Do not add a continuous RAF, WebGL, canvas, marquee or timer loop to a static Template. An exception requires a measured product benefit, viewport/visibility gating, reduced-motion fallback, cleanup on unmount and a separate performance review.
- Restrict expensive optical effects. Persistent `backdrop-filter` is reserved for compact navigation surfaces; large below-fold panels use precomposed gradients and borders instead.
- Defer below-fold rendering with `content-visibility` where layout stability can be preserved with an intrinsic-size fallback.
- Motion must use transform/opacity where practical, finish promptly, and respect reduced-motion preferences.
- New visual assets must declare intrinsic dimensions, use asynchronous decoding and avoid eager loading unless they contribute directly to the initial Hero.

## Verification

Run:

```bash
npm run verify:performance-budgets
```

CI enforces the repository-owned asset budget. Browser profiling remains required for network selection, running animation counts, canvas/WebGL activity, mobile behavior and regressions that file size alone cannot detect.

## 2026-09-01 measured reference

- Desktop Hero media selected by Chromium: `editor-site-visual.webp` and `responsive-site-visual.webp`.
- Combined decoded transfer payload: approximately 197 KiB, down from approximately 3.2 MiB of source PNG imagery.
- Template CSS transfer observed in the local design-preview route: approximately 8 KiB.
- Canvas/WebGL elements: zero.
- Mobile running animations after load: zero.
- Desktop exposed one finite Mega Menu entry animation in the design-preview route, which intentionally renders the menu open; no continuous animation loop exists in source.
