# `src/api/admin/service/mapper` Instructions

Owns raw payload to domain model conversion.

## Rules

- Convert `snake_case` rows to `camelCase` models.
- Convert `title_ko/title_en` to locale-keyed title objects.
- Preserve stable ids and option values.
- Provide safe defaults for missing JSON config through validation helpers where appropriate.
- No Supabase imports.
- No React imports.
- Keep mapping deterministic and unit-tested.
