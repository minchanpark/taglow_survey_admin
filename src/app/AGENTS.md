# `src/app` Instructions

Owns application wiring only:

- `App.tsx`
- `router.tsx`
- `providers.tsx`
- `queryClient.ts`
- `routeGuards.tsx`

## Responsibilities

- Compose providers: router, query client, admin API runtime provider, auth/session provider if needed.
- Define route objects for the TDD admin paths.
- Implement route guards for session, `@handong.ac.kr`, admin allowlist, and survey access.
- Keep shell-level loading and error boundaries here.

## Rules

- Do not render feature-specific business UI here beyond route/layout composition.
- Do not import Supabase directly except through a future auth/session adapter explicitly placed in the API/runtime layer.
- Route guards may call admin auth/query abstractions, not raw gateways.
- Keep route paths aligned with the TDD:

```text
/admin/login
/admin/surveys
/admin/surveys/new
/admin/surveys/:surveyId/dashboard
/admin/surveys/:surveyId/builder
/admin/surveys/:surveyId/preview
/admin/surveys/:surveyId/responses
/admin/surveys/:surveyId/analysis
/admin/surveys/:surveyId/report
```
