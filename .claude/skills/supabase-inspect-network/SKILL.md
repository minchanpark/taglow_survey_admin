---
name: supabase-inspect-network
description: "Supabase의 연결·트래픽 상태를 분석한다. 활성/유휴 커넥션 수, 풀(pooler) 포화, idle-in-transaction, role별 연결, traffic-profile, replication slot/lag을 진단한다. '커넥션 풀 포화', '연결 수 초과', 'too many connections', '트래픽 분석', 'idle in transaction', 'replication lag' 류 요청에 트리거."
---

# supabase-inspect-network

DB에 들어오는 **연결과 트래픽**이 한계에 가까운지 본다. Postgres 연결 수는 인스턴스 등급별 상한이 있어, 포화는 곧 `too many connections` 장애로 이어진다.

진단만 한다. 풀 설정·앱 커넥션 관리·재시도 정책은 `taglow-performance-first` + `taglow-admin-api-boundary`로 넘긴다. 연결 셋업은 `supabase-inspect` 참고.

## 명령

```sh
supabase inspect db traffic-profile --linked --output-format json   # 트래픽 구성(읽기/쓰기/유형)
supabase inspect db db-stats --linked --output-format json          # 연결·커밋/롤백·블록 IO
supabase inspect db role-connections --linked                       # 롤별 연결 수(deprecated, 유효)
supabase inspect db role-configs --linked                           # 롤별 connection limit 설정(deprecated)
supabase inspect db replication-slots --linked --output-format json # slot 활성/WAL 보유
```

MCP 보완:
- `mcp__plugin_supabase_supabase__execute_sql` — `pg_stat_activity`로 state별(active/idle/idle in transaction) 연결 수, 최장 트랜잭션, 대기 이벤트 직접 집계
- `mcp__plugin_supabase_supabase__get_logs` (type: `postgres`) — `too many connections`, `remaining connection slots` 경고
- `mcp__plugin_supabase_supabase__get_project` — 인스턴스 등급(연결 상한 추정 근거)

## 판단 기준

| 지표 | 기준 | 판단 |
|---|---|---|
| 활성+유휴 연결 / 상한 | > 80% | 주의, > 95% 위험 — 풀러(transaction mode) 사용/풀 크기 점검 |
| idle in transaction | 다수·장기 | 위험 — 트랜잭션 누수, 잠금·연결 동시 점유 |
| role별 연결 편중 | 한 롤이 상한 근접 | 해당 서비스 커넥션 누수 의심 |
| 직접 연결 vs pooler | 서버리스/앱이 직접 연결 다수 | 풀러 경유로 전환 권장 |
| replication slot lag | WAL 보유 증가 | 위험 — 디스크 압박, 비활성 slot 정리 |
| traffic write 비중 급증 | 평소 대비 이상치 | 배치/대량 insert 경로(`answers` 적재) 점검 |

Taglow 맥락: 참여자 응답 제출이 몰리면 `answers` 쓰기 트래픽과 연결이 동시에 튄다. 서버리스/Edge에서 DB를 직접 열면 연결이 빠르게 소진되므로 **pooler(transaction mode)** 경유와 짧은 트랜잭션을 기준으로 본다.

## 출력

`supabase-inspect` 공통 형식. "연결 사용률(활성/유휴/idle-in-tx) · 상한 대비 % · 최장 트랜잭션 · 트래픽 읽기:쓰기 비율"을 표로 정리한다. 상한 근접 또는 idle-in-transaction 장기 점유가 있으면 **위험**으로 올린다.
