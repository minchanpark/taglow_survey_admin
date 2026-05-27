# `src/api/admin/service` Instructions

Owns external service integration, payload mapping, and validation helpers for admin API.

## Rules

- No React components or hooks.
- No Zustand stores.
- Gateways return raw data.
- Mappers return domain models.
- Validation schemas must be pure and reusable by controllers and tests.
