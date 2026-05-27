# `src/view/admin/surveys` Instructions

Owns survey list and survey dashboard pages.

## Responsibilities

- Survey list with draft/published/closed/archived status.
- Recent response count summary.
- Public URL copy.
- Low-response warnings.
- Priority TOP 5 summary when analysis is available.
- Survey duplicate/archive/close entry points.

## Rules

- Use survey query hooks and controller-backed mutations.
- Do not implement builder editing here; route to builder.
- Do not compute heavy analysis in view code. Ask the analysis API/query layer.
- Google Form/Excel upload is Could scope and should not be added unless requested.
- Keep page-level CSS next to survey page files, for example `SurveyListPage.css` or `SurveyDashboardPage.css`.
- Use page CSS for dashboard/list composition, not for internals of reusable survey widgets.
