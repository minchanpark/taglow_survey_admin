# `src/api/participant/service/gateway` Instructions

Owns raw participant API calls.

## Rules

- Supabase SDK usage is allowed only in concrete gateway implementations.
- Gateways return raw rows and normalized errors, not React or domain view models.
