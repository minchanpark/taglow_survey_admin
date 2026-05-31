---
name: taglow-performance-first
description: "Taglow Survey Admin에서 API, Supabase, DB, RPC, RLS, Storage, 분석, 응답 저장, 대규모 데이터 처리를 구현하거나 검토할 때 메모리, 네트워크, 정규화, 쿼리/인덱스, 캐싱, 페이지네이션 성능을 최우선으로 점검하는 스킬."
user-invocable: true
---

# taglow-performance-first

API나 DB를 건드리는 작업은 기능 완성만으로 끝내지 않는다. 3,000명 규모의 응답과 수십만 개 답변을 기본 전제로 두고, 성능과 데이터 무결성을 먼저 설계한다.

## Use With

- Supabase/schema/RLS/RPC: `taglow-admin-supabase`
- API boundary/query hooks: `taglow-admin:api-boundary`
- 분석 워크벤치: `taglow-admin:analysis`
- 구현 계획/phase 분해: `taglow-admin:architect`
- 검증/회귀 테스트: `taglow-admin-test-qa`

## Performance Priorities

1. Memory: large raw rows, answer arrays, signed URL maps, chart datasets, and duplicated server state must stay bounded.
2. Network: reduce round trips, select only needed columns, batch dependent reads, compress API return shape to what the caller uses.
3. Database: keep queryable data normalized, add indexes for filters/joins/order/cursors/RLS paths, avoid repeated JSONB scans on hot paths.
4. API shape: use idempotent commands for writes, transaction RPCs for multi-table changes, stable query keys, explicit cache windows, and narrow DTOs.
5. Analysis: precompute or denormalize only when the user explicitly scopes it; facts/summary tables must have refresh/rebuild paths and indexes.

## API Checklist

- Boundary remains View -> Query Hook -> Controller -> Mapper/Gateway -> Supabase.
- Query hooks expose domain data, not raw DTOs.
- Expensive reads have `staleTime`, pagination, or infinite-query support.
- Mutations invalidate the smallest relevant keys.
- Bulk submit/update commands return IDs/counts/status, not full row dumps.
- Network retry paths are idempotent with `clientSubmissionId` or equivalent when user actions can be retried.

## DB/RPC Checklist

- Schema changes preserve normalization unless a denormalized analysis facts table was explicitly requested.
- New filters, joins, uniqueness checks, cursor pagination, and RLS predicates have supporting indexes.
- RPCs use narrow parameters and result tables; avoid returning unbounded lists without `limit` and cursor.
- Prefer `security invoker`; if `security definer` is required, set `search_path` and keep helper privileges narrow.
- RLS helpers should avoid per-row expensive recursion; prefer indexed ownership/access helper paths.
- Backfills are repeatable or guarded and do not assume production-sized data fits in client memory.

## Analysis Checklist

- Use facts/summary tables for repeated heavy aggregations when scoped.
- Cache analysis queries in React Query with explicit stale times.
- Keep text/image/evidence data paginated; generate signed URLs only for visible rows.
- Store attention-check pass/fail at submit time instead of recalculating for every analysis query.
- Every analysis result still respects filters, submitted status, access rules, and low-N warnings.

## Validation

Run the closest useful checks:

```sh
pnpm typecheck
pnpm vitest run
rg -n "@supabase|supabase\\.from|supabase\\.storage" src/view src/store src/api/admin/query src/api/participant/query
rg -n "AdminPayloadMapper|AdminApiGateway|Raw[A-Z]" src/view src/store src/api/admin/query src/api/participant/query
```

For SQL-heavy work, also inspect indexes and query plans when a database is available.

## Subagent

For broad API/DB/analysis changes, use `.codex/agents/taglow-admin-performance-auditor.toml` as a read-only reviewer. Give it changed files, expected data volume, and target flows. Ask it to report memory, network, normalization, query plan, index, RLS, caching, pagination, and API-shape risks.
