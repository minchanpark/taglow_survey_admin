# `src/view/admin` Instructions

Owns Taglow Admin feature screens.

## Feature Areas

- `auth`
- `surveys`
- `builder`
- `preview`
- `responses`
- `analysis`
- `report`

## Rules

- Admin pages use `src/api/admin/query` hooks for data.
- Admin pages use `src/store` for UI-only state.
- Keep route-specific orchestration in page files.
- Keep repeated widgets in each feature's `components` folder or promote them to `src/components` only when truly generic.
- All analysis-facing UI must display N and low-sample warnings when provided by the API.

## CSS Layout

- Each admin page keeps its page-level CSS beside the page file in its feature directory.
- Each admin feature component keeps its CSS beside the component file inside `components`.
- Import page CSS from the page file only.
- Import component CSS from the component file only.
- Use page CSS for route composition and component CSS for reusable feature widgets.
