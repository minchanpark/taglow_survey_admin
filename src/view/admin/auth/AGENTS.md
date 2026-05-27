# `src/view/admin/auth` Instructions

Owns admin login and access-denied UI.

## Responsibilities

- Google login entry screen.
- Domain and allowlist denial messaging.
- Recovery path back to login or account switch.

## Rules

- Auth policy is: Supabase session, `@handong.ac.kr`, admin allowlist.
- Keep actual guard enforcement in `src/app/routeGuards.tsx` or an API/runtime abstraction.
- Do not expose raw auth provider errors directly to users.
- Do not add role/workspace membership UI until post-MVP scope is requested.
- Keep page-level CSS next to auth page files, for example `AdminLoginPage.css`.
- Do not style auth components from page CSS when the style belongs inside `components`.
