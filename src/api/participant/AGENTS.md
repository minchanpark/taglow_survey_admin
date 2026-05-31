# `src/api/participant` Instructions

Owns the participant-facing survey API boundary.

## Rules

- Views must consume query hooks/controllers, not Supabase SDK or raw rows.
- Keep published survey lookup by public identifier here.
- Do not expose admin-only mutations or admin membership concepts from this tree.

## Performance Rules

- Use the `taglow-performance-first` skill for participant API, survey loading, response submission, and Storage URL work.
- Prefer one bundled survey-access/read RPC and one transactional submit RPC over many dependent client requests.
- Keep submitted payloads compact, validate before upload/insert, and avoid returning full answer rows after submission.
- Paginate large answer/evidence reads and generate signed URLs only for the visible page.
- For changes touching `responses` or `answers`, check memory use, retry behavior, idempotency, network size, and database indexes before handoff.
