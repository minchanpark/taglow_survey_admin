---
name: taglow-admin-preview-publish
description: "Taglow Survey Admin의 참여자 화면 미리보기, 분기 시뮬레이션, 게시 전 검증, 공개 URL/QR, publish/close flow를 구현하거나 검수할 때 사용."
user-invocable: true
---

# taglow-admin-preview-publish

미리보기는 질문 목록이 아니라 실제 참여자 경험의 검수 장치다. draft 설문도 볼 수 있어야 하며, preview 입력은 절대 실제 응답으로 저장하지 않는다.

## Read First

```sh
rg -n "참여자 미리보기|Publish 정책|Publish 전 검증|Publish 후 구조 보호|SurveyPreviewPage|createNextVersion" dev/Taglow_Survey_Admin_PRD.md dev/Taglow_survey_Admin_TDD_v2.md
```

## URL Contract

```text
/admin/surveys/:surveyId/preview
/admin/surveys/:surveyId/preview?section_id=:sectionId
/admin/surveys/:surveyId/preview?locale=ko
/admin/surveys/:surveyId/preview?locale=en
/admin/surveys/:surveyId/preview?device=mobile
```

Public participant URL is separate:

```text
/survey/{public_slug}
```

## Preview Rules

- Reuse participant rendering components when available.
- Pass `previewMode: true` or equivalent, not a parallel mock renderer.
- Keep preview answers in session/local UI state only.
- Do not call create-response/create-answer mutations in preview.
- Allow full-flow, section, question, branch, locale, mobile, desktop, image-tag, and review-step preview as scope permits.
- Show validation warnings at the affected section/question.

## Validation Categories

Publish validation should report actionable items:

- Missing survey title.
- No sections.
- Section without questions.
- Missing Korean title.
- Missing English text when English is enabled.
- Choice/ranking question without options.
- Scale question without valid range/labels.
- Image_tag without valid asset.
- Branch condition points to missing question/value.
- Duplicate `public_slug`.
- Duplicate question keys.
- Attention check without `expectedValue`.
- Profile required fields not mapped to response profile columns.

## Branch Simulation

Must cover:

- Experience state hides/shows satisfaction followup.
- Low satisfaction score shows followup reason/text/image-tag.
- Choice values show configured conditional followups.
- Required questions block navigation/submission in preview.

Use stable ids/values, not label text.

## Image Tagging Preview

- Preserve image aspect ratio on mobile and desktop.
- Click/tap creates visible pin.
- Store and display normalized coordinates `0..1`.
- Enforce max tag count.
- Require tag text when configured.
- Show tag type labels in selected locale.

## Publish Flow

```text
validatePublish
-> ensure/create public_slug
-> set surveys.status = published
-> set published_at
-> return public URL and QR payload
```

Close flow sets `status=closed` and `closed_at`; public response submission must stop.
Published/closed/archived survey structure is DB-locked for `survey_sections`, `questions`, and `survey_assets`; structural changes create the next version.

## Tests

Cover:

- Draft preview loads.
- Preview input does not create `responses`/`answers`.
- Mobile query/device mode renders without layout breakage.
- Branch simulation returns expected visible questions.
- Publish blocks invalid survey and succeeds for valid survey.
- Public URL and QR use the published slug.

## Subagent

For independent review, use `.codex/agents/taglow-admin-preview-publish-auditor.toml`.
