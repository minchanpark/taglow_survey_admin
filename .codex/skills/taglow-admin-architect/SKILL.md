---
name: taglow-admin:architect
description: "Taglow Survey Admin PRD/TDD 기반으로 작업을 phase로 쪼개고, 필요한 전문 스킬과 QA 서브에이전트를 라우팅한다. 관리자 앱 구현 계획, 기능 분해, MVP 범위 판단, phase sequencing, 작업 착수 전 구조 설계 요청에 사용."
user-invocable: true
---

# taglow-admin:architect

Taglow Survey Admin 작업의 라우터이자 구현 감독 스킬이다. PRD/TDD의 범위를 한 번에 구현하려 하지 말고, 현재 요청을 MVP phase와 계층 책임에 맞게 자른다.

## Canonical Docs

- PRD: `dev/Taglow_Survey_Admin_PRD.md`
- TDD: `dev/Taglow_survey_Admin_TDD_v2.md`

작업 시작 시 필요한 섹션만 찾아 읽는다. 우선 검색:

```sh
rg -n "구현 순서|완료 기준|프로젝트 구조|핵심 아키텍처|API Boundary|테스트 전략|admin_members" dev/Taglow_Survey_Admin_PRD.md dev/Taglow_survey_Admin_TDD_v2.md
```

## Dispatch

| 요청 유형 | 사용할 스킬 | 선택 기준 |
|---|---|---|
| 프로젝트 구조, phase 계획, 우선순위 결정 | `taglow-admin:architect` | 현재 스킬에서 직접 처리 |
| API boundary, model/gateway/mapper/controller/query hook | `taglow-admin:api-boundary` | View가 Supabase나 raw DTO를 알면 안 되는 작업 |
| Supabase DDL, RLS, Storage, SQL/RPC 분석 | `taglow-admin:supabase` | DB, auth, storage, 분석 쿼리 작업 |
| 설문/섹션/질문 빌더, 질문 config, 다국어, 버전 보호 | `taglow-admin:builder` | 관리자 작성 플로우와 편집 UI |
| 참여자 미리보기, 게시 검증, public URL/QR | `taglow-admin:preview-publish` | preview mode와 publish workflow |
| 응답 요약, Global Filter Bar, 분석 워크벤치 | `taglow-admin:analysis` | RPC 기반 분석과 evidence UI |
| 테스트 전략, 회귀 검증, 최종 품질 게이트 | `taglow-admin:test-qa` | 구현 후 검증 또는 review 요청 |

## Phase Map

1. DB/Auth/Gateway: migrations, RLS helpers, `admin_members`, Supabase gateways, mapper.
2. Admin Shell: router, providers, route guard, login, survey list.
3. Builder: survey/section/question CRUD, config schemas, asset upload.
4. Preview/Publish: participant renderer reuse, validation, publish mutation, version lock handling.
5. Analysis: filter options RPC, section summary RPC, Borich RPC, heatmap RPC, `TextAnswerTable`.
6. Hardening: RLS tests, error handling, E2E, query invalidation, staging seed survey.

## Non-Negotiables

- Core DB includes `admin_members`, `surveys`, `survey_sections`, `questions`, `survey_assets`, `responses`, `answers`.
- View imports query hooks and UI stores only. No Supabase SDK, endpoint strings, raw rows, mapper, or gateway in views.
- Query hooks call `AdminApiController`, not gateways.
- Mappers convert raw rows/DTOs to domain models. Gateways return raw data only.
- Preview input never creates `responses` or `answers`.
- Every analysis result shows `N`, active filters, and low-sample warning when relevant.
- Admin access is Google login and an active `admin_members` row. Do not restrict admin access by email domain.

## Subagent Handoff

If subagent tools are available and a review can run in parallel, use these files:

- `.codex/agents/taglow-admin-boundary-reviewer.toml`
- `.codex/agents/taglow-admin-analysis-auditor.toml`
- `.codex/agents/taglow-admin-preview-publish-auditor.toml`
- `.codex/agents/taglow-admin-test-qa-auditor.toml`

Give each subagent a concrete scope, changed file list, and the relevant PRD/TDD section names. Do not ask subagents to edit the same files concurrently.

## Completion Check

Before handoff, state:

- Which phase(s) were covered.
- Which Taglow skill(s) were used or should be used next.
- What tests or checks passed.
- Any PRD/TDD requirement intentionally left for Should/Could.
