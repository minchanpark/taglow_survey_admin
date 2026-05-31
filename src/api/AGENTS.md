# `src/api` Instructions

This directory owns application API boundaries. It is not a generic utility area.

## Rules

- Keep API modules framework-light. React components belong outside this tree.
- Domain-specific admin API code goes under `src/api/admin`.
- External SDK usage must be isolated to gateway implementations.
- Model/controller/query boundaries must remain replaceable so Supabase can later be swapped for an HTTP backend.

## Performance Rules

- Use the `taglow-performance-first` skill for API boundary changes.
- Before adding a call, check whether an existing query can be cached, seeded, batched, narrowed, or moved into an RPC.
- Keep responses minimal and avoid returning bulk inserted rows unless callers use them.
- Keep query keys stable and cache windows explicit for read-mostly data.
- For broad API changes, request a sub-agent read-only performance review when available.
