# `src/api/admin/service/mapper` Instructions

Owns raw payload to domain model conversion.

## Rules

- Convert `snake_case` rows to `camelCase` models.
- Convert `title_ko/title_en` to locale-keyed title objects.
- Convert RPC results to analysis domain models.
- Preserve stable ids and option values.
- Provide safe defaults for missing JSON config through validation helpers where appropriate.
- Map `storage_bucket` and `storage_path` into `storageBucket` and `storagePath`.
- No Supabase imports.
- No React imports.
- Keep mapping deterministic and unit-tested.

## Performance Rules

- Use the `taglow-performance-first` skill when mapping large analysis, answer, or asset payloads.
- Keep mappers pure and linear; avoid nested scans over large answer arrays when a map/index can be built once.
- Do not preserve unused raw fields in domain models.
- Normalize or compact large nested structures before returning them to controllers/query hooks.
- Add mapper tests for pagination cursors and compact analysis payloads when those shapes change.
