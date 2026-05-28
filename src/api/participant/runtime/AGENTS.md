# `src/api/participant/runtime` Instructions

Owns participant API runtime wiring.

## Rules

- Runtime may create Supabase or HTTP gateway implementations.
- Keep environment reads here and out of views.
