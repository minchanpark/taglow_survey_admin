# `supabase/migrations` Instructions

Owns SQL migrations for the v2 database.

## Expected Files

```text
001_core_schema.sql
002_indexes.sql
003_functions_and_triggers.sql
004_rls_policies.sql
005_storage_policies.sql
006_analysis_rpc.sql
007_seed_sample_survey.sql
```

## Rules

- `001_core_schema.sql` creates `admin_members`, `surveys`, `survey_sections`, `questions`, `survey_assets`, `responses`, and `answers`.
- `survey_assets` includes both `storage_bucket` and `storage_path`.
- `003_functions_and_triggers.sql` includes `set_updated_at()`, `prevent_published_survey_structure_change()`, `is_handong_user()`, and `is_admin_user()`.
- `004_rls_policies.sql` enforces owner/admin/viewer/participant access through `admin_members` and helper functions.
- `006_analysis_rpc.sql` owns filter options, section satisfaction summary, Borich summary, and heatmap RPCs.
- Add policy tests or seed data when changing RLS behavior.

## Performance Rules

- Use the `taglow-performance-first` skill for all SQL migrations, RPCs, RLS, index, and schema changes.
- Preserve normalization around `admin_members`, `surveys`, `survey_sections`, `questions`, `survey_assets`, `responses`, and `answers`; use JSONB for flexible extras, not avoidable relational fields.
- Add or verify indexes for new `where`, `join`, `order by`, uniqueness, and RLS policy paths.
- Keep RPC return payloads narrow; return IDs/counts/aggregates instead of full rows when callers do not need full rows.
- Prefer `security invoker`; if `security definer` is required, lock `search_path` and avoid exposed-schema privilege escalation.
- For broad or performance-sensitive migrations, request a sub-agent read-only review of memory, network, normalization, API shape, query plan, indexes, and RLS cost when available.
