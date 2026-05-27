---
name: taglow-admin:analysis
description: "Taglow Survey Admin 응답 현황, Global Filter Bar, 섹션/질문/집단 분석, Gap/Borich/Locus, 주관식 의견 묶음, 이미지 태깅 히트맵, 응답 부족 경고, 보고서 초안을 구현하거나 검수할 때 사용."
user-invocable: true
---

# taglow-admin:analysis

분석 워크벤치는 관리자가 "무엇을 개선해야 하는가"를 빠르게 판단하게 해야 한다. 통계 화면이 아니라 의사결정 워크벤치다.

## Read First

```sh
rg -n "응답 현황|Global Filter Bar|분석 워크벤치|개선 우선순위|Borich|Locus|집단 비교|주관식|히트맵|응답 부족|보고서" dev/Taglow_Survey_Admin_PRD.md dev/Taglow_survey_Admin_TDD.md
```

## Data Source Rules

- Response-level profile filters come from `responses`.
- Answer values come from `answers`.
- Analysis queries must join `responses` for filters and status.
- Include `survey_id` or version scope. Version aggregation requires explicit `version_group_id` intent.
- Every result card shows active filters, `N`, and low-sample warning where relevant.

## Global Filter Bar

Must support MVP filters:

```text
gender
semester_group
department
rc
dormitory
room_type
dorm_experience
survey version
```

Also show before/after response counts when available. Presets are Should, not MVP unless requested.

## Analysis Cards

Implement through query hooks that call `AdminApiController`:

- Response summary: total submitted, recent response counts, profile distribution, section/question response rates.
- Section average: satisfaction average and N by section.
- Question average: satisfaction/importance/gap by question/topic.
- Priority TOP 5: transparent combination of low satisfaction, high importance, gap, Borich, text frequency, tag density, severity, and N.
- Group compare: average and N by gender/semester/department/rc/dormitory/room_type.
- Borich: `avg_importance * (avg_importance - avg_satisfaction)`.
- Locus: 4-quadrant classification by mean importance/satisfaction baseline.
- Text groups: grouped issue category, frequency, representative originals, search.
- Heatmap: image asset, normalized coordinates, tag type/severity/text, filter-aware.

## Text/AI Summary Rules

AI summaries are evidence-linked, not standalone truth. Always provide:

- summary sentence,
- source count,
- representative originals,
- full original list access,
- report inclusion state.

Allow manual rename/merge/split/exclude only when that feature is in scope.

## Heatmap Rules

- Render from `x_ratio` and `y_ratio`, not pixel coordinates.
- Keep image aspect ratio stable.
- Filter by asset, tag type, and Global Filter Bar.
- Clicking a pin/cluster reveals original text and profile-safe context.

## Report/Export Rules

MVP export target is Markdown first. PNG/PDF/Excel are Should unless requested.

Report cards should preserve:

- title,
- metric values,
- active filters,
- N and low-N warning,
- evidence links or representative originals,
- generated summary if present.

Do not add saved report tables unless the user asks for persistent reports.

## Tests

Cover:

- Filter options return distinct response profile values.
- Applying a dormitory or room-type filter changes section averages.
- Borich sorts by score and excludes incomplete pairs.
- Locus quadrant classification is deterministic.
- Heatmap returns normalized points and respects filters.
- Low-N warnings show at the threshold.

## Subagent

For formula/SQL/report correctness review, use `.codex/agents/taglow-admin-analysis-auditor.toml`.
