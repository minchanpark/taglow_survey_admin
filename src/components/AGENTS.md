# `src/components` Instructions

Owns shared, reusable UI primitives and layout components.

## Include

- buttons,
- text fields,
- selects,
- modals,
- admin layout,
- stat cards,
- chart wrappers only if generic.

## Rules

- Components here should not fetch data.
- Components here should not know Supabase, query hooks, or gateway types.
- Keep domain-heavy admin feature components under `src/view/admin/**/components`.
- Use accessible semantics: real buttons, labels, focus states, and keyboard support.
- Prefer stable dimensions for controls that should not jump during loading or hover.
