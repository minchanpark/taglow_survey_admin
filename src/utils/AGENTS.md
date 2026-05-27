# `src/utils` Instructions

Owns pure utilities shared across app layers.

## Expected Utilities

- `envConfig.ts`
- `authDomain.ts`
- `slug.ts`
- `i18nText.ts`
- `qrBuilder.ts`
- `heatmapMath.ts`
- `imageRatio.ts`
- `downloadHelper.ts`

## Rules

- Prefer pure functions with explicit inputs and outputs.
- Utilities may be imported by API, store, and view layers when they remain generic.
- Do not import React unless the utility is explicitly React-specific and no better home exists.
- Do not import Supabase SDK here.
- Heatmap math must use normalized coordinates unless explicitly converting for rendering.
