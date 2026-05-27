# `src/api/admin/query` Instructions

Owns TanStack Query integration for admin data.

## Include

- `queryKeys.ts`
- survey/builder/asset/preview/publish/analysis query hooks

## Rules

- Query hooks call `AdminApiController` only.
- Do not import gateways or mappers.
- Do not expose raw rows/DTOs.
- Query keys must include every argument that changes results, especially survey id and analysis filters.
- Mutations must invalidate the smallest relevant keys:
  - survey create/update/publish -> survey list/detail,
  - section/question changes -> builder data and preview validation,
  - asset upload/delete -> assets, questions, preview validation,
  - response/filter changes -> response summary and analysis.
- Keep hooks thin; business behavior belongs in controller or validation.
