# `src/view/admin/report` Instructions

Owns report draft and export screens.

## Responsibilities

- Select analysis cards.
- Reorder report sections.
- Generate or edit summary sentences.
- Preserve statistical/text/heatmap evidence.
- Export Markdown for MVP.
- Prepare PNG/PDF/Excel only when requested as Should scope.

## Rules

- Do not add persistent report tables unless requested.
- Every report block must retain active filters, N, and low-sample warnings.
- AI-generated summaries must stay linked to source metrics or representative originals.
- Report export should use current domain data, not raw rows.
- Keep page-level CSS next to report page files, for example `ReportDraftPage.css`.
- Page CSS owns report builder layout, block ordering region, and export panel placement.
