# `src/view/admin/builder` Instructions

Owns survey, section, question, multilingual, branching, and asset editing.

## Responsibilities

- Survey basic settings.
- Section create/edit/reorder.
- Question create/edit/reorder.
- Question type picker and config editors.
- Multilingual fields.
- Experience branching.
- Low-satisfaction followups.
- Choice-first response structures.
- Image tag asset linking.
- Version protection messaging.

## Rules

- Persisted data comes from query hooks.
- UI selection/panels come from `adminBuilderStore`.
- Forms use React Hook Form and Zod validation.
- Every question should expose analysis metadata where possible: `metricType`, `topicKey`, `spaceKey`.
- Never compare Korean/English labels to drive branching. Use stable values.
- Protect structural edits after responses exist; guide to version creation.
- Keep page-level CSS next to builder page files, for example `SurveyBuilderPage.css`.
- Page CSS owns builder shell layout such as left panel, editor column, preview area, and route-level responsive behavior.
