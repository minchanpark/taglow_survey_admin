# `src/view/admin/responses` Instructions

Owns response status and data quality pages.

## Responsibilities

- Total submitted responses.
- Recent response counts.
- Basic profile distributions.
- Section and question response rates.
- Attention/data-quality warnings.
- Low-sample group warnings.

## Rules

- This area summarizes analysis readiness; it is not the full analysis workbench.
- Use response summary and filter option query hooks.
- Do not expose participant personal identifiers unless an explicitly scoped identity workflow requires it.
- Keep page-level CSS next to response page files, for example `ResponseDashboardPage.css`.
- Page CSS owns response dashboard composition and spacing between summary sections.
