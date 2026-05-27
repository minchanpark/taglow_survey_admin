# `src/api` Instructions

This directory owns application API boundaries. It is not a generic utility area.

## Rules

- Keep API modules framework-light. React components belong outside this tree.
- Domain-specific admin API code goes under `src/api/admin`.
- External SDK usage must be isolated to gateway implementations.
- Model/controller/query boundaries must remain replaceable so Supabase can later be swapped for an HTTP backend.
