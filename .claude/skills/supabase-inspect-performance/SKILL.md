---
name: supabase-inspect-performance
description: "Supabase의 종합 성능 효율을 분석한다. 캐시 적중률(cache-hit), 인덱스 효율(index-usage), 미사용 인덱스(unused-indexes), 순차 스캔, 누락 인덱스 advisor를 진단하고 다른 차원 결과를 종합한다. '성능 진단', '캐시 적중률', '인덱스 효율', 'unused index', '인덱스 누락', '느려요 전반' 류 요청에 트리거."
---

# supabase-inspect-performance

DB가 **효율적으로** 일하는지 본다: 메모리 캐시를 잘 쓰는지, 인덱스가 실제로 쓰이는지, 안 쓰이는 인덱스가 자리를 차지하는지, 필요한 인덱스가 없는지. 다른 차원(database/query/network)의 효율 신호를 종합하는 마무리 차원이다.

진단만 한다. 인덱스 추가/삭제는 `taglow-performance-first`(기준) + `taglow-admin-supabase`(migration)로 넘긴다. 연결 셋업은 `supabase-inspect` 참고.

## 명령

```sh
supabase inspect db cache-hit --linked          # 테이블/인덱스 캐시 적중률(deprecated, 유효)
supabase inspect db index-usage --linked         # 인덱스 사용 효율(deprecated, 유효)
supabase inspect db unused-indexes --linked      # 쓰이지 않는 인덱스(deprecated, 유효)
supabase inspect db index-stats --linked --output-format json   # 비-deprecated 대체: 인덱스별 스캔/크기
supabase inspect db seq-scans --linked           # 풀스캔 多 테이블 → 인덱스 후보(deprecated, 유효)
```

MCP 보완:
- `mcp__plugin_supabase_supabase__get_advisors` (type: `performance`) — **누락 인덱스, 미사용 인덱스, 비효율 RLS, 커버링 인덱스 제안** (가장 신뢰도 높은 출발점)
- `mcp__plugin_supabase_supabase__execute_sql` — `pg_stat_user_indexes` / `pg_statio_user_tables`로 직접 검증

deprecated 명령은 `index-stats` + `get_advisors(performance)`로 대체 가능하다. 보고서엔 어느 쪽을 썼는지 표시한다.

## 판단 기준

| 지표 | 기준 | 판단 |
|---|---|---|
| cache hit (heap) | < 99% | 주의 — working set이 메모리 초과, 등급/쿼리 점검 |
| index hit | < 99% | 주의 — 인덱스가 캐시에 못 올라옴 |
| unused index | scan=0, 운영 기간 충분 | 삭제 후보 — 쓰기 비용·용량 절감 (FK/제약 인덱스는 제외) |
| index efficiency 낮음 | 큰 인덱스인데 거의 안 쓰임 | 재설계 후보 |
| seq scan 多 + 큰 테이블 | `responses`/`answers` 풀스캔 | 누락 인덱스 — advisor 제안과 교차 |
| advisor 누락 인덱스 | 제안 존재 | 쿼리 패턴 확인 후 추가 설계 |

Taglow 맥락: 분석 집계가 `topic_key`/`space_key`/`metric_type`/profile 필터로 자주 걸린다. 이 컬럼들의 복합 인덱스 커버리지와 `answers` 집계 경로의 캐시 적중률을 우선 본다. 인덱스를 늘리면 응답 적재(쓰기) 비용이 오르므로 unused와 신규를 **함께** 저울질한다.

## 종합 (마지막 차원일 때)

헬스 스윕의 마지막 단계라면 database/query/network 결과를 받아 한 장으로 종합한다:

- 캐시 부족(performance) ↔ 큰 테이블/bloat(database) ↔ outlier 쿼리(query)를 한 원인으로 연결.
- 인덱스 권고는 "근거 쿼리 + 예상 효과 + 쓰기 비용"을 함께 제시하고, 실제 적용은 migration으로 넘긴다.

## 출력

`supabase-inspect` 공통 형식 + 종합 시 차원 간 연결을 1–2문장으로 묶는다. 인덱스 추가/삭제 권고는 "대상 · 근거 · 트레이드오프"를 표로 정리하되, 직접 DDL을 실행하지 않는다.
