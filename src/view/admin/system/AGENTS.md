# `src/view/admin/system` Instructions

Owns admin system pages that are not tied to one survey feature.

## Responsibilities

- `AdminAccessDeniedPage.tsx`
- `AdminNotFoundPage.tsx`

## Rules

- Access denied must cover missing/inactive `admin_members`. Do not restrict admin access by email domain.
- Do not reveal whether a specific email is registered beyond the necessary denial message.
- Not-found UI should offer a route back to `/admin/surveys`.
- Keep page-level CSS in `src/view/admin/system/css`.
- Do not import Supabase, gateways, mappers, or raw DTOs.
