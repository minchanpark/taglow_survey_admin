---
name: taglow-admin:api-boundary
description: "Taglow Survey Admin의 API Boundary 계층을 구현하거나 검수한다. api/admin/model, gateway, mapper, controller, query hook, runtime/provider, import boundary, DTO-domain 변환, TanStack Query invalidation 작업에 사용."
user-invocable: true
---

# taglow-admin:api-boundary

TDD의 핵심 원칙은 View가 Supabase SDK, 서버 DTO, endpoint 세부사항을 직접 알지 않는 것이다.

For API, gateway, query hook, or large payload work, also use `taglow-performance-first`. API shape includes memory use, network round trips, cache behavior, pagination, and idempotent write semantics.

## Read First

필요한 범위만 읽는다.

```sh
rg -n "API Boundary|계층별 책임|프로젝트 구조|Admin Domain Model|Admin API Gateway|Admin Controller|Query Key|Error Handling" dev/Taglow_survey_Admin_TDD_v2.md
```

## Layer Contract

| Layer | Owns | Must Not Import |
|---|---|---|
| `src/api/admin/model` | Domain models, commands, pure types | React, Supabase, TanStack Query |
| `src/api/admin/service/gateway` | Supabase/HTTP calls, raw payloads, normalized errors | View, query hooks, Zustand |
| `src/api/admin/service/mapper` | raw row/DTO <-> domain model | React, Supabase |
| `src/api/admin/controller` | Use-case interface and implementation | React query hooks |
| `src/api/admin/query` | Query keys, hooks, invalidation | Gateway, mapper, raw DTO |
| `src/api/admin/runtime` | Build controller from environment | View details |
| `src/view/admin` | UI and interactions | Supabase SDK, raw DTO, endpoint strings |
| `src/store` | UI/client state only | Server raw rows, Supabase SDK |

## Implementation Workflow

1. Locate existing structure with `rg --files src`.
2. Add or update model types first: `AdminMember`, `Survey`, `SurveySection`, `Question`, `SurveyAsset`, `Answer`, preview models, analysis models, and command types.
3. Define gateway interfaces in raw terms. Supabase-specific raw types stay near gateway files.
4. Implement mapper conversion:
   - `snake_case` raw rows -> `camelCase` domain models.
   - `title_ko/title_en` -> `LocalizedText`.
   - optional multilingual descriptions -> optional `LocalizedText`.
   - `storage_bucket/storage_path` -> `storageBucket/storagePath`.
   - JSON config gets safe defaults through validation helpers.
5. Implement controller as the single use-case facade. It composes gateway + mapper and returns domain models.
6. Implement query hooks that call only the controller, use stable query keys, and invalidate the smallest relevant keys.
7. Build runtime/provider so switching `SupabaseAdminApiGateway` to `HttpAdminApiGateway` does not touch views.

## Import Guard

After changes, run targeted searches and fix leaks:

```sh
rg -n "@supabase|supabase\\.from|supabase\\.storage" src/view src/store src/api/admin/query
rg -n "Raw[A-Z]|_id|_at" src/view src/store src/api/admin/query
rg -n "AdminPayloadMapper|AdminApiGateway" src/view src/store src/api/admin/query
```

Expected result: no direct SDK/gateway/mapper/raw DTO usage outside allowed layers. Some `_id` strings may be legitimate route params, so inspect matches rather than blindly editing.

## Query Rules

- Query keys include survey id, analysis kind, and filters when the result depends on them.
- Include `currentAdmin`, `assets`, `filterOptions`, `sectionSummary`, `borich`, `heatmap`, and `textAnswers`.
- Mutations invalidate related list/detail/preview-validation keys.
- Upload mutation separates Storage failure from metadata row failure.
- Hooks expose domain models and mutation status, not raw rows.

## Performance Rules

- Keep gateway selects narrow and mapper outputs domain-focused.
- Use `staleTime` for expensive/read-mostly queries and invalidate the smallest key set.
- Use pagination or `useInfiniteQuery` for text, image, evidence, and answer-detail lists.
- Prefer one controller method backed by one RPC for transactional or aggregation-heavy flows.
- Do not copy large server results into stores or component state when TanStack Query already owns them.

## Tests

Prefer focused tests:

- Mapper row conversion and fallback behavior.
- Controller command -> payload -> domain return flow using fake gateway.
- Query hook invalidation with fake controller.
- Import boundary checks via shell when practical.

## Subagent

For independent review, use `.codex/agents/taglow-admin-boundary-reviewer.toml`. Ask it to report only file/line findings and residual risks.
For performance-sensitive API changes, use `.codex/agents/taglow-admin-performance-auditor.toml` as an additional read-only pass.
