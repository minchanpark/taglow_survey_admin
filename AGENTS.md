# Taglow Survey Admin Global Instructions

<!-- omd:start v=1 hash=be71c8d154c9 -->
## Design System (oh-my-design)

**Before any UI, styling, copy, or motion change, open and read `./DESIGN.md` in full.** It is the authoritative brand/design spec. Treat its tokens, voice, and component rules as binding unless the user overrides in chat.

If present, read `./.omd/preferences.md` — pending corrections not yet folded into DESIGN.md. Apply them; flag conflicts.
<!-- omd:end -->

## Source Of Truth

- Product requirements: `dev/Taglow_Survey_Admin_PRD.md`
- Technical design: `dev/Taglow_survey_Admin_TDD.md`

When product behavior and implementation details conflict, preserve the PRD outcome and update the implementation to keep the TDD boundary rules intact.

## Product Shape

Taglow Survey Admin is not a generic form builder. It is a survey analysis workbench for student organizations:

```text
admin auth
-> survey/section/question builder
-> participant preview
-> publish URL/QR
-> response status
-> global filters
-> analysis cards
-> report draft/export
```

MVP scope is the PRD/TDD Must items. Treat Should/Could items as explicit opt-in work unless the user asks for them.

## Architecture Law

All external communication must flow through this boundary:

```text
View
  -> Query Hook
  -> AdminApiController
  -> AdminPayloadMapper
  -> AdminApiGateway
  -> Supabase or future HTTP API
```

Rules:

- Supabase SDK is allowed only in `src/api/admin/service/gateway`.
- Raw Supabase rows/DTOs are not allowed in `src/view`, `src/store`, or `src/components`.
- Views call query hooks and UI stores. They do not call gateways, mappers, or controllers directly.
- Query hooks call `AdminApiController` only.
- Mappers convert raw payloads to domain models.
- Controllers return domain models.
- Stores keep client/UI state only, not server response copies.
- Preview mode must never create `responses` or `answers`.

## Core Data Model

Keep the MVP database centered on:

```text
surveys
survey_sections
questions
survey_assets
responses
answers
```

Do not introduce workspace/member/report snapshot/analysis result tables unless the user explicitly moves beyond MVP scope.

## React Stack

Follow the TDD defaults:

- React + TypeScript
- React Router
- TanStack Query for server state
- Zustand for UI/client state
- React Hook Form for editor forms
- Zod for validation
- Supabase behind the API gateway
- Recharts or lightweight wrappers for charts
- Canvas/SVG for heatmap rendering
- Vitest + React Testing Library
- Playwright for core E2E flows

## Directory Guidance

Every `src` directory has its own `AGENTS.md`. Read the nearest one before editing. Deeper files override this root file only for their directory scope.

## Testing Expectations

Add or update tests at the closest useful layer:

- mapper tests for raw/domain conversion,
- controller tests for command orchestration,
- query tests for keys and invalidation,
- store tests for UI state transitions,
- view tests for loading/empty/error/success and form behavior,
- E2E tests for auth, builder, preview, publish, and analysis flows.

Before handoff, report which checks ran and which were skipped.
