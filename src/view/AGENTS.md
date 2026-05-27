# `src/view` Instructions

Owns route-level views and feature UI.

## Rules

- Views may import query hooks, stores, shared components, and utilities.
- Views must not import Supabase SDK, gateways, mappers, or raw DTOs.
- Keep domain display logic close to the page, but move reusable feature widgets into local `components`.
- Do not duplicate server state in Zustand.
- Use the participant-facing renderer for preview when available instead of creating a separate mock rendering path.

## CSS Ownership

- Keep route/page CSS in the same feature directory as the page, for example `SurveyBuilderPage.tsx` with `SurveyBuilderPage.css`.
- Keep feature component CSS inside that feature's `components` directory, next to the component, for example `components/QuestionEditor.tsx` with `components/QuestionEditor.css`.
- Page CSS owns page shell, route layout, responsive page grid, and spacing between page regions.
- Component CSS owns only that component's internal layout, states, and variants.
- Do not put feature-specific CSS in `src/components/css`; reserve that path for shared tokens, resets, and generic component styles.
- Do not make a component depend on a page CSS class. Promote shared styling to a reusable component or shared CSS token instead.
