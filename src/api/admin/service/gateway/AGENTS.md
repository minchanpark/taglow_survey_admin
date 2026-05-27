# `src/api/admin/service/gateway` Instructions

Owns Supabase or future HTTP API calls.

## Include

- `adminApiGateway.ts`
- `supabaseAdminApiGateway.ts`
- `httpAdminApiGateway.ts`
- `adminStorageGateway.ts`
- `apiErrors.ts`

## Rules

- Supabase SDK is allowed here and only here.
- Gateway methods return raw rows/DTOs, not domain models.
- Normalize failures into `ApiError` or an equivalent typed error.
- Keep Storage upload separate from metadata row creation.
- Do not import views, query hooks, stores, or React components.
- HTTP gateway must implement the same interface as the Supabase gateway.
