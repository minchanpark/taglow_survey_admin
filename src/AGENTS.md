# `src` Instructions

This directory contains the React application described by the Admin TDD.

## Target Structure

```text
src/
  app/
  api/admin/
  store/
  components/
  utils/
  view/admin/
```

Keep feature code inside the matching responsibility area. Do not collapse the API boundary for convenience.

## Import Direction

Allowed high-level direction:

```text
app -> view/components/store/api runtime
view -> api/admin/query + store + components + utils
api/admin/query -> api/admin/controller
controller -> service/gateway + service/mapper + model
service/mapper -> model
service/gateway -> external clients
store -> pure types/utils only
```

Avoid reverse imports. Shared UI belongs in `components`; admin feature screens belong in `view/admin`.

## File Conventions

- Use `.tsx` only for files that render JSX.
- Keep domain types immutable where practical with `Readonly`.
- Prefer named exports for app modules.
- Use stable ids/keys for survey logic. Do not compare translated labels to drive behavior.
- Keep Korean/English display text in model/config fields or UI copy constants, not in raw SQL/query code.

## Boundary Checks

When editing architecture-sensitive files, run targeted searches:

```sh
rg -n "@supabase|supabase\\.from|supabase\\.storage" src/view src/store src/api/admin/query
rg -n "AdminPayloadMapper|AdminApiGateway" src/view src/store src/api/admin/query
rg -n "Raw[A-Z]" src/view src/store src/api/admin/query
```
