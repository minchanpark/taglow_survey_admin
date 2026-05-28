# `src/api/participant/query` Instructions

Owns React Query hooks for participant APIs.

## Rules

- Hooks call participant controllers only.
- Query keys include the public identifier for every survey-dependent result.
- Do not import gateways, raw DTOs, mappers, or Supabase SDK.
