# `src/api/admin/runtime` Instructions

Owns runtime composition for the admin API boundary.

## Include

- `createAdminApiRuntime.ts`
- `adminApiRuntime.tsx`

## Rules

- Build an `AdminApiController` from environment config.
- Choose Supabase gateway or HTTP gateway here.
- Views and query hooks must not care which gateway is active.
- Keep environment parsing centralized through `utils/envConfig` or equivalent.
- Do not place feature UI in runtime files.
