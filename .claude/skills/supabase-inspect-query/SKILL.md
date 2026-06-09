---
name: supabase-inspect-query
description: "Supabase의 쿼리 실행 상태를 분석한다. 느린 쿼리(long-running), 누적 시간 outliers, 호출 횟수(calls), 잠금(locks)과 blocking, 순차 스캔(seq scan)을 진단하고 원인 쿼리를 짚는다. '느린 쿼리', '쿼리 병목', 'lock/blocking', '풀스캔', 'pg_stat_statements' 류 요청에 트리거."
---

# supabase-inspect-query

어떤 쿼리가 시간을 잡아먹고, 무엇이 무엇을 막고 있는지 본다. 개별 느린 쿼리(long-running)와 누적 부하 큰 쿼리(outliers)는 다르다 — 둘 다 본다.

진단만 한다. 인덱스/쿼리 재작성은 `taglow-performance-first` + `taglow-admin-supabase`로 넘긴다. 연결 셋업은 `supabase-inspect` 참고.

## 명령

```sh
supabase inspect db long-running-queries --linked --output-format json  # 지금 오래 실행 중인 쿼리
supabase inspect db outliers --linked --output-format json              # 누적 실행시간 상위 (pg_stat_statements)
supabase inspect db calls --linked --output-format json                 # 호출 횟수 상위
supabase inspect db locks --linked --output-format json                 # 현재 잡힌 exclusive lock
supabase inspect db blocking --linked --output-format json              # 다른 쿼리를 막고 있는 쿼리
supabase inspect db seq-scans --linked                                  # 순차 스캔 횟수(deprecated, 유효)
```

MCP 보완:
- `mcp__plugin_supabase_supabase__execute_sql` — `pg_stat_statements` 직접 조회로 mean/max time, rows, shared_blks 등 세부 확인
- `mcp__plugin_supabase_supabase__get_logs` (type: `postgres`) — 에러·취소·deadlock 로그
- `mcp__plugin_supabase_supabase__get_advisors` (type: `performance`) — 누락 인덱스 힌트

`outliers`/`calls`가 비어 있으면 `pg_stat_statements` 확장이 꺼져 있거나 리셋된 것이다. `list_extensions`로 확인하고 안내한다.

## 판단 기준

| 신호 | 기준 | 판단 |
|---|---|---|
| long-running query | 수 초+ 지속, 특히 사용자 대면 경로 | 위험 — 즉시 원인 쿼리 식별 |
| outlier total_time 편중 | 소수 쿼리가 전체 시간의 대부분 | 그 쿼리부터 최적화 (인덱스/페이지네이션) |
| mean_time 높음 | 단건이 느림 | 인덱스 누락/풀스캔 의심 → seq-scans 교차 확인 |
| calls 폭증 + 짧은 쿼리 | N+1, 캐시 부재 | 앱 계층 배칭/캐싱 (`taglow-admin-api-boundary`) |
| blocking 존재 | 차단 체인이 있음 | 위험 — 차단 PID/쿼리·대기 시간 보고, 장기 트랜잭션 점검 |
| seq scan 多 (큰 테이블) | `responses`/`answers` 풀스캔 | 인덱스 후보 도출 |

Taglow 맥락: 분석 RPC(Gap/Borich/Locus, 히트맵 집계, 섹션/문항 평균)와 `answers` 대량 집계가 outliers 상단에 올 가능성이 크다. 분석 쿼리는 필터(`topic_key`/`space_key`/profile)와 인덱스 정합을 우선 점검한다.

## 출력

`supabase-inspect` 공통 형식. blocking이 있으면 **위험**으로 올리고, 차단/피차단 쿼리 텍스트와 대기 시간을 표에 명시한다. outlier는 상위 5개를 "쿼리 요지 · total_time · calls · mean_time"으로 정리한다.
