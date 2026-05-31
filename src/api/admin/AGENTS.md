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

## Performance Rules

- Use the `taglow-performance-first` skill for admin API model, controller, gateway, mapper, query hook, and runtime changes.
- Treat payload size, query key shape, cache invalidation radius, memory copies, and network round trips as part of the API contract.
- Prefer narrow domain models and paginated or aggregated reads over moving raw bulk data into React state.
- For analysis or multi-table writes, prefer a single validated RPC through the gateway instead of chained client round trips.
- For broad API changes, ask the performance sub-agent for a read-only review when available.
