---
name: taglow-admin:supabase
description: "Taglow Survey Admin의 Supabase schema, RLS, Storage, Auth guard, SQL/RPC 분석 쿼리, 인덱스, 데이터 마이그레이션을 설계하거나 구현할 때 사용."
user-invocable: true
---

# taglow-admin:supabase

Supabase는 현재 백엔드지만, 앱 계층은 나중에 HTTP API로 교체 가능해야 한다. DB와 SDK 세부사항은 gateway와 migration에 가둔다.

## Read First

```sh
rg -n "Database 설계|핵심 DDL|관리자용 인덱스|Auth / 권한|RLS|이미지 자산 관리|Global Filter Bar|Borich|이미지 태깅 히트맵|분석 API" dev/Taglow_survey_Admin_TDD.md dev/Taglow_Survey_Admin_PRD.md
```

## Core Schema

MVP core tables:

```text
surveys
survey_sections
questions
survey_assets
responses
answers
```

Do not add `admin_members`, `workspace_members`, `analysis_results`, `saved_analysis_blocks`, or report tables unless the user explicitly asks for post-MVP scope.

Important schema choices:

- Use `responses.locale` as the canonical locale field if starting fresh, because TDD domain models use `Locale`. If an existing DB already has `language`, map it in the gateway/mapper without leaking both names into views.
- Store image coordinates as normalized `x_ratio` and `y_ratio` in `answers`, constrained to `0..1`.
- Store file bytes only in Supabase Storage. `survey_assets` stores path and metadata.
- Use `topic_key`, `space_key`, `metric_type`, and `answer_type` consistently because analysis depends on them.

## RLS/Auth Rules

- App guard: Google OAuth session, `@handong.ac.kr`, MVP allowlist.
- RLS MVP: users manage surveys where `surveys.created_by = auth.uid()`, and read responses/answers through owned surveys.
- Allowlist cannot be fully enforced in RLS without membership table or JWT custom claim. Do not imply it is DB-enforced unless that extension exists.
- Participant privacy: analysis screens should not expose participant personal identifiers unless a specific identity question is required and authorized.

## Storage Rules

Upload flow:

```text
file -> AdminStorageGateway.upload -> storage_path -> survey_assets row -> question config asset_id
```

Handle errors separately:

- Upload failed: no asset row.
- Metadata insert failed: warn that file may need cleanup.
- Asset deleted: update or validate dependent image_tag questions.

## Analysis SQL/RPC Rules

Every analysis query:

- Joins `responses` to apply Global Filter Bar filters.
- Filters `responses.status = 'submitted'`.
- Accepts nullable filters: gender, semester_group, department, rc, dormitory, room_type, dorm_experience, version/survey id.
- Returns `n` and low-sample flag or enough data to derive it.
- Uses the same filter semantics across section average, question average, group compare, Borich, Locus, text, and heatmap.

Formula baseline:

```text
Gap = avg_importance - avg_satisfaction
Borich = avg_importance * (avg_importance - avg_satisfaction)
```

Locus baseline:

```text
high importance + low satisfaction = top priority
high importance + high satisfaction = maintain and strengthen
low importance + low satisfaction = gradual improvement
low importance + high satisfaction = maintain
```

## Index Checklist

At minimum cover:

- surveys by `created_by`, `status`, updated time.
- sections/questions by survey and order.
- responses by survey/status/submitted time and basic filter columns.
- answers by survey, answer type, metric, section, topic, space.
- partial heatmap index where `answer_type = 'image_tag'`.

## Validation

Use SQL tests or seed fixtures when possible:

- Section average changes when a dormitory filter is applied.
- Borich excludes rows missing either importance or satisfaction.
- Heatmap never returns coordinates outside `0..1`.
- Low-N threshold is deterministic.
- RLS denies reading another admin's survey responses.

## Subagent

For SQL or analysis correctness review, use `.codex/agents/taglow-admin-analysis-auditor.toml`.
