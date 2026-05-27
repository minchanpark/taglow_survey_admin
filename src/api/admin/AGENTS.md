# `src/api/admin` Instructions

Owns the Taglow Admin API boundary.

## Boundary

```text
model
service/gateway
service/mapper
service/validation
controller
query
runtime
```

## Rules

- Domain models are the only shapes allowed to cross into views.
- Raw rows and DTOs stay in gateway/mapper/controller internals.
- Query hooks are the public React-facing API for admin views.
- Keep participant public survey API separate if it is added later.
