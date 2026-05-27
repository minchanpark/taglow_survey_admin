# `src/view/admin/auth/components` Instructions

Owns reusable auth UI pieces.

## Rules

- Components should be presentational or receive explicit callback props.
- Do not call Supabase directly.
- Keep copy clear about account/domain/allowlist failure without leaking security internals.
- Keep each component's CSS beside the component file.
- Component CSS must not rely on page-level auth classes.
