# `src/api/participant/query` Instructions

Owns React Query hooks for participant APIs.

## Rules

- Hooks call participant controllers only.
- Query keys include the public identifier for every survey-dependent result.
- Do not import gateways, raw DTOs, mappers, or Supabase SDK.

## Performance Rules

- Use the `taglow-performance-first` skill when changing participant query hooks.
- Keep survey access/detail query keys stable and include every result-changing input.
- Use explicit `staleTime` for read-mostly published survey structure.
- Keep submit mutations idempotent from the UI perspective and prevent duplicate clicks from creating duplicate requests.
- Use pagination or infinite queries if participant-facing answer/result history grows.
