---
name: supabase-inspect-database
description: "Supabase 데이터베이스의 구조·저장·유지보수 상태를 분석한다. 테이블/인덱스 크기, relation bloat, vacuum/dead tuple, db-stats, role-stats, replication slot, 확장/마이그레이션 목록, 스키마 보안 advisor 점검에 사용. 'DB 상태', '테이블 비대', 'bloat', 'vacuum 밀림', '용량 분석' 류 요청에 트리거."
---

# supabase-inspect-database

데이터베이스 자체의 **건강 상태**를 본다: 얼마나 커지고 있는지, 죽은 튜플이 쌓였는지, vacuum이 따라오는지, 인덱스가 비대한지, 스키마에 보안 결함이 있는지.

진단만 한다. 인덱스 추가·정규화·DDL은 `taglow-admin-supabase`(설계) + `taglow-performance-first`(성능 기준)로 넘겨 migration으로 적용한다. 연결 셋업은 `supabase-inspect` 참고.

## 명령

```sh
supabase inspect db db-stats --linked --output-format json        # 전체 통계(크기, 커밋/롤백, dead tuple 등)
supabase inspect db table-stats --linked --output-format json     # 테이블별 row/size/dead tuple/마지막 vacuum
supabase inspect db bloat --linked --output-format json           # relation/index bloat 비율
supabase inspect db vacuum-stats --linked --output-format json    # autovacuum 대상·마지막 실행·dead tuple
supabase inspect db index-stats --linked --output-format json     # 인덱스 크기/스캔 수
supabase inspect db role-stats --linked --output-format json      # 롤별 통계
supabase inspect db replication-slots --linked --output-format json
```

deprecated지만 빠른 크기 확인용:
```sh
supabase inspect db table-sizes --linked
supabase inspect db total-index-size --linked
```

MCP 보완 (link 불필요):
- `mcp__plugin_supabase_supabase__list_tables` — 스키마/RLS/컬럼 구조
- `mcp__plugin_supabase_supabase__list_extensions` — 설치된 확장(불필요/취약 확장 점검)
- `mcp__plugin_supabase_supabase__list_migrations` — 적용된 migration 이력
- `mcp__plugin_supabase_supabase__get_advisors` (type: `security`) — RLS 미적용 테이블, SECURITY DEFINER 뷰, 노출된 스키마 등

## 판단 기준

| 지표 | 기준 | 판단 |
|---|---|---|
| relation bloat | > 2.0배 또는 bloat 용량 수백 MB+ | 주의 — REINDEX/VACUUM FULL 검토 |
| dead tuples / live | > 20% | 주의 — autovacuum 미흡 의심 |
| 마지막 autovacuum | 큰 테이블인데 오래 없음 | 위험 — vacuum 설정/부하 점검 |
| 단일 테이블 크기 | 전체의 큰 비중 + 빠른 증가 | 파티셔닝/아카이빙 검토 |
| 인덱스 총합 | 테이블 크기에 근접/초과 | 과다 인덱스 — unused 여부는 `supabase-inspect-performance`로 |
| RLS 미적용 (advisor) | public 테이블에 RLS 없음 | 위험 — 보안 결함, 즉시 보고 |
| replication slot | inactive slot 존재 | WAL 누적 위험 — 정리 검토 |

Taglow 맥락: `responses`/`answers`가 가장 빠르게 커지는 테이블이다(3,000명 × 수십만 답변 전제). 이 둘의 크기 증가율·dead tuple·vacuum 지연을 우선 본다.

## 출력

`supabase-inspect` 공통 출력 형식을 따른다. 보안 advisor에서 RLS 미적용 같은 결함이 나오면 상태를 **위험**으로 올리고 최상단에 둔다.
