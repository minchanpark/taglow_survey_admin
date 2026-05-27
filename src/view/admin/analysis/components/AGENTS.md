# `src/view/admin/analysis/components` Instructions

Owns analysis cards and workbench controls.

## Expected Components

- `GlobalFilterBar`
- `SectionAverageCard`
- `QuestionAverageTable`
- `PriorityTop5Card`
- `GroupCompareChart`
- `BorichCard`
- `LocusMatrixCard`
- `TextGroupPanel`
- `TagHeatmapPanel`

## Rules

- Keep visualizations honest: show N and low-N warnings.
- Prefer clear labels over statistical jargon in UI.
- Components render data; formulas belong in API/query/controller/SQL layers.
- Charts and heatmaps must be responsive without overlapping text.
- Keep each analysis component's CSS beside the component file.
- Component CSS owns chart/card/table/heatmap internals, legends, empty states, and warning badges.
- Do not make analysis components depend on `AnalysisWorkbenchPage.css`.
