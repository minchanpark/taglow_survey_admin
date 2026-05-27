---
name: taglow-admin:builder
description: "Taglow Survey Admin 설문 빌더를 구현한다. 설문/섹션/질문 CRUD, 질문 타입별 editor, 다국어 입력, 경험 여부 분기, 낮은 만족도 후속 질문, 선택형 우선 구조, 이미지 자산 연결, 버전 보호 작업에 사용."
user-invocable: true
---

# taglow-admin:builder

관리자 빌더는 설문 구조를 만드는 곳이다. 단순 폼 생성기가 아니라, 나중에 분석 가능한 `topic_key`, `space_key`, `metric_type`까지 함께 설계해야 한다.

## Read First

```sh
rg -n "설문 생성|설문 버전|섹션 기반 설문 빌더|질문 빌더|경험 여부|낮은 만족도|선택형 우선|다국어|이미지/도면|Builder" dev/Taglow_Survey_Admin_PRD.md dev/Taglow_survey_Admin_TDD.md
```

## UI Shape

Prefer the TDD structure unless existing code has a stronger local convention:

```text
SurveyBuilderPage
  SectionListPanel
  QuestionListPanel
  QuestionEditor
  QuestionTypePicker
  MultilingualTextFields
  AssetPicker
```

Views use query hooks and stores only. They never call Supabase directly.

## Builder State

Use server state for persisted survey data and client state for UI selection:

- TanStack Query: surveys, sections, questions, assets.
- Zustand: selected survey/section/question, panel state, builder mode.
- React Hook Form: current survey/section/question editor forms.
- Zod: question config and publish-prep validation.

## Question Type Rules

All questions should carry analysis metadata when possible:

```text
section_id
question_id
topic_key
space_key
metric_type
answer_type/question_type
```

Required config patterns:

- `scale`: min/max, labels, metric_type, optional low-score followup threshold and reason options.
- `single_choice` / `multi_select`: stable option values, `label_ko`, optional `label_en`, allow_other, min/max select.
- `experience`: experience states, followup visibility rules, awareness/no-use categories.
- `text`: optional category/topic linkage and length validation.
- `ranking`: stable option values and rank limits.
- `image_tag`: `asset_id`, max tags, tag types, require_text, enable_zoom.
- `attention_check`: expected answer and validation messaging.

## Multilingual Rules

- Korean title is required.
- English is Should, but warn when English survey mode is enabled and text is missing.
- Do not duplicate responses by language. Store response values by ids/stable option values.
- Fallback behavior must be visible in preview validation.

## Branching Rules

Represent branch conditions through stable question keys or ids and stable option values. Avoid label-text comparisons.

Must support:

- Experience exists -> show satisfaction followups only for experienced users.
- Low satisfaction threshold -> show reason choice/text/image-tag followup.
- Choice-first -> select category before free text, with category saved for analysis.

## Version Protection

- Draft with no responses: editable.
- Published or has responses: protect destructive structural edits such as deleting questions or changing question type.
- If structural changes are needed, guide to `createSurveyVersion`.
- Analysis reads a specific survey version unless explicitly aggregating a `version_group_id`.

## Asset Rules

- Upload through storage gateway, then create `survey_assets`.
- Link image_tag questions by `config.asset_id`.
- Validate missing/deleted assets before publish.

## Tests

Cover:

- Section/question create mutations and invalidation.
- Scale question saves `metric_type=satisfaction` or `importance`.
- English missing warning/fallback.
- Image_tag without asset fails validation.
- Published survey structural edit prompts version flow.

## Related Skills

- Use `taglow-admin:api-boundary` for data layer changes.
- Use `taglow-admin:preview-publish` when builder changes affect preview or publish validation.
- Use `taglow-admin:test-qa` before handoff.
