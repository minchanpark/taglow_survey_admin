---
name: supabase-inspect
description: "Supabase 프로젝트의 상태를 분석하고 판단하는 진입점. supabase link 연결, 공통 셋업, 차원별(Database/Query/API/Network/Performance) 진단 라우팅, 전체 상태 점검(헬스 스윕)에 사용. '슈파베이스 상태 봐줘', 'DB 점검', '느린 쿼리 찾아줘', 'API 에러 분석', '커넥션/트래픽 확인', '성능 진단' 류 요청에 트리거."
---

# supabase-inspect

Supabase 운영 상태를 **분석하고 판단**하기 위한 오케스트레이터다. 실제 진단은 차원별 하위 스킬이 수행한다. 이 스킬은 (1) 공통 연결 셋업, (2) 어떤 차원을 볼지 라우팅, (3) 전체 헬스 스윕을 담당한다.

## 차원별 스킬 라우팅

| 차원 | 스킬 | 본다 |
|---|---|---|
| Database | `supabase-inspect-database` | 테이블/인덱스 크기, bloat, vacuum, 확장, 스키마 advisor |
| Query | `supabase-inspect-query` | 느린 쿼리, outliers, locks, blocking, seq scan |
| API | `supabase-inspect-api` | PostgREST/Auth/Storage/Edge 로그, 에러율, RLS 거부 |
| Network | `supabase-inspect-network` | 커넥션 수/포화, traffic profile, replication slot |
| Performance | `supabase-inspect-performance` | cache hit, 인덱스 효율, unused index, advisor(performance) |

요청이 한 차원이면 해당 스킬만, "전체/종합/헬스체크"면 아래 스윕을 돈다.

## 공통 셋업 (한 번)

CLI 진단(`supabase inspect db ...`)은 연결된 프로젝트가 필요하다.

```sh
supabase link --project-ref tkaltosbhdzkuazslhtp
# 비밀번호 프롬프트가 뜨면 remote Postgres 비밀번호 입력 (또는 -p "<password>")
```

- 프로젝트 ref(`tkaltosbhdzkuazslhtp`)는 현재 Taglow 프로젝트 기준이다. 다른 프로젝트면 사용자에게 ref를 확인한다.
- 이후 모든 inspect 명령에 `--linked`를 붙인다.
- 분석용으로는 `--output-format json`을 권장한다 (파싱·정렬·임계값 판단이 쉬움).
- CLI 연결/비밀번호가 막히면 **MCP 도구로 대체**한다. MCP supabase 서버는 이미 프로젝트에 연결돼 있어 link 없이 동작한다:
  - `mcp__plugin_supabase_supabase__get_advisors` (security | performance)
  - `mcp__plugin_supabase_supabase__get_logs` (api | postgres | auth | storage | edge-function | realtime)
  - `mcp__plugin_supabase_supabase__execute_sql` (pg_stat_statements 등 직접 조회)
  - `list_tables` / `list_extensions` / `list_migrations` / `list_edge_functions`

## 전체 헬스 스윕 순서

종합 점검 요청 시 차원별 스킬을 순서대로 호출하고, 각 결과를 한 줄 요약으로 모은다.

1. `supabase-inspect-database` — 구조·저장·유지보수
2. `supabase-inspect-performance` — 인덱스/캐시 효율
3. `supabase-inspect-query` — 느린/막힌 쿼리
4. `supabase-inspect-network` — 커넥션/트래픽
5. `supabase-inspect-api` — API/로그 에러

병렬로 돌릴 수 있으면 독립 차원(database/query/network/api)은 동시에 수행하고, performance는 database 결과를 참고해 마지막에 종합한다.

## 출력 형식 (공통)

모든 차원 스킬은 동일한 구조로 정리한다. 수치는 그대로 두되(진단 보고서는 수치가 핵심), **판단**을 반드시 덧붙인다.

```text
## <차원> 진단 — <프로젝트 ref> · <조사 시각>

### 요약 판단
- 상태: 양호 | 주의 | 위험
- 핵심 발견 1–3개 (한 줄씩)

### 근거 (지표)
| 지표 | 값 | 기준 | 판단 |
|---|---:|---|---|

### 권장 조치
1. (우선순위 순, 실행 가능한 단계)
```

- 상태 등급: **양호**(기준 내) / **주의**(임계 근접·비차단) / **위험**(임계 초과·조치 필요).
- 스키마 변경이나 인덱스 추가가 필요하면 직접 실행하지 말고 `taglow-admin-supabase` + `taglow-performance-first`로 넘겨 migration으로 설계한다.
- 한 번의 진단으로 끝내지 말고, 조치 후 같은 명령으로 **전후 비교**를 권장한다.

## 주의

- inspect 명령 다수가 deprecated 표시(예: `unused-indexes`, `cache-hit`, `seq-scans`)지만 여전히 동작한다. 가능하면 비-deprecated 대체(`index-stats`, `db-stats`, `table-stats`)와 `get_advisors`를 함께 쓰고, deprecated를 쓸 때는 보고서에 표시한다.
- 운영 DB에 대한 읽기 진단만 수행한다. 쓰기/DDL은 제안만 하고 사용자 승인 후 migration으로 적용한다.
- 트래픽이 적은 시간대 수치는 과소평가될 수 있으니 조사 시각을 항상 기록한다.
