# `src/view/admin/auth` Instructions

Owns admin login and access-denied UI.

## Responsibilities

- Google login entry screen.
- Admin member denial messaging.
- Recovery path back to login or account switch.

## Rules

- Auth policy is: Supabase session and active `admin_members` row. Do not restrict admin access by email domain.
- Keep actual guard enforcement in `src/app/routeGuards.tsx` or an API/runtime abstraction.
- Do not expose raw auth provider errors directly to users.
- Do not add workspace membership UI until post-v2 scope is requested.
- Keep page-level CSS in `src/view/admin/auth/css`, for example `AdminLoginPage.css`.
- Do not style auth components from page CSS when the style belongs inside `components`.
