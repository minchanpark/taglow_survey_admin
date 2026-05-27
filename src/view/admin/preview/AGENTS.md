# `src/view/admin/preview` Instructions

Owns admin participant-preview pages.

## Responsibilities

- Full-flow preview.
- Section preview.
- Locale switch.
- Mobile/desktop device switch.
- Branch simulation.
- Image tagging preview.
- Publish validation panel.

## Rules

- Preview URLs are admin-only and distinct from `/survey/{public_slug}`.
- Preview input must stay in preview state and must never write `responses` or `answers`.
- Reuse participant rendering components when they exist.
- Show warnings for missing multilingual text, missing options, missing assets, and invalid branch conditions.
- Image tag preview must preserve aspect ratio and use normalized coordinates.
- Keep page-level CSS next to preview page files, for example `SurveyPreviewPage.css`.
- Page CSS owns preview route layout, toolbar placement, device-frame region, and validation side/bottom panel composition.
