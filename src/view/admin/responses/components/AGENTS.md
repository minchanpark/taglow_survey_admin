# `src/view/admin/responses/components` Instructions

Owns response status widgets.

## Rules

- Display N prominently.
- Make low-sample warnings explicit and non-alarmist.
- Components receive already-shaped domain models as props.
- No direct SQL, Supabase, gateway, or mapper imports.
- Keep each response component's CSS beside the component file.
- Component CSS owns status widgets, distribution blocks, warning rows, and compact states.
