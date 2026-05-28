# `src/api/participant` Instructions

Owns the participant-facing survey API boundary.

## Rules

- Views must consume query hooks/controllers, not Supabase SDK or raw rows.
- Keep published survey lookup by public identifier here.
- Do not expose admin-only mutations or admin membership concepts from this tree.
