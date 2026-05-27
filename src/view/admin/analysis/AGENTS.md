# `src/view/admin/analysis` Instructions

Owns the analysis workbench.

## Responsibilities

- Global Filter Bar.
- Improvement Priority TOP 5.
- Section averages.
- Question averages and gaps.
- Group comparisons.
- Borich and Locus cards.
- Text opinion list/groups.
- Image tagging heatmap.
- Evidence panels.

## Rules

- Use `adminFilterStore` for active UI filters.
- Use analysis query hooks for computed data.
- Do not run SQL or statistical formulas in page components.
- Every card should display N, active filters, and low-N warnings when available.
- Heatmap rendering must use normalized `x_ratio/y_ratio`.
- AI summaries must show representative original evidence.
- Keep page-level CSS next to analysis page files, for example `AnalysisWorkbenchPage.css`.
- Page CSS owns workbench grid, sticky Global Filter Bar position, tab layout, and card region spacing.
