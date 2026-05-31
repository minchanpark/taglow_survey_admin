# `src/api/participant/service/gateway` Instructions

Owns raw participant API calls.

## Rules

- Supabase SDK usage is allowed only in concrete gateway implementations.
- Gateways return raw rows and normalized errors, not React or domain view models.

## Performance Rules

- Use the `taglow-performance-first` skill for participant gateway work.
- Prefer one bundled read/RPC over multiple dependent round trips on survey access, response loading, and Storage signed URL paths.
- Select only required columns and avoid `.select("*")` unless callers need the full row.
- Batch signed URLs and repeated status checks where possible.
- Check index and RLS cost before adding filters or joins over `responses`, `answers`, or survey structure tables.
