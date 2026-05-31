# `supabase` Instructions

Owns local Supabase project structure for Taglow Survey Admin.

## Rules

- Follow `dev/Taglow_survey_Admin_TDD_v2.md`.
- Migrations are ordered and append-only once shared.
- Do not put service role keys in the browser app.
- RLS, helper functions, storage policies, and analysis RPCs belong here, not in React view code.

## Performance Rules

- Use the `taglow-performance-first` skill for schema, migration, RPC, RLS, Storage policy, index, and data backfill work.
- Prefer normalized relational columns for queryable facts; use JSONB for flexible extras, not as a substitute for indexed relational data.
- Design RPCs around narrow inputs/outputs, batching, idempotency, and predictable query plans.
- Check index coverage for joins, filters, orderings, uniqueness, RLS helper lookups, and pagination cursors.
- For large migrations or analysis rewrites, request a read-only performance sub-agent review when available.
