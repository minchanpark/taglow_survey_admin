# `src/components/css` Instructions

Owns shared CSS, tokens, resets, and utility layer for components.

## Design System Files

- `design-tokens.css` is the implementation surface for `DESIGN.md` tokens.
- `base.css` imports tokens and applies global reset/base behavior.
- App entry CSS should import `base.css`, not individual feature CSS files.

## Rules

- Keep feature-specific styles near the feature when they are not reusable.
- Do not hide accessibility focus styles.
- Avoid one-off color values when a token exists.
- Keep layout utilities generic and predictable.
- CSS here must not encode business logic or route-specific behavior.
- Do not change token values without updating `DESIGN.md` in the same change.
- Prefer semantic tokens like `--tg-bg-panel` over raw palette tokens like `--tg-color-white`.
