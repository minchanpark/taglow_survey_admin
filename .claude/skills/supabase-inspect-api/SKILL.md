---
name: supabase-inspect-api
description: "Supabase의 API 계층 상태를 분석한다. PostgREST(REST), Auth, Storage, Edge Function, Realtime 로그를 통해 에러율, 4xx/5xx, RLS 거부, 인증 실패, 느린 엔드포인트, Edge Function 예외를 진단한다. 'API 에러', '401/403 많음', 'RLS 거부', 'Edge Function 로그', '엔드포인트 느림' 류 요청에 트리거."
---

# supabase-inspect-api

앱과 DB 사이의 **API 표면**이 건강한지 본다. PostgREST/Auth/Storage/Edge가 어떤 에러를 얼마나 내는지, RLS가 정상 요청을 막고 있지 않은지, 어떤 엔드포인트가 느린지.

이 차원은 CLI `inspect db`가 아니라 **MCP 로그/advisor**가 주력이다(API는 DB inspect 대상이 아님). 연결 셋업은 `supabase-inspect` 참고. RLS/Auth guard 수정은 `taglow-admin-supabase`로 넘긴다.

## 도구

```text
mcp__plugin_supabase_supabase__get_logs    (type: api | auth | storage | edge-function | realtime | postgres)
mcp__plugin_supabase_supabase__get_advisors (type: security)   # 노출 위험, RLS, JWT 설정
mcp__plugin_supabase_supabase__list_edge_functions
mcp__plugin_supabase_supabase__get_edge_function <slug>
```

- `get_logs`는 최근 1분 윈도우 위주다. 재현 가능한 시점에 호출하거나, 사용자에게 부하 발생 직후 실행하도록 안내한다.
- 앱 코드 측 호출 경로는 `taglow-admin-api-boundary`(gateway/controller)에서 어떤 PostgREST/RPC를 부르는지 교차 확인한다.

## 점검 항목과 판단

| 계층 | 신호 | 판단 |
|---|---|---|
| PostgREST(api) | 5xx 발생 | 위험 — 쿼리/타임아웃/함수 오류, postgres 로그 교차 |
| PostgREST(api) | 401/403 급증 | RLS 정책이 정상 요청 차단 가능 → 정책 재검토 |
| PostgREST(api) | 특정 경로 응답 지연 | `supabase-inspect-query` outliers와 연결 |
| Auth | 로그인/토큰 실패율 높음 | 위험 — 키/세션/리다이렉트 설정 점검 |
| Storage | 업로드/다운로드 4xx/5xx | 버킷 정책·용량·경로 확인 (`survey_assets`) |
| Edge Function | 예외/타임아웃 | 함수별 로그·콜드스타트·외부 API 키 점검 |
| advisor(security) | RLS 미적용/SECURITY DEFINER 노출 | 위험 — 데이터 노출, 즉시 보고 |

Taglow 맥락: 관리자 인증(`admin_members`), 분석 RPC 호출, `survey_assets` Storage, `generate-report-narrative` Edge Function이 주 점검 대상이다. report narrative 함수는 외부 LLM(OpenAI/Gemini) 키 의존이므로 5xx/타임아웃 시 키·쿼터를 먼저 의심한다.

## 출력

`supabase-inspect` 공통 형식. 계층별로 "관측된 상태 코드 분포 · 대표 에러 메시지 · 추정 원인"을 정리한다. 보안 advisor 결함은 항상 최상단·**위험**. 정상 요청을 막는 RLS가 의심되면 정책명과 대상 테이블을 명시한다.
