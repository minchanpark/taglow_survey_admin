# `src/api/admin/controller` Instructions

Owns admin use-case contracts and implementations.

## Include

- `adminApiController.ts`
- `gatewayBackedAdminApiController.ts`
- `adminApiControllerProvider.tsx`

## Rules

- Controllers expose domain-model methods used by query hooks.
- Controllers compose gateways, mappers, and validators.
- Do not return raw rows/DTOs.
- Do not import TanStack Query.
- Avoid UI decisions. Return enough structured data for views to render states.
- Keep method names aligned with the TDD contract: list surveys, create survey, preview, publish, analysis, heatmap, and report/export commands.
