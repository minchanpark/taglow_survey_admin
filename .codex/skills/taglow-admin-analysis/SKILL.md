---
name: taglow-admin:analysis
description: "Taglow Survey Admin 응답 현황, Global Filter Bar, 섹션/질문/집단 분석, Gap/Borich/Locus, 주관식 의견 묶음, 이미지 태깅 히트맵, 응답 부족 경고, 보고서 초안을 구현하거나 검수할 때 사용."
user-invocable: true
---

# taglow-admin:analysis

분석 워크벤치는 관리자가 "무엇을 개선해야 하는가"를 빠르게 판단하게 해야 한다. 통계 화면이 아니라 의사결정 워크벤치다.

For analysis RPCs, query hooks, cache behavior, pagination, or large response data, also use `taglow-performance-first`. Analysis should be fast without moving raw answer tables into the browser.

## Read First

```sh
rg -n "분석 API|Filter Options|Section Satisfaction Summary|Borich Summary|Heatmap Points|Text Answers|SurveyAnalysisPage" dev/Taglow_Survey_Admin_PRD.md dev/Taglow_survey_Admin_TDD_v2.md
```

## Data Source Rules

- Response-level profile filters come from `responses`.
- Answer values come from `answers`.
- Analysis queries must join `responses` for filters and status.
- Include `survey_id` or version scope. Version aggregation requires explicit `version_group_id` intent.
- Every result card shows active filters, `N`, and low-sample warning where relevant.
- Heavy repeated aggregations should use indexed RPC/facts paths when explicitly scoped.

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

- `ResponseSummaryCard`: response count and readiness context on the analysis page.
- `SectionAverageCard`: data from `get_section_satisfaction_summary`.
- `GroupCompareCard`: comparison UI when data is available through analysis queries.
- `BorichCard`: data from `get_borich_summary`.
- `LocusCard`: quadrant view derived from satisfaction/importance summaries when scoped.
- `HeatmapCard`: data from `get_heatmap_points`.
- `TextAnswerTable`: data from `listTextAnswers`.

## Text/AI Summary Rules

AI summaries are evidence-linked, not standalone truth. Always provide:

- summary sentence,
- source count,
- representative originals,
- full original list access,
- inclusion state only when a future report/poster workflow is explicitly scoped.

Allow manual rename/merge/split/exclude only when that feature is in scope.

For original text/image evidence lists, use pagination and fetch signed URLs only for the visible page.

## Heatmap Rules

- Render from `x_ratio` and `y_ratio`, not pixel coordinates.
- Keep image aspect ratio stable.
- Filter by asset, tag type, and Global Filter Bar.
- Clicking a pin/cluster reveals original text and profile-safe context.

## Report/Export Rules

TDD v2 does not define a report route. Treat report/poster draft as PRD future scope unless the user explicitly asks for it.

## Tests

Cover:

- Filter options return distinct response profile values.
- Applying a dormitory or room-type filter changes section averages.
- Borich sorts by score and excludes incomplete pairs.
- Locus quadrant classification is deterministic.
- Heatmap returns normalized points and respects filters.
- Low-N warnings show at the threshold.

## Subagent

For formula/SQL/RPC correctness review, use `.codex/agents/taglow-admin-analysis-auditor.toml`.
For performance-sensitive analysis changes, use `.codex/agents/taglow-admin-performance-auditor.toml`.
